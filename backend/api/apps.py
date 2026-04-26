from django.apps import AppConfig
from django_minio_backend import MinioBackend  ###
from loguru import logger


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    # ### BELOW ADDED BY ME
    # def ready(self):
    #     # For MINIO Database
    #     minio = MinioBackend()
    #     result = minio.is_minio_available()
    #     if result:
    #         logger.info("✅ MinIO is available.")
    #     else:
    #         logger.info(
    #             f"❌ MinIO is not available. Using File system storage\n{result.details}"
    #         )
