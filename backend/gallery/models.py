from django.db import models
from django.contrib.auth.models import User
# Create your models here.
# lets us explicitly set upload path and filename

# 🌟✨observation:
# if USE_MINIO=True,every image_url in every Posts object = http://127.0.0.1:9000/media/images/wallhaven-1.jpg
# if USE_MINIO=False every image_url in every Posts object = http://127.0.0.1:8000/media/images/wallhaven-1_-_minio.jpg
# suppose image names are same in local/media/ as well as minio/media then they will be rendered irrespective of value of USE_MINIO


def upload_to(instance, filename):
    return f"images/{filename}"


class Post(models.Model):
    PROCESSING_CHOICES = [
        ("none", "None"),
        ("grayscale", "Grayscale"),
        ("resize", "Resize"),
    ]
    id =  models.BigAutoField(primary_key=True)
    # Auth
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    # Content
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    image_url = models.ImageField(upload_to="images/%Y/%m/")
    processing_type = models.CharField(
        max_length=20,
        choices=PROCESSING_CHOICES,
        default="none",
    )
    # Deduplication
    phash = models.CharField(max_length=64, unique=True, db_index=True)
    # Populated by FastAPI microservice
    tags = models.CharField(max_length=512, blank=True, default="")
    blur_score = models.FloatField(null=True, blank=True)
    embedding_id = models.CharField(max_length=64, blank=True, default="")
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"[{self.id}] {self.title} — {self.owner.username}"
