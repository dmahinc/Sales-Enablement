"""
Embeddings API – generate and manage vector embeddings for materials.
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.services.embedding_service import embed_text, embed_texts, build_material_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/embeddings", tags=["embeddings"])


async def _generate_embedding_for_material(material: Material, db: Session) -> bool:
    """Generate and store embedding for a single material. Returns True on success."""
    try:
        composite_text = build_material_text(material)
        if not composite_text or len(composite_text.strip()) < 10:
            logger.warning("Material %s has insufficient text for embedding", material.id)
            return False

        vec = await embed_text(composite_text)
        vec_str = "[" + ",".join(f"{v:.8f}" for v in vec) + "]"

        material.embedding = json.dumps(vec)
        db.execute(
            text("UPDATE materials SET embedding_vec = :vec WHERE id = :mid"),
            {"vec": vec_str, "mid": material.id},
        )
        db.commit()
        return True
    except Exception as e:
        logger.error("Failed to generate embedding for material %s: %s", material.id, e)
        db.rollback()
        return False


async def generate_all_embeddings(db: Session):
    """Background task: generate embeddings for all materials missing them."""
    materials = db.query(Material).filter(Material.embedding.is_(None)).all()
    logger.info("Generating embeddings for %d materials...", len(materials))

    batch_size = 16
    success = 0
    for i in range(0, len(materials), batch_size):
        batch = materials[i : i + batch_size]
        texts = [build_material_text(m) for m in batch]
        try:
            vecs = await embed_texts(texts)
            for mat, vec in zip(batch, vecs):
                vec_str = "[" + ",".join(f"{v:.8f}" for v in vec) + "]"
                mat.embedding = json.dumps(vec)
                db.execute(
                    text("UPDATE materials SET embedding_vec = :vec WHERE id = :mid"),
                    {"vec": vec_str, "mid": mat.id},
                )
            db.commit()
            success += len(batch)
        except Exception as e:
            logger.error("Batch embedding failed at offset %d: %s", i, e)
            db.rollback()

    logger.info("Embedding generation complete: %d/%d successful", success, len(materials))
    return success


@router.post("/generate")
async def trigger_generate_all(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Trigger embedding generation for all materials (admin/pmm only)."""
    if current_user.role not in ("admin", "pmm", "director") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admin/pmm/director can generate embeddings")

    total = db.query(Material).count()
    pending = db.query(Material).filter(Material.embedding.is_(None)).count()

    count = await generate_all_embeddings(db)
    return {
        "status": "completed",
        "total_materials": total,
        "newly_embedded": count,
        "already_embedded": total - pending,
    }


@router.post("/generate/{material_id}")
async def trigger_generate_single(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate embedding for a single material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    ok = await _generate_embedding_for_material(material, db)
    return {"status": "success" if ok else "failed", "material_id": material_id}


@router.get("/status")
async def embedding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Check how many materials have embeddings."""
    total = db.query(Material).count()
    embedded = db.query(Material).filter(Material.embedding.isnot(None)).count()
    return {
        "total_materials": total,
        "embedded": embedded,
        "pending": total - embedded,
        "coverage_pct": round(embedded / total * 100, 1) if total > 0 else 0,
    }
