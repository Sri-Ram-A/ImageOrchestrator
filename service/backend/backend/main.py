# fastapi_service/main.py

import io
import uuid
from PIL import Image
from pathlib import Path
from loguru import logger
from dotenv import load_dotenv
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from qdrant_client.http.models import PointStruct
from .encoder import ImageSemanticEncoder
from .store import QdrantStore, LABEL_COLLECTION_NAME

BASE_DIR = Path().resolve()
logger.debug(f"Using Base dir : {BASE_DIR}")
MODELS_DIR = BASE_DIR / "models"
LABELS_FILE = BASE_DIR / "data" / "labels.txt"

load_dotenv(BASE_DIR / ".env")


# Both are initialised once at startup — heavy model load happens here.
encoder = ImageSemanticEncoder()
store = QdrantStore()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check if label collection is empty — seed only on first run
    label_count = store.client.count(collection_name=LABEL_COLLECTION_NAME).count
    logger.info(f"Label collection has {label_count} points.")

    if label_count == 0:
        logger.info("Label collection is empty - initiating streaming seed...")
        if not LABELS_FILE.exists():
            logger.error(f"Labels reference file not found at '{LABELS_FILE}'.")
        else:
            # 1. Read raw text labels cleanly
            labels = [
                line.strip()
                for line in LABELS_FILE.read_text().splitlines()
                if line.strip()
            ]
            BATCH_SIZE = 16
            total_labels = len(labels)
            logger.info(
                f"Processing {total_labels} labels in inline streams of size {BATCH_SIZE}..."
            )

            # 2. Single loop: Chunk text, encode, and push immediately
            for i in range(0, total_labels, BATCH_SIZE):
                label_batch = labels[i : i + BATCH_SIZE]
                points_batch: list[PointStruct] = []

                # Convert the current batch of words to vector points
                for label in label_batch:
                    embedding = encoder.generate_embedding(label)
                    points_batch.append(
                        PointStruct(
                            id=str(uuid.uuid4()),
                            vector=embedding.tolist(),
                            payload={"label_name": label},
                        )
                    )

                # Push this specific batch to the cloud instantly
                store.client.upsert(
                    collection_name=LABEL_COLLECTION_NAME,
                    points=points_batch,
                )

                current_batch_num = (i // BATCH_SIZE) + 1
                total_batches = ((total_labels - 1) // BATCH_SIZE) + 1
                logger.info(
                    f" -> Seeded batch {current_batch_num}/{total_batches} ({len(points_batch)} labels)"
                )

            logger.success(
                f"Successfully streamlined database seeding for {total_labels} vectors."
            )

    yield


app = FastAPI(title="Image Semantic Indexer", version="1.0.0", lifespan=lifespan)


# Health
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
async def embed_image(
    file: UploadFile = File(...),
    post_id: int = Query(..., description="Django Post primary key"),
    owner_id: int = Query(..., description="Django User primary key"),
):
    """
    Full pipeline:
      1. `Decode` uploaded `image` bytes into PIL Image.
      2. `Generate` a detailed `caption` with Florence-2.
      3. `Encode` that caption `into` a 768-d `embedding`.
      4. `Find` matching Places-365 tags via `label` collection search.
      5. `Store` `embedding` + metadata in image collection.
      6. Return tags, embedding_id, and description.
    """
    logger.info(
        f"POST /embed | post_id={post_id}, owner_id={owner_id}, file='{file.filename}'"
    )

    # 1. Read and decode image
    raw_bytes = await file.read()
    logger.debug(f"Read {len(raw_bytes)} bytes from upload.")
    try:
        pil_image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        logger.debug(f"Decoded image: size={pil_image.size}, mode={pil_image.mode}")
    except Exception as exc:
        logger.error(f"Image decode failed for post_id={post_id}: {exc}")
        raise HTTPException(status_code=422, detail="Cannot decode uploaded image.")

    # 2. Generate natural-language description via Florence-2
    logger.debug(f"Generating caption for post_id={post_id} ...")
    description = encoder.generate_description(pil_image)
    logger.info(f"post_id={post_id} | caption='{description[:30]}...'")

    # 3. Encode description into 768-d embedding
    logger.debug(f"Encoding description to embedding for post_id={post_id} ...")
    embedding = encoder.generate_embedding(description)
    logger.debug(f"Embedding shape={embedding.shape}, dtype={embedding.dtype}")

    # 4. Find matching Places-365 tags from label collection
    logger.debug(f"Fetching tags from label collection for post_id={post_id} ...")
    tag_matches = store.search_labels(query_vector=embedding, threshold=0.25, top_k=15)
    tags = [match["label"] for match in tag_matches]
    logger.info(f"post_id={post_id} | tags ({len(tags)}): {tags}")

    # 5. Store embedding + full metadata in image collection
    logger.debug(f"Storing embedding in Qdrant for post_id={post_id} ...")
    embedding_id = store.upsert(
        embedding=embedding,
        payload={
            "post_id": post_id,
            "owner_id": owner_id,
            "description": description,
            "tags": tags,
        },
    )
    logger.success(f"Stored post_id={post_id} | qdrant_id={embedding_id}")

    # 6. Return result
    return {
        "embedding_id": embedding_id,
        "tags": tags,
        "detailed_description": description,
    }


@app.get("/search")
async def search_images(
    query: str = Query(..., description="Natural language search query"),
    top_k: int = Query(default=10, description="Number of results to return"),
    owner_id: int = Query(default=None, description="Optional: filter by owner"),
):
    """
    Semantic image search:
      1. Encode the user's text query into a 768-d embedding.
      2. Run nearest-neighbour search on the image collection.
      3. Return matched posts with their description, tags, and similarity score.
    """
    logger.info(f"GET /search | query='{query}', top_k={top_k}, owner_id={owner_id}")

    # 1. Encode the user query into an embedding
    logger.debug(f"Encoding search query: '{query}' ...")
    query_embedding = encoder.generate_embedding(query)
    logger.debug(f"Query embedding shape={query_embedding.shape}")

    # 2. Search image collection for nearest neighbours
    logger.debug(f"Running image collection search | top_k={top_k} ...")
    results = store.search(query_vector=query_embedding, top_k=top_k)

    # 3. Format results — optionally filter by owner_id
    hits = []
    for hit in results.points:
        payload = hit.payload or {}

        if owner_id is not None and payload.get("owner_id") != owner_id:
            logger.debug(f"Skipping point {hit.id} — owner_id mismatch.")
            continue

        hits.append(
            payload.get("post_id"),
        )
    logger.info(f"Search for '{query}' returned {len(hits)} results.")
    return hits


# Delete
@app.delete("/embed/{embedding_id}")
def delete_embedding(embedding_id: str):
    """Remove a stored image embedding from Qdrant."""
    store.delete(embedding_id)
    return {"deleted": embedding_id}


@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Image Orchestrator | System Core</title>
        <style>
            :root {
                --accent: #00f2ff;
                --bg: #050505;
                --panel: #0f172a;
                --text: #94a3b8;
            }
            body { 
                background-color: var(--bg); 
                color: var(--text); 
                font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                overflow: hidden;
            }
            /* Scanline Effect */
            body::before {
                content: " ";
                display: block;
                position: absolute;
                top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
                            linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                z-index: 2;
                background-size: 100% 4px, 3px 100%;
                pointer-events: none;
            }
            .container {
                position: relative;
                border: 1px solid #1e293b;
                padding: 60px;
                background: var(--panel);
                box-shadow: 0 0 50px rgba(0, 242, 255, 0.05);
                border-radius: 4px;
                z-index: 3;
            }
            .ascii-art {
                font-weight: bold;
                line-height: 1;
                color: var(--accent);
                text-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
                font-size: 12px;
                margin-bottom: 30px;
                animation: flicker 2s infinite;
            }
            @keyframes flicker {
                0% { opacity: 0.97; }
                5% { opacity: 0.85; }
                10% { opacity: 0.99; }
                100% { opacity: 1; }
            }
            .status-bar {
                display: flex;
                align-items: center;
                gap: 15px;
                padding-top: 25px;
                border-top: 1px dashed #334155;
                font-size: 0.85rem;
                letter-spacing: 1px;
            }
            .dot {
                height: 8px;
                width: 8px;
                background-color: var(--accent);
                border-radius: 2px;
                box-shadow: 0 0 10px var(--accent);
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.5; }
                100% { transform: scale(1); opacity: 1; }
            }
            .label { color: #f8fafc; font-weight: bold; }
            a { 
                color: var(--text); 
                text-decoration: none; 
                transition: all 0.3s ease;
                border-bottom: 1px solid transparent;
            }
            a:hover { 
                color: var(--accent); 
                border-bottom: 1px solid var(--accent);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <pre class="ascii-art">
██╗███╗░░░███╗░█████╗░░██████╗░███████╗
██║████╗░████║██╔══██╗██╔════╝░██╔════╝
██║██╔████╔██║███████║██║░░██╗░█████╗░░
██║██║╚██╔╝██║██╔══██║██║░░╚██╗██╔══╝░░
██║██║░╚═╝░██║██║░░██║╚██████╔╝███████╗
╚═╝╚═╝░░░░░╚═╝╚═╝░░╚═╝░╚═════╝░╚══════╝

░█████╗░██████╗░░█████╗░██╗░░██╗███████╗░██████╗████████╗██████╗░░█████╗░████████╗░█████╗░██████╗░
██╔══██╗██╔══██╗██╔══██╗██║░░██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗
██║░░██║██████╔╝██║░░╚═╝███████║█████╗░░╚█████╗░░░░██║░░░██████╔╝███████║░░░██║░░░██║░░██║██████╔╝
██║░░██║██╔══██╗██║░░██╗██╔══██║██╔══╝░░░╚═══██╗░░░██║░░░██╔══██╗██╔══██║░░░██║░░░██║░░██║██╔══██╗
╚█████╔╝██║░░██║╚█████╔╝██║░░██║███████╗██████╔╝░░░██║░░░██║░░██║██║░░██║░░░██║░░░╚█████╔╝██║░░██║
░╚════╝░╚═╝░░╚═╝░╚════╝░╚═╝░░╚═╝╚══════╝╚═════╝░░░░╚═╝░░░╚═╝░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝
            </pre>
            <div class="status-bar">
                <div style="display: flex; align-items: center;">
                    <span class="dot"></span>
                    <span class="label" style="margin-left: 10px;">CORE_ONLINE</span>
                </div>
                <span style="color: #334155;">|</span>
                <a href="/docs">SWAGGER_UI</a>
                <span style="color: #334155;">|</span>
                <a href="/redoc">API_SCHEMATIC</a>
            </div>
        </div>
    </body>
    </html>
    """
