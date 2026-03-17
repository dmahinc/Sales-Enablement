#!/usr/bin/env python3
"""
Regenerate embeddings for all materials. Run after migrating to BGE-M3 (1024 dims).
Usage: python -m scripts.regenerate_embeddings
"""
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.material import Material
from app.services.embedding_service import embed_texts, build_material_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    db = SessionLocal()
    try:
        materials = db.query(Material).filter(Material.embedding.is_(None)).all()
        total = len(materials)
        logger.info("Regenerating embeddings for %d materials...", total)

        batch_size = 16
        success = 0
        for i in range(0, total, batch_size):
            batch = materials[i : i + batch_size]
            texts = [build_material_text(m) for m in batch]
            valid = [(m, t) for m, t in zip(batch, texts) if t and len(t.strip()) >= 10]
            if not valid:
                continue
            mats, txts = zip(*valid)
            try:
                vecs = await embed_texts(list(txts))
                for mat, vec in zip(mats, vecs):
                    vec_str = "[" + ",".join(f"{v:.8f}" for v in vec) + "]"
                    mat.embedding = json.dumps(vec)
                    db.execute(
                        text("UPDATE materials SET embedding_vec = :vec WHERE id = :mid"),
                        {"vec": vec_str, "mid": mat.id},
                    )
                db.commit()
                success += len(mats)
                logger.info("Batch %d-%d: %d done (total %d/%d)", i, i + len(mats), len(mats), success, total)
            except Exception as e:
                logger.error("Batch failed at offset %d: %s", i, e)
                db.rollback()

        logger.info("Done: %d/%d materials embedded", success, total)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
