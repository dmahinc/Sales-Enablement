"""
Embedding service for semantic search.

Supports two providers:
  - "ovh"   : OVHcloud AI Endpoints (OpenAI-compatible /v1/embeddings)
  - "local" : fastembed with BAAI/bge-small-en-v1.5 (ONNX, 384 dims)
  - "auto"  : tries OVH first, falls back to local
"""
import json
import logging
from typing import List, Optional

import httpx
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

_local_model = None


def _get_local_model():
    global _local_model
    if _local_model is None:
        from fastembed import TextEmbedding
        logger.info("Loading local embedding model (BAAI/bge-small-en-v1.5)...")
        _local_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        logger.info("Local embedding model loaded.")
    return _local_model


def build_material_text(material) -> str:
    """Compose a single searchable text blob from a material's fields."""
    parts = []
    if material.name:
        parts.append(material.name)
    if material.product_name:
        parts.append(f"Product: {material.product_name}")
    if material.universe_name:
        parts.append(f"Universe: {material.universe_name}")
    if material.description:
        parts.append(material.description)

    for field_name in ("tags", "keywords", "use_cases", "pain_points"):
        raw = getattr(material, field_name, None)
        if raw:
            try:
                items = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(items, list):
                    parts.append(f"{field_name.replace('_', ' ').title()}: {', '.join(str(i) for i in items)}")
            except (json.JSONDecodeError, TypeError):
                parts.append(f"{field_name.replace('_', ' ').title()}: {raw}")

    if material.executive_summary:
        parts.append(material.executive_summary)

    return ". ".join(parts)


async def _embed_ovh(texts: List[str]) -> Optional[List[List[float]]]:
    """Call OVHcloud AI /v1/embeddings endpoint."""
    if not settings.OVH_AI_EMBEDDING_URL or not settings.OVH_AI_API_KEY:
        return None

    try:
        payload = {
            "input": texts,
            "model": settings.OVH_AI_EMBEDDING_MODEL or "default",
        }
        headers = {
            "Authorization": f"Bearer {settings.OVH_AI_API_KEY}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.post(settings.OVH_AI_EMBEDDING_URL, json=payload, headers=headers)

        if resp.status_code != 200:
            logger.warning("OVH embedding endpoint returned %s: %s", resp.status_code, resp.text[:300])
            return None

        data = resp.json()
        embeddings = [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
        return embeddings
    except Exception as e:
        logger.error("OVH embedding call failed: %s", e)
        return None


def _embed_local(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using the local fastembed model."""
    model = _get_local_model()
    results = list(model.embed(texts))
    return [emb.tolist() if isinstance(emb, np.ndarray) else list(emb) for emb in results]


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts using the configured provider.
    Returns a list of float vectors, one per input text.
    """
    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "ovh":
        result = await _embed_ovh(texts)
        if result is None:
            raise RuntimeError("OVH embedding endpoint failed and provider is set to 'ovh'")
        return result

    if provider == "local":
        return _embed_local(texts)

    # "auto": try OVH first, fall back to local
    result = await _embed_ovh(texts)
    if result is not None:
        return result

    logger.info("OVH embedding unavailable, falling back to local model")
    return _embed_local(texts)


async def embed_text(text: str) -> List[float]:
    """Embed a single text string."""
    results = await embed_texts([text])
    return results[0]
