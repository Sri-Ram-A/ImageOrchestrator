# gallery/tasks.py

import io
import cv2
import httpx
import numpy as np
from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from loguru import logger

from gallery.models import Post
from processing import preprocess

FASTAPI_SERVICE_URL = settings.FASTAPI_SERVICE_URL


# Task 1: local image processing
@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def task_process_image(self, post_id: int) -> int:

    try:
        # 1. Fetch post
        post = Post.objects.get(pk=post_id)

        # 2. Read image bytes from storage
        post.image.open("rb")
        file_bytes = post.image.read()
        post.image.close()

        filename = post.image.name.split("/")[-1]

        # 3. Decode directly into OpenCV image
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image.")

        # 4. Apply processing
        if post.processing_type == "grayscale":
            img = preprocess.apply_grayscale(img)
        elif post.processing_type == "resolution":
            img = preprocess.upscale_resolution(img)

        # 5. Compute metadata
        post.phash = preprocess.generate_phash(img)
        post.blur_score = preprocess.compute_blur_score(img)
        logger.debug(
            f"[task_process_image] pk={post_id} | phash={post.phash} | blur={post.blur_score:.2f}"
        )
        # 6. Encode processed image back to JPEG
        success, buffer = cv2.imencode(".jpg", img)
        if not success:
            raise ValueError("Failed to encode processed image.")

        # 7. Save processed image
        post.image.save(
            filename,
            ContentFile(buffer.tobytes()),
            save=False,
        )
        # 8. Persist DB fields
        post.save(
            update_fields=[
                "phash",
                "blur_score",
                "image",
            ]
        )
        return post_id

    except Post.DoesNotExist:
        logger.error(f"[task_process_image] Post {post_id} not found.")
        return post_id

    except Exception as exc:
        logger.exception(f"[task_process_image] pk={post_id} failed: {exc}")
        raise self.retry(exc=exc)


#  Task 2: embedding + tagging via FastAPI
@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def task_generate_embedding(self, post_id: int) -> None:
    """
    Sends the processed image to the FastAPI embedding microservice,
    then stores the returned tags and embedding_id on the Post.

    Receives post_id from the previous chain step.
    """
    try:
        # 1. Fetch the post
        post = Post.objects.get(pk=post_id)
        filename: str = post.image.name.split("/")[-1]
        post.image.open("rb")
        file_bytes: bytes = post.image.read()
        post.image.close()

        # 2. Fetch the assigned tags
        resp = httpx.post(
            url=f"{FASTAPI_SERVICE_URL}/embed",
            files={"file": (filename, io.BytesIO(file_bytes), "image/jpeg")},
            params={"post_id": post.id, "owner_id": post.owner.pk},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()

        # 3. Update existing post fields and save
        post.tags = data.get("tags", "")
        post.embedding_id = data.get("embedding_id", "")
        post.save(update_fields=["tags", "embedding_id"])

        logger.debug(
            f"[task_generate_embedding] pk={post_id} | embedding_id={post.embedding_id} | tags={post.tags}"
        )

    except Post.DoesNotExist:
        logger.error(f"[task_generate_embedding] Post {post_id} not found.")

    except httpx.HTTPError as exc:
        logger.error(f"[task_generate_embedding] pk={post_id} HTTP error: {exc}")
        raise self.retry(exc=exc)

    except Exception as exc:
        logger.error(f"[task_generate_embedding] pk={post_id} failed: {exc}")
        raise self.retry(exc=exc)
