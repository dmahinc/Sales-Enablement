"""
Narrative Discovery API endpoints – enhanced with semantic search.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text as sa_text
from app.models.material import Material
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


async def _try_semantic(keywords: str, limit: int, db: Session):
    """Attempt semantic search, returns list of (material_id, score) or None."""
    try:
        embedded_count = db.execute(
            sa_text("SELECT count(*) FROM materials WHERE embedding_vec IS NOT NULL")
        ).scalar()
        if not embedded_count or embedded_count == 0:
            return None

        from app.services.embedding_service import embed_text
        qvec = await embed_text(keywords)
        vec_str = "[" + ",".join(f"{v:.8f}" for v in qvec) + "]"

        rows = db.execute(
            sa_text("""
                SELECT id, 1 - (embedding_vec <=> CAST(:qvec AS vector)) AS similarity
                FROM materials
                WHERE embedding_vec IS NOT NULL
                  AND status NOT IN ('draft', 'archived')
                ORDER BY embedding_vec <=> CAST(:qvec AS vector)
                LIMIT :lim
            """),
            {"qvec": vec_str, "lim": limit},
        ).fetchall()
        return [(r[0], float(r[1])) for r in rows] if rows else None
    except Exception as e:
        logger.debug("Semantic search unavailable, falling back to keyword: %s", e)
        return None


@router.get("/search")
async def search_narratives(
    keywords: Optional[str] = None,
    use_case: Optional[str] = None,
    pain_point: Optional[str] = None,
    product_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for narratives/materials by keywords, use cases, pain points.
    Uses semantic (vector) search when embeddings are available, falls back to keyword matching."""

    # Try semantic search first if a free-text query is provided
    if keywords and not use_case and not pain_point and not product_name:
        semantic_hits = await _try_semantic(keywords, limit, db)
        if semantic_hits:
            ids = [h[0] for h in semantic_hits]
            scores = {h[0]: h[1] for h in semantic_hits}
            materials = db.query(Material).filter(Material.id.in_(ids)).all()
            mat_map = {m.id: m for m in materials}

            results = []
            for mid in ids:
                m = mat_map.get(mid)
                if not m:
                    continue
                keywords_list = json.loads(m.keywords) if m.keywords else []
                use_cases_list = json.loads(m.use_cases) if m.use_cases else []
                pain_points_list = json.loads(m.pain_points) if m.pain_points else []
                tags_list = json.loads(m.tags) if m.tags else []
                results.append({
                    "material_id": m.id,
                    "name": m.name,
                    "material_type": m.material_type,
                    "product_name": m.product_name,
                    "universe_name": m.universe_name,
                    "description": m.description,
                    "keywords": keywords_list,
                    "use_cases": use_cases_list,
                    "pain_points": pain_points_list,
                    "tags": tags_list,
                    "usage_count": m.usage_count or 0,
                    "health_score": m.health_score or 0,
                    "similarity_score": round(scores.get(mid, 0), 4),
                })

            return {
                "results": results,
                "total": len(results),
                "skip": 0,
                "limit": limit,
                "search_mode": "semantic",
            }

    # Keyword fallback
    query = db.query(Material)
    filters = []

    if keywords:
        keyword_filter = or_(
            Material.name.ilike(f"%{keywords}%"),
            Material.description.ilike(f"%{keywords}%"),
            Material.keywords.ilike(f"%{keywords}%"),
            Material.tags.ilike(f"%{keywords}%"),
            Material.executive_summary.ilike(f"%{keywords}%"),
        )
        filters.append(keyword_filter)

    if use_case:
        filters.append(Material.use_cases.ilike(f"%{use_case}%"))

    if pain_point:
        filters.append(Material.pain_points.ilike(f"%{pain_point}%"))

    if product_name:
        filters.append(Material.product_name.ilike(f"%{product_name}%"))

    if filters:
        query = query.filter(and_(*filters))

    query = query.filter(Material.status.in_(["published", "high_usage"]))
    materials = query.offset(skip).limit(limit).all()

    results = []
    for material in materials:
        keywords_list = json.loads(material.keywords) if material.keywords else []
        use_cases_list = json.loads(material.use_cases) if material.use_cases else []
        pain_points_list = json.loads(material.pain_points) if material.pain_points else []
        tags_list = json.loads(material.tags) if material.tags else []

        results.append({
            "material_id": material.id,
            "name": material.name,
            "material_type": material.material_type,
            "product_name": material.product_name,
            "universe_name": material.universe_name,
            "description": material.description,
            "keywords": keywords_list,
            "use_cases": use_cases_list,
            "pain_points": pain_points_list,
            "tags": tags_list,
            "usage_count": material.usage_count or 0,
            "health_score": material.health_score or 0,
        })

    return {
        "results": results,
        "total": len(results),
        "skip": skip,
        "limit": limit,
        "search_mode": "keyword",
    }

@router.get("/by-use-case/{use_case}")
async def get_materials_by_use_case(
    use_case: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get materials for a specific use case"""
    query = db.query(Material).filter(
        Material.use_cases.ilike(f"%{use_case}%"),
        Material.status.in_(["published", "high_usage"])
    )
    
    materials = query.offset(skip).limit(limit).all()
    
    return {
        "use_case": use_case,
        "materials": [
            {
                "material_id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "product_name": m.product_name,
                "description": m.description
            }
            for m in materials
        ]
    }

@router.get("/by-pain-point/{pain_point}")
async def get_materials_by_pain_point(
    pain_point: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get materials for a specific pain point"""
    query = db.query(Material).filter(
        Material.pain_points.ilike(f"%{pain_point}%"),
        Material.status.in_(["published", "high_usage"])
    )
    
    materials = query.offset(skip).limit(limit).all()
    
    return {
        "pain_point": pain_point,
        "materials": [
            {
                "material_id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "product_name": m.product_name,
                "description": m.description
            }
            for m in materials
        ]
    }

@router.post("/material/{material_id}/tag")
async def tag_material(
    material_id: int,
    tags: List[str],
    keywords: Optional[List[str]] = None,
    use_cases: Optional[List[str]] = None,
    pain_points: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tag a material for discovery"""
    import json
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update tags
    if tags:
        material.tags = json.dumps(tags)
    if keywords:
        material.keywords = json.dumps(keywords)
    if use_cases:
        material.use_cases = json.dumps(use_cases)
    if pain_points:
        material.pain_points = json.dumps(pain_points)
    
    db.commit()
    db.refresh(material)
    
    return material
