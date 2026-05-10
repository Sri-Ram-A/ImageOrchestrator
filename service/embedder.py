# fastapi_service/embedder.py

"""
SigLIP embedder using native HuggingFace Transformers.

Provides:
1. 768-d normalized embeddings for vector DB storage
2. Zero-shot image tagging via text-image similarity
3. Reusable for semantic retrieval

Model:
google/siglip-base-patch16-224
"""

import requests
from io import BytesIO
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from loguru import logger
from transformers import AutoModel, AutoProcessor


MODEL_ID = "google/siglip-base-patch16-224"

CANDIDATE_PROMPTS = {
    "forest": "A natural forest with many green trees",
    "beach": "A sandy beach near the ocean",
    "mountain": "Large mountains in nature",
    "city": "An urban city with buildings and streets",
    "desert": "A dry desert with sand dunes",
    "snow": "A snowy landscape covered in snow",
    "river": "A flowing river in nature",
    "ocean": "A large blue ocean or sea",
    "field": "An open grassy field",
    "sky": "The sky with clouds outdoors",
    "people": "One or more human beings",
    "animals": "Animals or wildlife",
    "food": "Food or a meal on a table",
    "architecture": "Buildings and architectural structures",
    "vehicle": "A car, truck, bus, or vehicle",
    "indoor": "An indoor room or interior scene",
    "night": "A nighttime dark scene",
    "sunset": "A colorful sunset in the sky",
    "abstract": "Abstract art or abstract patterns",
    "sports": "People playing sports or athletic activity",
}
TOP_K_TAGS = 3
SCORE_THRESHOLD = 0.0  # lower than your 0.60 usually works better


class SigLIPEmbedder:
    def __init__(self):
        logger.info(f"Loading {MODEL_ID}")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = AutoProcessor.from_pretrained(
            MODEL_ID,
            use_fast=True,
            local_files_only=True,
        )
        self.model = AutoModel.from_pretrained(
            MODEL_ID,
            local_files_only=True,
        ).to(self.device)
        self.model.eval()

        # Precompute label embeddings
        prompts = list(CANDIDATE_PROMPTS.values())
        self.labels = list(CANDIDATE_PROMPTS.keys())
        with torch.no_grad():
            text_inputs = self.processor(
                text=prompts, padding=True, truncation=True, return_tensors="pt"
            )
            text_inputs = {k: v.to(self.device) for k, v in text_inputs.items()}
            # logger.debug(f"Text inputs : {text_inputs}")
            text_emb = self.model.get_text_features(**text_inputs)
            text_emb = F.normalize(text_emb, p=2, dim=-1)
            logger.debug(f"Normalized Text Embeddings  : {text_emb}")

        self.label_embeddings = text_emb.cpu().numpy()
        logger.info(f"Loaded label embeddings {self.label_embeddings.shape}")

    def embed_image(self, pil_image) -> np.ndarray:
        with torch.no_grad():
            inputs = self.processor(images=pil_image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            image_emb = self.model.get_image_features(**inputs)
            image_emb = F.normalize(image_emb, p=2, dim=-1)
        embedding = image_emb[0].cpu().numpy().astype(np.float32)
        return embedding

    def embed_text(self, text: str) -> np.ndarray:
        with torch.no_grad():
            inputs = self.processor(text=[text], return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            text_emb = self.model.get_text_features(**inputs)
            text_emb = F.normalize(text_emb, p=2, dim=-1)
        return text_emb[0].cpu().numpy().astype(np.float32)

    def classify(self, image_embedding: np.ndarray)->list[dict]:
        scores = np.dot(self.label_embeddings, image_embedding)
        logger.debug(f"scores={scores}")
        ranked = scores.argsort()[::-1]
        results = []
        for idx in ranked[:TOP_K_TAGS]:
            results.append(
                {
                    "label": self.labels[idx],
                    "score": float(scores[idx]),
                }
            )

        return results


# Example test
if __name__ == "__main__":
    TEST_IMAGE = "https://images.unsplash.com/photo-1506744038136-46273834b3fb"

    print("Downloading image...")

    r = requests.get(TEST_IMAGE, timeout=20)
    r.raise_for_status()

    image = Image.open(BytesIO(r.content)).convert("RGB")
    embedder = SigLIPEmbedder()

    # image embedding
    emb = embedder.embed_image(image)
    print("\nEmbedding shape:", emb.shape)
    # should be:
    # (768,)

    # zero-shot labels
    tags = embedder.classify(emb)
    print("\nPredicted tags:")
    print(tags)

    # semantic text-image test
    query = "a mountain lake landscape"
    q_emb = embedder.embed_text(query)
    similarity = float(emb @ q_emb)
    print(f"\nImage-query similarity ('{query}'):")
    print(similarity)
