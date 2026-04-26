import json
import cv2
import numpy as np

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
                post = Posts.objects.only("meta").get(pk=pk)
                meta = json.loads(post.meta)
                image = preprocess.image_decoding(**meta)
                ok, encoded = cv2.imencode(".jpg", image)
                if not ok:
                    return Response({"error": "Encoding failed"}, status=500)
                return HttpResponse(encoded.tobytes(), content_type="image/jpeg")
            except Posts.DoesNotExist:
                return Response({"error": "Post not found"}, status=404)
        else:
            queryset = Posts.objects.only(
                "id",
                "title",
                "creator",
                "description",
                "image_url",
                "uploaded_at",
                "processing_type",
            ).order_by("-uploaded_at")
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
        try:
            uploaded_file = request.FILES["image_url"]
            uploaded_file.seek(0)
            file_bytes = uploaded_file.read()

            # worker processing
            if instance.processing_type != "none":
                processed, worker_id = producer.send_to_worker(
                    instance.processing_type, file_bytes, uploaded_file.name
                )
                if not processed:
                    raise ValueError("Worker processing failed")
                file_bytes = processed
                producer.release_worker(instance.processing_type, worker_id)

            # save processed image
            instance.image_url.save(
                uploaded_file.name, ContentFile(file_bytes), save=False
            )
            # phash generation
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Invalid image.")
            phash = preprocess.generate_phash(img)
            instance.phash = phash

            # encoded metadata
            encoded_meta = preprocess.image_encoding(img)
            instance.meta = json.dumps(encoded_meta)
            instance.save()
            return Response(PostListSerializer(instance).data, status=201)

        except Exception as e:
            instance.delete()
            if str(e) == "image existing":
                return Response({"error": "image existing"}, status=403)
            return Response({"error": str(e)}, status=500)
