# django_backend/gallery/views.py

import io

import cv2
import httpx
import numpy as np
from typing import cast
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from django.utils.datastructures import MultiValueDict
from loguru import logger
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from processing import preprocess, producer
from .models import Post
from .serializers import PostCreateSerializer, PostsListSerializer

FASTAPI_SERVICE_URL = settings.FASTAPI_SERVICE_URL


@extend_schema(tags=["Gallery"])
class PostView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=PostsListSerializer(many=True),
    )
    def get(self, request: Request):
        try:
            posts = Post.objects.filter(owner=request.user)
            serializer = PostsListSerializer(
                posts, many=True, context={"request": request}
            )
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        request=PostCreateSerializer,
        responses=PostsListSerializer,
    )
    def post(self, request: Request):
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Temporarily save without phash so we hold a PK.
        instance = serializer.save(owner=request.user, phash="PENDING")
        instance = cast(Post, instance)
        try:
            # 0. Get the Image bytes
            files = cast(MultiValueDict, request.FILES)
            raw_file = files.get("image")
            if not raw_file:
                return Response(
                    {"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST
                )
            uploaded_file: UploadedFile = raw_file
            uploaded_file.seek(0)
            file_bytes: bytes = uploaded_file.read()

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
            logger.debug(f"[pk={instance.pk}] generated_phash={generated_phash}")

            # 4. Blur detection
            blur_score = preprocess.compute_blur_score(img)
            logger.debug(f"[pk={instance.pk}] blur_score={blur_score:.2f}")

            # 5. Send image to FastAPI microservice → embedding + tags
            microservice_data = {"tags": "", "embedding_id": ""}
            try:
                resp = httpx.post(
                    url=f"{FASTAPI_SERVICE_URL}/embed",
                    files={
                        "file": (
                            uploaded_file.name,
                            io.BytesIO(file_bytes),
                            "image/jpeg",
                        )
                    },
                    params={"post_id": instance.id, "owner_id": request.user.id},
                    timeout=30.0,
                )
                resp.raise_for_status()
                microservice_data = resp.json()
            except httpx.HTTPError as exc:
                logger.debug(f"Embed service error: {exc}")

            # 6. Persist everything
            instance.phash = generated_phash
            instance.blur_score = blur_score
            instance.tags = microservice_data.get("tags", "")
            instance.embedding_id = microservice_data.get("embedding_id", "")
            instance.image.save(uploaded_file.name, ContentFile(file_bytes), save=False)
            instance.save()

            return Response(
                PostsListSerializer(instance, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as exc:
            instance.delete()
            logger.debug(f"Post creation failed: {exc}")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(tags=["Gallery"])
class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=PostsListSerializer,
    )
    def get(self, request: Request, pk: int):
        try:
            post = Post.objects.get(pk=pk, owner=request.user)
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PostsListSerializer(post, context={"request": request}).data)

    @extend_schema(
        responses={204: None},
    )
    def delete(self, request, pk):
        try:
            post = Post.objects.get(pk=pk, owner=request.user)
            # Remove the embedding from Qdrant via microservice
            if post.embedding_id:
                try:
                    httpx.delete(
                        f"{FASTAPI_SERVICE_URL}/embed/{post.embedding_id}",
                        timeout=10.0,
                    )
                except httpx.HTTPError as exc:
                    logger.debug(f"Delete embedding error: {exc}")
                post.delete()
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Search"])
class ImageSearchView(APIView):
    """
    GET /api/gallery/search/?q=forest
    Delegates semantic vector search to the FastAPI microservice, then
    returns the matching Post objects from the Django DB.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="q",
                type=str,
                required=True,
                description="Semantic image search query",
            )
        ],
        responses=PostsListSerializer(many=True),
    )
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
                f"{FASTAPI_SERVICE_URL}/search",
                params={"query": query, "top_k": 20},
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
        serializer = PostsListSerializer(
            ordered_posts, many=True, context={"request": request}
        )
        return Response(serializer.data)
