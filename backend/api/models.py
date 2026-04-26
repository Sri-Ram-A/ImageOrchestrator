from django.db import models
# Create your models here.
# lets us explicitly set upload path and filename

# 🌟✨observation:
# if USE_MINIO=True,every image_url in every Posts object = http://127.0.0.1:9000/media/images/wallhaven-1.jpg
# if USE_MINIO=False every image_url in every Posts object = http://127.0.0.1:8000/media/images/wallhaven-1_-_minio.jpg
# suppose image names are same in local/media/ as well as minio/media then they will be rendered irrespective of value of USE_MINIO


def upload_to(instance, filename):
    return f"images/{filename}"


class Posts(models.Model):
    id = models.BigAutoField(primary_key=True)
    PROCESSING_CHOICES = [
        ("none", "None"),
        ("grayscale", "Grayscale"),
        ("resolution", "Resolution"),
    ]
    creator = models.CharField(max_length=80, blank=False, null=False)
    title = models.CharField(max_length=80, blank=False, null=False)
    description = models.TextField()
    image_url = models.ImageField(upload_to=upload_to, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    phash = models.CharField(max_length=16, blank=True, null=True)
    processing_type = models.CharField(
        max_length=20, choices=PROCESSING_CHOICES, default="none"
    )

    def __str__(self):
        return f"{self.title} by {self.creator}"
