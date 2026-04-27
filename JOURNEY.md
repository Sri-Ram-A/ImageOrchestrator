# User browser
→ Edge / CDN / DNS  
→ Next.js frontend  
→ Nginx reverse proxy  
→ Django API server  
→ Redis queue  
→ Celery workers  
→ MinIO object storage  
→ PostgreSQL metadata DB  
→ Prometheus + Grafana monitoring  

```bash
git rm -r --cached <folder-name>
```
# Authenticate and Login
- Google : https://medium.com/@michal.drozdze/django-rest-framework-jwt-authentication-social-login-login-with-google-8911332f1008
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/?utm_source=chatgpt.com
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/?utm_source=chatgpt.com#2-configure-django-settings


So this is what I need you to do 
- Introduce Django Authentication using User Model 
- Write a FastAPI microservice which performs the following tasks :  
## Image Embedding Storage and Categorization
- I need you to use zero shot learning tools like : https://docs.openvino.ai/2024/notebooks/siglip-zero-shot-image-classification-with-output.html so that I can store the embedding on some storage like Qdrant (I have the cloud access to Qdrant),I need the same model to also generate an image embedding which can be used for semantic search using text query later
- When user sends text query like "Fetch Images of forest" then I need SOme fast vector search to fetech similar image embeddingd
- Make sure to use lightweight models which use less storage

## Image Depeuplication 
I already have below code :

```python
def dct2(img):
    return dct(dct(img.T, norm="ortho").T, norm="ortho")


def generate_phash(img, hash_size=8):
    # Convert OpenCV image to PIL Image
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img)

    # Define the orientations to test
    orientations = [
        ("Original", pil_img.copy()),
        ("Rotated 90", pil_img.copy().rotate(90, expand=True)),
        ("Mirrored", ImageOps.mirror(pil_img.copy())),
    ]

    candidate_hashes = []

    for name, img_obj in orientations:
        # Process each orientation
        resize_dim = hash_size * 4
        img_resized = img_obj.resize((resize_dim, resize_dim), Image.Resampling.LANCZOS)
        img_gray = img_resized.convert("L")
        # Convert to numpy array for DCT
        img_array = np.array(img_gray, dtype=float)
        dct_coeffs = dct2(img_array)
        dct_reduced = dct_coeffs[:hash_size, :hash_size]
        # Compute hash
        ac_coeffs = dct_reduced.flatten()[1:]
        median_val = np.median(ac_coeffs)
        binary_matrix = dct_reduced >= median_val
        binary_str = "".join(binary_matrix.flatten().astype(int).astype(str))
        hex_hash = hex(int(binary_str, 2))[2:]
        candidate_hashes.append(hex_hash)

    # Return the smallest hash as canonical
    return min(candidate_hashes)
```

- I need this microservice to also provide a functionality of finding how blur an image is , along with the hashing
- The below is my views.py , serializeers.py , urls.py 
  
```python
# urls.py
from . import views
from django.urls import path

urlpatterns = [
    path("", views.HelloWorld.as_view()),
    path("images/", views.PostsAPIView.as_view(), name="post-list"),
    path("images/<int:pk>/", views.PostsAPIView.as_view(), name="post-detail"),
]
# views.py
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
# serializers.py
from rest_framework import serializers
from .models import Posts


class PostListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Posts
        fields = "__all__"


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Posts
        fields = ["title", "description", "creator", "image_url", "processing_type"]

    def validate_image_url(self, value):
        if not value:
            raise serializers.ValidationError("Image required.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image exceeds 10MB.")
        return value

```

- Write code in PEP8 style
- Use good accuracy but low storage models
- As explained earlier , when user uploads image I need it to request the microservice for generating and storing image embedding and then tagging the image 
- When user sends request to retrieve all images I also need the class , blur_score , some meta data (like owner etc)
- Once this is done , lets move on to frontend using Next JS , also allow authentication : registration and login
- Write simple , Understandable code (no N+1 problem) with proper descriptions and only required loguru logger.debug() with f strings if necessary