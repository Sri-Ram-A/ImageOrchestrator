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
 # Load QDRANT_CLUSTER_ENDPOINT and QDRANT_API_KEY from .env
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

    def search(self, query_vector: np.ndarray, top_k: int = 5):
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
        logger.debug(f"Retrieved {top_k} results")
        print("\n--- Search Results Detail ---")
        # pprint(results)
        # results = [hit for hit in results.points]
        # for hit in results.points:
        # pprint(hit.model_dump())
        # results = [
        #     {
        #         "id": "b25012b1-4e56-4a3f-848e-634ea1d91ee4",
        #         "order_value": None,
        #         "payload": {
        #             "owner_id": 1,
        #             "post_id": 101,
        #             "tags": "nature, mountain, sunset",
        #         },
        #         "score": 1.0,
        #         "shard_key": None,
        #         "vector": None,
        #         "version": 19,
        #     },
        #     {
        #         "id": "d578ae0c-53ee-416c-8ff7-b6787d9c5c00",
        #         "order_value": None,
        #         "payload": {
        #             "owner_id": 3,
        #             "post_id": 15,
        #             "tags": ["ocean", "architecture", "snow"],
        #         },
        #         "score": 0.109404,
        #         "shard_key": None,
        #         "vector": None,
        #         "version": 5,
        #     },
        #     {
        #         "id": "75657b02-7a7e-4887-b7e8-d41cdb2ee0b4",
        #         "order_value": None,
        #         "payload": {
        #             "owner_id": 3,
        #             "post_id": 16,
        #             "tags": ["forest", "sports", "ocean"],
        #         },
        #         "score": 0.10324259,
        #         "shard_key": None,
        #         "vector": None,
        #         "version": 6,
        #     },
        # ]
        return results


if __name__ == "__main__":
    # Initialize the store
    store = QdrantStore()

    # 1. Create a dummy 768-d embedding
    test_embedding = np.random.rand(768).astype(np.float32)

    # 2. Define a sample payload
    test_payload = {"post_id": 101, "owner_id": 1, "tags": "nature, mountain, sunset"}

    print("--- Testing Upsert ---")
    try:
        new_id = store.upsert(test_embedding, test_payload)
        print(f"Successfully upserted point with ID: {new_id}")

        print("\n--- Testing Search ---")
        # Search using the same vector (should return the point we just added)
        search_results = store.search(test_embedding, top_k=3)
        print(f"Search results (IDs): {search_results}")
        search_results = [hit for hit in search_results.points]

        if new_id in search_results:
            print("Check passed: The upserted ID was found in search results.")

        print("\n--- Testing Delete ---")
        store.delete(new_id)
        print(f"Successfully deleted point: {new_id}")

        # Final check
        post_delete_search = store.search(test_embedding, top_k=1)
        post_delete_search = [hit for hit in post_delete_search.points]
        if new_id not in post_delete_search:
            print("Check passed: Point is no longer in the store.")

    except Exception as e:
        print(f"An error occurred during testing: {e}")
