"""
qdrant_store.py

Manages two Qdrant collections:
  - image_embeddings      : one point per uploaded post image
  - image_tags_embeddings : one point per Places-365 label (seeded separately)

Both use 768-d cosine-similarity vectors produced by all-mpnet-base-v2.
"""

import os
import uuid
import numpy as np
from dotenv import load_dotenv
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.conversions.common_types import QueryResponse
from qdrant_client.http.models import (
    Distance,
    PointIdsList,
    PointStruct,
    VectorParams,
)

load_dotenv()

IMAGE_COLLECTION_NAME = "image_descr_embeddings"
LABEL_COLLECTION_NAME = "image_tag_embeddings"
VECTOR_SIZE = 768


class QdrantStore:
    """Wrapper class managing operations on Qdrant vector store collections."""

    def __init__(self):
        """Initializes the Qdrant client and creates missing collections."""

        # 1. Connect to Qdrant
        self.client = QdrantClient(
            url=os.environ["QDRANT_CLUSTER_ENDPOINT"],
            api_key=os.environ.get("QDRANT_API_KEY"),
            cloud_inference=True,
        )

        # 2. Fetch existing collections to avoid duplication errors
        existing = {c.name for c in self.client.get_collections().collections}
        logger.debug(f"Existing Qdrant collections: {existing}")

        # 3. Create image collection if missing
        if IMAGE_COLLECTION_NAME not in existing:
            self.client.create_collection(
                collection_name=IMAGE_COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info(f"Created collection '{IMAGE_COLLECTION_NAME}'")
        else:
            logger.debug(f"Collection '{IMAGE_COLLECTION_NAME}' already exists.")

        # 4. Create label collection if missing (seeding done separately via seed_labels())
        if LABEL_COLLECTION_NAME not in existing:
            self.client.create_collection(
                collection_name=LABEL_COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info(f"Created collection '{LABEL_COLLECTION_NAME}'")
        else:
            logger.debug(f"Collection '{LABEL_COLLECTION_NAME}' already exists.")

    def upsert(
        self,
        embedding: np.ndarray,
        payload: dict,
        collection_name: str = IMAGE_COLLECTION_NAME,
    ) -> str:
        """
        Insert or update a single vector point in the given collection.

        Args:
            embedding:       Normalised 768-d float32 array.
            payload:         Metadata to attach (post_id, owner_id, tags, etc.).
            collection_name: Target collection. Defaults to image collection.

        Returns:
            str: The UUID assigned to this point.
        """

        # 1. Generate a unique point ID
        point_id = str(uuid.uuid4())

        # 2. Upsert into Qdrant
        self.client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(id=point_id, vector=embedding.tolist(), payload=payload)
            ],
        )
        logger.debug(
            f"Upserted point id={point_id} into '{collection_name}' | payload keys={list(payload.keys())}"
        )
        return point_id

    def delete(
        self, point_id: str, collection_name: str = IMAGE_COLLECTION_NAME
    ) -> None:
        """
        Hard-delete a single point by its UUID.

        Args:
            point_id:        UUID string returned by upsert().
            collection_name: Collection to delete from.
        """
        self.client.delete(
            collection_name=collection_name,
            points_selector=PointIdsList(points=[point_id]),
        )
        logger.debug(f"Deleted point_id={point_id} from '{collection_name}'")

    def search(
        self,
        query_vector: np.ndarray,
        top_k: int = 5,
        collection_name: str = IMAGE_COLLECTION_NAME,
    ) -> QueryResponse:
        """
        Nearest-neighbour search against a collection.

        Args:
            query_vector:    Normalised 768-d query embedding.
            top_k:           Max number of results to return.
            collection_name: Collection to search within.

        Returns:
            QueryResponse — iterate via .points to access ScoredPoint items.
        """
        logger.debug(f"Searching top_k={top_k} in '{collection_name}' ...")
        results = self.client.query_points(
            collection_name=collection_name,
            query=query_vector.tolist(),
            limit=top_k,
        )
        logger.debug(
            f"Search returned {len(results.points)} hits from '{collection_name}'"
        )
        return results

    def search_labels(
        self,
        query_vector: np.ndarray,
        threshold: float = 0.3,
        top_k: int = 10,
    ) -> list[dict]:
        """
        Semantic label search over the Places-365 label collection.

        Args:
            query_vector: Embedding of an image description or user query.
            threshold:    Minimum cosine score to include a label (0.0–1.0).
            top_k:        Hard cap on returned labels.

        Returns:
            list[dict]: e.g. [{"label": "airport_terminal", "score": 0.84}, ...]
        """
        logger.debug(
            f"Searching label collection | top_k={top_k}, threshold={threshold}"
        )

        # 1. Run vector search against label collection
        response = self.search(
            query_vector=query_vector,
            top_k=top_k,
            collection_name=LABEL_COLLECTION_NAME,
        )

        # 2. Filter by threshold and format output
        matched_labels = []
        for hit in response.points:
            if hit.score >= threshold:
                matched_labels.append(
                    {
                        "label": hit.payload.get("label_name"),
                        "score": round(hit.score, 4),
                    }
                )

        logger.debug(
            f"Labels above threshold ({threshold}): {[m['label'] for m in matched_labels]}"
        )
        return matched_labels


if __name__ == "__main__":
    import numpy as np

    store = QdrantStore()

    # 1. Test image collection upsert
    logger.info("Testing image collection upsert ...")
    test_embedding = np.random.rand(VECTOR_SIZE).astype(np.float32)
    test_payload = {"post_id": 101, "owner_id": 1, "tags": ["nature", "mountain"]}
    new_id = store.upsert(test_embedding, test_payload)
    logger.success(f"Upserted image point: {new_id}")

    # 2. Test search
    logger.info("Testing search ...")
    results = store.search(test_embedding, top_k=3)
    ids = [str(h.id) for h in results.points]
    logger.info(f"Search result IDs: {ids}")
    assert new_id in ids, "Upserted point not found in search results!"
    logger.success("Search check passed.")

    # 3. Test delete
    logger.info("Testing delete ...")
    store.delete(new_id)
    post_delete = store.search(test_embedding, top_k=1)
    assert new_id not in [str(h.id) for h in post_delete.points], (
        "Point still exists after delete!"
    )
    logger.success("Delete check passed.")
