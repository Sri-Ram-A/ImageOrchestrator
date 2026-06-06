# django_backend/gallery/views.py

import httpx
from typing import cast
from django.conf import settings
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
from celery import chain as celery_chain
from .models import Post
from .serializers import PostCreateSerializer, PostsListSerializer
from .tasks import task_process_image, task_generate_embedding

FASTAPI_SERVICE_URL = settings.FASTAPI_SERVICE_URL


@extend_schema(tags=["Gallery"])
class PostView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=PostsListSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        try:
            posts = Post.objects.filter(owner=request.user)
            serializer = PostsListSerializer(
                posts, many=True, context={"request": request}
            )
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(request=PostCreateSerializer, responses=PostsListSerializer)
    def post(self, request: Request) -> Response:
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get the image field from the attached files
        files = cast(MultiValueDict, request.FILES)
        raw_file = files.get("image")
        if not raw_file:
            return Response(
                {"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        _: UploadedFile = raw_file

        # 2. Save immediately with the raw image; processing happens in background.
        instance = serializer.save(owner=request.user)
        instance = cast(Post, instance)

        # 3. Kick off the two-step pipeline as a Celery chain
        task_chain = celery_chain(
            task_process_image.s(instance.pk),  # type: ignore
            task_generate_embedding.s(),  # type: ignore
        )
        task_chain.delay()
        return Response(
            PostsListSerializer(instance, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,  # 202 = accepted, processing async
        )


@extend_schema(tags=["Gallery"])
class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=PostsListSerializer,
    )
    def get(self, request: Request, pk: int) -> Response:
        try:
            post = Post.objects.get(pk=pk, owner=request.user)
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PostsListSerializer(post, context={"request": request}).data)

    @extend_schema(
        responses={204: None},
    )
    def delete(self, request, pk) -> Response:
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
        except Post.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Search"])
class ImageSearchView(APIView):
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
    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"error": "Query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            resp = httpx.get(
                f"{FASTAPI_SERVICE_URL}/search",
                params={"query": query, "top_k": 5},
                timeout=10.0,
            )
            resp.raise_for_status()
            post_ids = resp.json()
        except httpx.HTTPError as exc:
            logger.debug(f"Search microservice error: {exc}")
            return Response(
                {"error": "Search service unavailable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not post_ids:
            return Response([])
        posts_map = {
            p.id: p for p in Post.objects.filter(id__in=post_ids, owner=request.user)
        }
        ordered_posts = [posts_map[pid] for pid in post_ids if pid in posts_map]
        serializer = PostsListSerializer(
            ordered_posts, many=True, context={"request": request}
        )
        return Response(serializer.data)
