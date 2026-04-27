from rest_framework import serializers
from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Post
        fields = "__all__"


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["title", "description", "creator", "image_url", "processing_type"]

    def validate_image_url(self, value):
        if not value:
            raise serializers.ValidationError("Image required.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image exceeds 10MB.")
        return value
