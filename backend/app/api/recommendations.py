"""
Content recommendations API – personalised material suggestions for sales reps.

Strategy (blended):
  - Peer popularity  (40%): most shared by peers in last 30 days
  - Content similarity (40%): similar to user's recent shares (vector distance)
  - Trending          (20%): highest usage growth recently
"""
import logging
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material, MaterialStatus
from app.models.shared_link import SharedLink

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _material_to_dict(m, reason: str) -> dict:
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
        "tags": m.tags,
        "usage_count": m.usage_count,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "reason": reason,
    }


def _get_user_shared_material_ids(db: Session, user_id: int) -> set:
    """Get material IDs the user has already shared."""
    rows = (
        db.query(SharedLink.material_id)
        .filter(SharedLink.shared_by_user_id == user_id)
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def _peer_popular(db: Session, user: User, exclude_ids: set, limit: int) -> List[dict]:
    """Materials most shared by sales peers in the last 30 days that user hasn't shared."""
    cutoff = datetime.utcnow() - timedelta(days=30)

    q = (
        db.query(SharedLink.material_id, func.count(SharedLink.id).label("share_count"))
        .join(User, User.id == SharedLink.shared_by_user_id)
        .filter(
            User.role == "sales",
            SharedLink.shared_by_user_id != user.id,
            SharedLink.created_at >= cutoff,
        )
        .group_by(SharedLink.material_id)
        .order_by(desc("share_count"))
        .limit(limit * 2)
    )

    rows = q.all()
    mat_ids = [r[0] for r in rows if r[0] not in exclude_ids][:limit]

    if not mat_ids:
        return []

    materials = db.query(Material).filter(
        Material.id.in_(mat_ids),
        Material.status.notin_([MaterialStatus.DRAFT, MaterialStatus.ARCHIVED]),
    ).all()
    mat_map = {m.id: m for m in materials}

    return [
        _material_to_dict(mat_map[mid], "Popular with your peers")
        for mid in mat_ids
        if mid in mat_map
    ]


def _content_similar(db: Session, user: User, exclude_ids: set, limit: int) -> List[dict]:
    """Materials similar (vector distance) to user's recently shared materials."""
    recent_shares = (
        db.query(SharedLink.material_id)
        .filter(SharedLink.shared_by_user_id == user.id)
        .order_by(desc(SharedLink.created_at))
        .limit(5)
        .all()
    )
    recent_ids = [r[0] for r in recent_shares]
    if not recent_ids:
        return []

    # Get average embedding of user's recent shares
    rows = db.execute(
        text("""
            SELECT embedding_vec
            FROM materials
            WHERE id = ANY(:ids) AND embedding_vec IS NOT NULL
        """),
        {"ids": recent_ids},
    ).fetchall()

    if not rows:
        return []

    # Compute centroid using SQL AVG
    centroid_row = db.execute(
        text("""
            SELECT AVG(embedding_vec)::vector AS centroid
            FROM materials
            WHERE id = ANY(:ids) AND embedding_vec IS NOT NULL
        """),
        {"ids": recent_ids},
    ).fetchone()

    if not centroid_row or centroid_row[0] is None:
        return []

    centroid_str = str(centroid_row[0])

    all_exclude = list(exclude_ids | set(recent_ids))
    result_rows = db.execute(
        text("""
            SELECT id, 1 - (embedding_vec <=> CAST(:centroid AS vector)) AS similarity
            FROM materials
            WHERE embedding_vec IS NOT NULL
              AND id != ALL(:exclude)
              AND status NOT IN ('draft', 'archived')
            ORDER BY embedding_vec <=> CAST(:centroid AS vector)
            LIMIT :lim
        """),
        {"centroid": centroid_str, "exclude": all_exclude, "lim": limit},
    ).fetchall()

    mat_ids = [r[0] for r in result_rows]
    if not mat_ids:
        return []

    materials = db.query(Material).filter(Material.id.in_(mat_ids)).all()
    mat_map = {m.id: m for m in materials}

    return [
        _material_to_dict(mat_map[mid], "Similar to what you shared recently")
        for mid in mat_ids
        if mid in mat_map
    ]


def _trending(db: Session, exclude_ids: set, limit: int) -> List[dict]:
    """Materials with highest recent usage."""
    cutoff = datetime.utcnow() - timedelta(days=14)

    materials = (
        db.query(Material)
        .filter(
            Material.status.notin_([MaterialStatus.DRAFT, MaterialStatus.ARCHIVED]),
            Material.id.notin_(exclude_ids) if exclude_ids else True,
            Material.updated_at >= cutoff,
        )
        .order_by(desc(Material.usage_count))
        .limit(limit)
        .all()
    )

    return [_material_to_dict(m, "Trending this week") for m in materials]


@router.get("/for-you")
async def recommendations_for_you(
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Personalised content recommendations.
    Blends peer popularity, content similarity, and trending.
    """
    user_shared_ids = _get_user_shared_material_ids(db, current_user.id)

    peer_limit = max(1, int(limit * 0.4))
    similar_limit = max(1, int(limit * 0.4))
    trending_limit = max(1, limit - peer_limit - similar_limit)

    peer_results = _peer_popular(db, current_user, user_shared_ids, peer_limit)
    seen_ids = user_shared_ids | {r["id"] for r in peer_results}

    similar_results = _content_similar(db, current_user, seen_ids, similar_limit)
    seen_ids |= {r["id"] for r in similar_results}

    trending_results = _trending(db, seen_ids, trending_limit)

    combined = peer_results + similar_results + trending_results

    # If we have fewer results than requested, backfill with popular materials
    if len(combined) < limit:
        backfill_ids = {r["id"] for r in combined} | user_shared_ids
        backfill = (
            db.query(Material)
            .filter(
                Material.status.notin_([MaterialStatus.DRAFT, MaterialStatus.ARCHIVED]),
                Material.id.notin_(backfill_ids) if backfill_ids else True,
            )
            .order_by(desc(Material.usage_count))
            .limit(limit - len(combined))
            .all()
        )
        combined.extend([_material_to_dict(m, "Recommended for you") for m in backfill])

    return {
        "count": len(combined),
        "results": combined[:limit],
    }
