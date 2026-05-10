# fastapi_service/main.py
"""
FastAPI Microservice — Image Embedding & Semantic Search

Endpoints:
  POST   /embed          — embed an uploaded image, store in Qdrant, return tags + id
  DELETE /embed/{id}     — remove an embedding from Qdrant
  GET    /search?q=...   — text query → ranked list of embedding_ids
  GET    /health         — liveness check
"""

import io
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse
from loguru import logger
from PIL import Image

from .embedder import SigLIPEmbedder
from .store import QdrantStore

app = FastAPI(title="Image Embedding Service", version="1.0.0")

# Both are initialised once at startup — heavy model load happens here.
embedder = SigLIPEmbedder()
store = QdrantStore()


# Health
@app.get("/health")
def health():
    return {"status": "ok"}


# Embed ─
@app.post("/embed")
async def embed_image(
    file: UploadFile = File(...),
    post_id: int = Query(..., description="Django Post primary key"),
    owner_id: int = Query(..., description="Django User primary key"),
):
    """
    1. Decode the uploaded image.
    2. Generate a 768-d SigLIP embedding.
    3. Run zero-shot classification to produce tags.
    4. Store the embedding in Qdrant.
    5. Return { tags: str, embedding_id: str }.
    """
    raw = await file.read()

    try:
        pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=422, detail="Cannot decode image.")

    # Embed + classify
    image_embedding = embedder.embed_image(pil_image)
    tag_results = embedder.classify(image_embedding)
    tags = [item["label"] for item in tag_results]
    logger.debug(f"post_id={post_id} tags='{tags}'")

    # Store in Qdrant
    embedding_id = store.upsert(
        embedding=image_embedding,
        payload={
            "post_id": post_id,
            "owner_id": owner_id,
            "tags": tags,
        },
    )

    return {"tags": tags, "embedding_id": embedding_id}


# Delete
@app.delete("/embed/{embedding_id}")
def delete_embedding(embedding_id: str):
    """Remove a stored image embedding from Qdrant."""
    store.delete(embedding_id)
    return {"deleted": embedding_id}


# Search
@app.get("/search")
def search_images(
    query: str = Query(
        ..., description="Natural language query, e.g. 'forest at sunset'"
    ),
    top_k: int = Query(20, ge=1, le=100),
):
    """
    Embed the text query using SigLIP's text encoder, then perform
    approximate nearest-neighbour search in Qdrant.
    Returns { ids: [embedding_id, ...] } ordered by similarity.
    """
    inputs = embedder.processor(
        text=[f"This is a photo of {query}."],
        return_tensors="pt",
        padding=True,
    )
    inputs = {k: v.to(embedder.device) for k, v in inputs.items()}
    outputs = embedder.model.get_text_features(**inputs)
    vec = outputs.detach().cpu().numpy().flatten()
    norm = np.linalg.norm(vec)
    query_embedding = vec / norm if norm > 0 else vec
    ids = store.search(query_embedding, top_k=top_k)
    logger.debug(f"Search query='{query}' returned {len(ids)} results")
    return {"ids": ids}


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
