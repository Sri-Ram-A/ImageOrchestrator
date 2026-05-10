# fastapi_service/qdrant_store.py
"""
Qdrant vector store wrapper.
Collection schema:
- Vector: 768-d float32, cosine similarity
- Payload: {"post_id": int, "owner_id": int, "tags": str}
"""

import os
import uuid

import numpy as np
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    PointIdsList,
    PointStruct,
    VectorParams,
)
from dotenv import load_dotenv
load_dotenv()  # Load QDRANT_CLUSTER_ENDPOINT and QDRANT_API_KEY from .env
COLLECTION_NAME = "image_embeddings"
VECTOR_SIZE = 768

class QdrantStore:
    def __init__(self):
        self.client = QdrantClient(
            url=os.environ["QDRANT_CLUSTER_ENDPOINT"],
            api_key=os.environ.get("QDRANT_API_KEY"),
            cloud_inference=True,
        )
        existing = {c.name for c in self.client.get_collections().collections}
        if COLLECTION_NAME not in existing:
            self.client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )
            logger.debug(f"Created Qdrant collection '{COLLECTION_NAME}'")
        else:
            logger.debug(f"Qdrant collection '{COLLECTION_NAME}' already exists.")

    def upsert(self, embedding: np.ndarray, payload: dict) -> str:
        """
        Store an image embedding.
        Returns:
            The UUID string assigned as the Qdrant point ID.
        """
        point_id = str(uuid.uuid4())
        self.client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(id=point_id, vector=embedding.tolist(), payload=payload)
            ],
        )
        return point_id

    def delete(self, point_id: str) -> None:
        """Remove a single point by its UUID."""
        self.client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=PointIdsList(points=[point_id]),
        )
        logger.debug(f"Deleted embedding point_id={point_id}")

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> list[str]:
        """
        Return a ranked list of point UUIDs matching the query vector.
        Args:
            query_vector: Normalised 768-d embedding of the text query.
            top_k:        Maximum number of results to return.
        Returns:
            List of embedding_id strings ordered by relevance (highest first).
        """
        results = self.client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector.tolist(),  
            limit=top_k,
        )
        # Access points from the response
        return [str(hit.id) for hit in results.points]
