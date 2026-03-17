"""
Semantic search API – vector similarity search with pgvector, full-text fallback.
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material, MaterialStatus
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


def _material_to_dict(m, score: float = 0.0) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "material_type": m.material_type,
        "audience": m.audience,
        "product_name": m.product_name,
        "universe_name": m.universe_name,
        "description": m.description,
        "status": m.status.value if m.status else None,
        "file_format": m.file_format,
        "file_size": m.file_size,
        "tags": m.tags,
        "keywords": m.keywords,
        "use_cases": m.use_cases,
        "pain_points": m.pain_points,
        "usage_count": m.usage_count,
        "owner_id": m.owner_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "similarity_score": round(score, 4),
    }


@router.get("/semantic")
async def semantic_search(
    q: str = Query(..., min_length=1, description="Natural language search query"),
    limit: int = Query(default=10, ge=1, le=50),
    universe: Optional[str] = None,
    product: Optional[str] = None,
    material_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Semantic search over materials using vector similarity.
    Falls back to full-text search if embeddings are not available.
    """
    embedded_count = db.execute(
        text("SELECT count(*) FROM materials WHERE embedding_vec IS NOT NULL")
    ).scalar()

    if embedded_count and embedded_count > 0:
        results = await _vector_search(q, limit, universe, product, material_type, status, db)
        search_mode = "semantic"
    else:
        results = _fulltext_search(q, limit, universe, product, material_type, status, db)
        search_mode = "fulltext"

    return {
        "query": q,
        "mode": search_mode,
        "count": len(results),
        "results": results,
    }


async def _vector_search(
    query: str,
    limit: int,
    universe: Optional[str],
    product: Optional[str],
    material_type: Optional[str],
    status_filter: Optional[str],
    db: Session,
) -> List[dict]:
    """Perform vector cosine-similarity search via pgvector."""
    try:
        query_vec = await embed_text(query)
    except Exception as e:
        logger.error("Failed to embed query, falling back to fulltext: %s", e)
        return _fulltext_search(query, limit, universe, product, material_type, status_filter, db)

    vec_str = "[" + ",".join(f"{v:.8f}" for v in query_vec) + "]"

    where_clauses = ["embedding_vec IS NOT NULL"]
    params = {"qvec": vec_str, "lim": limit}

    if universe:
        where_clauses.append("universe_name ILIKE :universe")
        params["universe"] = f"%{universe}%"
    if product:
        where_clauses.append("product_name ILIKE :product")
        params["product"] = f"%{product}%"
    if material_type:
        where_clauses.append("material_type ILIKE :mtype")
        params["mtype"] = f"%{material_type}%"
    if status_filter:
        where_clauses.append("status = :status")
        params["status"] = status_filter
    else:
        where_clauses.append("status NOT IN ('draft', 'archived')")

    where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT id, 1 - (embedding_vec <=> CAST(:qvec AS vector)) AS similarity
        FROM materials
        WHERE {where_sql}
        ORDER BY embedding_vec <=> CAST(:qvec AS vector)
        LIMIT :lim
    """)

    rows = db.execute(sql, params).fetchall()
    if not rows:
        return _fulltext_search(query, limit, universe, product, material_type, status_filter, db)

    ids = [r[0] for r in rows]
    scores = {r[0]: float(r[1]) for r in rows}

    materials = db.query(Material).filter(Material.id.in_(ids)).all()
    mat_map = {m.id: m for m in materials}

    results = []
    for mid in ids:
        m = mat_map.get(mid)
        if m:
            results.append(_material_to_dict(m, scores.get(mid, 0)))
    return results


def _fulltext_search(
    query: str,
    limit: int,
    universe: Optional[str],
    product: Optional[str],
    material_type: Optional[str],
    status_filter: Optional[str],
    db: Session,
) -> List[dict]:
    """Fallback: PostgreSQL full-text search using tsvector."""
    where_clauses = ["search_tsv @@ plainto_tsquery('english', :q)"]
    params = {"q": query, "lim": limit}

    if universe:
        where_clauses.append("universe_name ILIKE :universe")
        params["universe"] = f"%{universe}%"
    if product:
        where_clauses.append("product_name ILIKE :product")
        params["product"] = f"%{product}%"
    if material_type:
        where_clauses.append("material_type ILIKE :mtype")
        params["mtype"] = f"%{material_type}%"
    if status_filter:
        where_clauses.append("status = :status")
        params["status"] = status_filter
    else:
        where_clauses.append("status NOT IN ('draft', 'archived')")

    where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT id, ts_rank(search_tsv, plainto_tsquery('english', :q)) AS rank
        FROM materials
        WHERE {where_sql}
        ORDER BY rank DESC
        LIMIT :lim
    """)

    rows = db.execute(sql, params).fetchall()

    if not rows:
        return _ilike_fallback(query, limit, universe, product, material_type, status_filter, db)

    ids = [r[0] for r in rows]
    scores = {r[0]: float(r[1]) for r in rows}

    materials = db.query(Material).filter(Material.id.in_(ids)).all()
    mat_map = {m.id: m for m in materials}

    results = []
    for mid in ids:
        m = mat_map.get(mid)
        if m:
            results.append(_material_to_dict(m, scores.get(mid, 0)))
    return results


def _ilike_fallback(
    query: str,
    limit: int,
    universe: Optional[str],
    product: Optional[str],
    material_type: Optional[str],
    status_filter: Optional[str],
    db: Session,
) -> List[dict]:
    """Last-resort ilike search when tsvector has no matches."""
    q = db.query(Material)

    kw = f"%{query}%"
    q = q.filter(
        or_(
            Material.name.ilike(kw),
            Material.description.ilike(kw),
            Material.product_name.ilike(kw),
            Material.tags.ilike(kw),
            Material.keywords.ilike(kw),
            Material.use_cases.ilike(kw),
            Material.pain_points.ilike(kw),
            Material.executive_summary.ilike(kw),
        )
    )

    if universe:
        q = q.filter(Material.universe_name.ilike(f"%{universe}%"))
    if product:
        q = q.filter(Material.product_name.ilike(f"%{product}%"))
    if material_type:
        q = q.filter(Material.material_type.ilike(f"%{material_type}%"))
    if status_filter:
        q = q.filter(Material.status == status_filter)
    else:
        q = q.filter(Material.status.notin_(["draft", "archived"]))

    materials = q.limit(limit).all()
    return [_material_to_dict(m, 0.0) for m in materials]
