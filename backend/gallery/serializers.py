# backend/gallery/serializers.py

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.core.files.uploadedfile import UploadedFile
from .models import Post


class PostsListSerializer(serializers.ModelSerializer):
    # image_url = serializers.ImageField(source="image", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "description",
            "image_url",
            "processing_type",
            "uploaded_at",
            "tags",
            "phash"
        ]
    @extend_schema_field(str)
    def get_image_url(self, obj: Post) -> str | None:        
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["title", "description", "image", "processing_type"]

    def validate_image(self, value: UploadedFile) -> UploadedFile:
        if not value:
            raise serializers.ValidationError("Image required.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image exceeds 10MB.")
        return value
