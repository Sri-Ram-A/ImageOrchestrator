import json
import cv2
import numpy as np
from typing import cast
from django.http import HttpResponse
from django.core.files.base import ContentFile

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from .models import Posts
from .serializers import PostListSerializer, PostCreateSerializer
from processing import preprocess
from processing import producer


class HelloWorld(APIView):
    def get(self, request):
        return Response({"message": "Hello To My Project"})


class PostsAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk=None):
        if pk is not None:
            try:
                # Detail View: Get a single post
                post = Posts.objects.get(pk=pk)
                serializer = PostListSerializer(post, context={"request": request})
                return Response(serializer.data)
            except Posts.DoesNotExist:
                return Response(
                    {"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            # List View: Get all posts
            queryset = Posts.objects.only(
                "id",
                "title",
                "creator",
                "description",
                "image_url",
                "uploaded_at",
                "processing_type",
            ).order_by("-uploaded_at")
            # Context={"request": request} ensures absolute URLs for the ImageField
            serializer = PostListSerializer(
                queryset, many=True, context={"request": request}
            )
            return Response(serializer.data)

    # POST create
    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        instance = serializer.save()
        instance = cast(Posts, serializer.save())
        try:
            uploaded_file = request.FILES["image_url"]
            uploaded_file.seek(0)
            file_bytes = uploaded_file.read()

            # 1. Worker processing
            if instance.processing_type != "none":
                processed, worker_id = producer.send_to_worker(
                    instance.processing_type, file_bytes, uploaded_file.name
                )
                if not processed:
                    raise ValueError("Worker processing failed")
                file_bytes = processed
                producer.release_worker(instance.processing_type, worker_id)

            # 2. PHash generation
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Invalid image.")
            generated_phash = preprocess.generate_phash(img)

            # 3. Duplicate hash : Check if this phash already exists in the DB
            if Posts.objects.filter(phash=generated_phash).exists():
                # Delete the record we just created because it's a duplicate
                instance.delete()
                return Response(
                    {"error": "This image has already been uploaded."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # 4. If unique, update the instance
            instance.phash = generated_phash

            # Save processed image to the file field
            instance.image_url.save(
                uploaded_file.name, ContentFile(file_bytes), save=False
            )
            # Final save to database
            instance.save()

            return Response(
                PostListSerializer(instance, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            # Cleanup: delete the instance if processing failed
            if instance.id:
                instance.delete()
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
