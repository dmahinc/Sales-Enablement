"""
Deal Room Templates API - reusable DSR structures
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.deal_room import DealRoom, DealRoomMaterial, ActionPlanItem
from app.models.material import Material
from app.models.deal_room_template import DealRoomTemplate
from app.schemas.deal_room import (
    DealRoomTemplateResponse,
    DealRoomTemplateCreate,
    DealRoomCreate,
    DealRoomMaterialCreate,
    ActionPlanItemCreate,
    DealRoomResponse,
)
from app.api.deal_rooms import _ensure_sales_or_above, _room_to_response, JOURNEY_SECTIONS

router = APIRouter(prefix="/api/deal-rooms", tags=["deal-rooms"])


def _template_to_response(t: DealRoomTemplate) -> DealRoomTemplateResponse:
    return DealRoomTemplateResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        thumbnail_url=t.thumbnail_url,
        welcome_message=t.welcome_message,
        executive_summary=t.executive_summary,
        welcome_video_url=t.welcome_video_url,
        materials_json=t.materials_json,
        action_plan_json=t.action_plan_json,
    )


@router.get("/templates", response_model=List[DealRoomTemplateResponse])
async def list_templates(
    search: Optional[str] = Query(None, description="Search by name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List deal room templates."""
    _ensure_sales_or_above(current_user)
    q = db.query(DealRoomTemplate)
    if search and search.strip():
        q = q.filter(DealRoomTemplate.name.ilike(f"%{search.strip()}%"))
    templates = q.order_by(DealRoomTemplate.name).all()
    return [_template_to_response(t) for t in templates]


@router.post("/templates", response_model=DealRoomTemplateResponse, status_code=201)
async def create_template(
    data: DealRoomTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new deal room template."""
    _ensure_sales_or_above(current_user)
    t = DealRoomTemplate(
        name=data.name,
        description=data.description,
        welcome_message=data.welcome_message,
        executive_summary=data.executive_summary,
        welcome_video_url=data.welcome_video_url,
        materials_json=data.materials_json,
        action_plan_json=data.action_plan_json,
        created_by_user_id=current_user.id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _template_to_response(t)


@router.post("/from-template", response_model=DealRoomResponse, status_code=201)
async def create_room_from_template(
    template_id: int,
    name: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new deal room from a template."""
    _ensure_sales_or_above(current_user)
    template = db.query(DealRoomTemplate).filter(DealRoomTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    import secrets
    token = DealRoom.generate_token()
    while db.query(DealRoom).filter(DealRoom.unique_token == token).first():
        token = DealRoom.generate_token()

    expires_at = datetime.utcnow() + timedelta(days=90)
    room = DealRoom(
        unique_token=token,
        name=name,
        welcome_message=template.welcome_message,
        executive_summary=template.executive_summary,
        welcome_video_url=template.welcome_video_url,
        expires_at=expires_at,
        is_active=True,
        created_by_user_id=current_user.id,
    )
    db.add(room)
    db.flush()

    materials_json = template.materials_json or []
    for i, m in enumerate(materials_json):
        mat = db.query(Material).filter(Material.id == m.get("material_id")).first()
        if mat and mat.status == "published":
            rm = DealRoomMaterial(
                deal_room_id=room.id,
                material_id=mat.id,
                section_name=m.get("section_name"),
                display_order=m.get("display_order", i),
            )
            db.add(rm)

    action_plan_json = template.action_plan_json or []
    for i, ap in enumerate(action_plan_json):
        due = ap.get("due_date")
        due_date = datetime.fromisoformat(due.replace("Z", "+00:00")) if isinstance(due, str) and due else None
        item = ActionPlanItem(
            deal_room_id=room.id,
            title=ap.get("title", "New milestone"),
            description=ap.get("description"),
            due_date=due_date,
            status=ap.get("status", "pending"),
            assignee=ap.get("assignee"),
            display_order=ap.get("display_order", i),
        )
        db.add(item)

    db.commit()
    db.refresh(room)
    return _room_to_response(room, db)
