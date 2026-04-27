# django_backend/gallery/views.py

import io

import cv2
import httpx
import numpy as np
from django.conf import settings
from django.core.files.base import ContentFile
from loguru import logger
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from typing import cast
from processing import preprocess, producer

from .models import Post
from .serializers import PostCreateSerializer, PostListSerializer

FASTAPI_URL = settings.FASTAPI_SERVICE_URL


class PostListCreateView(APIView):
    """
    GET  /api/gallery/images/          — list the authenticated user's images
    POST /api/gallery/images/          — upload a new image
    """

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    # ── List ──────────────────────────────────────────────────────────────────

    def get(self, request):
        posts = Post.objects.filter(owner=request.user).only(
            "id",
            "owner_id",
            "title",
            "description",
            "image_url",
            "processing_type",
            "tags",
            "blur_score",
            "embedding_id",
            "uploaded_at",
            "updated_at",
        )
        serializer = PostListSerializer(posts, many=True, context={"request": request})
        return Response(serializer.data)

    # ── Create ────────────────────────────────────────────────────────────────

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Temporarily save without phash so we hold a PK.
        instance = serializer.save(owner=request.user, phash="PENDING")
        instance = cast(Post, instance)
        try:
            uploaded_file = request.FILES["image_url"]
            uploaded_file.seek(0)
            file_bytes = uploaded_file.read()

            # 1. Optional worker processing (grayscale, resize, etc.)
            if instance.processing_type != "none":
                processed, worker_id = producer.send_to_worker(
                    instance.processing_type, file_bytes, uploaded_file.name
                )
                if not processed:
                    raise ValueError("Worker processing failed.")
                file_bytes = processed
                producer.release_worker(instance.processing_type, worker_id)

            # 2. Decode image for local analysis
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not decode uploaded image.")

            # 3. Perceptual hash — deduplication guard
            generated_phash = preprocess.generate_phash(img)
            if Post.objects.filter(phash=generated_phash).exists():
                instance.delete()
                return Response(
                    {"error": "This image has already been uploaded."},
                    status=status.HTTP_409_CONFLICT,
                )

            # 4. Blur detection
            blur_score = preprocess.compute_blur_score(img)
            logger.debug(f"Image blur_score={blur_score:.2f} for post pk={instance.pk}")

            # 5. Send image to FastAPI microservice → embedding + tags
            microservice_data = _call_embed_service(file_bytes, uploaded_file.name)

            # 6. Persist everything
            instance.phash = generated_phash
            instance.blur_score = blur_score
            instance.tags = microservice_data.get("tags", "")
            instance.embedding_id = microservice_data.get("embedding_id", "")
            instance.image_url.save(
                uploaded_file.name, ContentFile(file_bytes), save=False
            )
            instance.save()

            return Response(
                PostListSerializer(instance, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as exc:
            instance.delete()
            logger.debug(f"Post creation failed: {exc}")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PostDetailView(APIView):
    """
    GET    /api/gallery/images/<pk>/   — retrieve a single post
    DELETE /api/gallery/images/<pk>/   — delete a post (owner only)
    """

    permission_classes = [IsAuthenticated]

    def _get_own_post(self, pk, user):
        try:
            return Post.objects.get(pk=pk, owner=user)
        except Post.DoesNotExist:
            return None

    def get(self, request, pk):
        post = self._get_own_post(pk, request.user)
        if post is None:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PostListSerializer(post, context={"request": request}).data)

    def delete(self, request, pk):
        post = self._get_own_post(pk, request.user)
        if post is None:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Remove the embedding from Qdrant via microservice
        if post.embedding_id:
            _call_delete_embedding(post.embedding_id)

        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ImageSearchView(APIView):
    """
    GET /api/gallery/search/?q=forest
    Delegates semantic vector search to the FastAPI microservice, then
    returns the matching Post objects from the Django DB.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"error": "Query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ask FastAPI for matching embedding_ids
        try:
            resp = httpx.get(
                f"{FASTAPI_URL}/search",
                params={"q": query, "top_k": 20},
                timeout=10.0,
            )
            resp.raise_for_status()
            embedding_ids = resp.json().get("ids", [])
        except httpx.HTTPError as exc:
            logger.debug(f"Search microservice error: {exc}")
            return Response(
                {"error": "Search service unavailable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not embedding_ids:
            return Response([])

        # Fetch matching posts in a single query (preserves ordering from Qdrant)
        posts_map = {
            p.embedding_id: p
            for p in Post.objects.filter(embedding_id__in=embedding_ids)
        }
        ordered_posts = [posts_map[eid] for eid in embedding_ids if eid in posts_map]

        serializer = PostListSerializer(
            ordered_posts, many=True, context={"request": request}
        )
        return Response(serializer.data)


# ── Private helpers ────────────────────────────────────────────────────────────


def _call_embed_service(file_bytes: bytes, filename: str) -> dict:
    """
    POST image bytes to FastAPI /embed.
    Returns dict with 'tags' (comma-separated string) and 'embedding_id' (UUID str).
    Falls back to empty values if the service is unavailable so the upload still succeeds.
    """
    try:
        resp = httpx.post(
            f"{FASTAPI_URL}/embed",
            files={"file": (filename, io.BytesIO(file_bytes), "image/jpeg")},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.debug(f"Embed service error: {exc}")
        return {"tags": "", "embedding_id": ""}


def _call_delete_embedding(embedding_id: str) -> None:
    """DELETE the Qdrant point via FastAPI microservice."""
    try:
        httpx.delete(
            f"{FASTAPI_URL}/embed/{embedding_id}",
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        logger.debug(f"Delete embedding error: {exc}")
