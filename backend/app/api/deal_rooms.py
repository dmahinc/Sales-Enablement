"""
Deal Rooms (Digital Sales Rooms) API - branded microsites per opportunity
"""
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.models.persona import Persona
from app.models.deal_room import DealRoom, DealRoomMaterial, ActionPlanItem, RoomMessage
from app.models.usage import MaterialUsage, UsageAction
from app.schemas.deal_room import (
    DealRoomCreate,
    DealRoomUpdate,
    DealRoomResponse,
    DealRoomPublicResponse,
    DealRoomMaterialCreate,
    DealRoomMaterialUpdate,
    ActionPlanItemCreate,
    ActionPlanItemUpdate,
    ActionPlanStatusUpdate,
    RoomMessageCreate,
    RoomMessageResponse,
    RoomMaterialResponse,
    ActionPlanItemResponse,
)
from app.services.storage import storage_service
from app.core.config import settings

DEAL_ROOM_LOGOS_DIR = Path(settings.STORAGE_PATH) / "deal_room_logos"
DEAL_ROOM_LOGOS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/deal-rooms", tags=["deal-rooms"])

# Journey-based section order (frontend should use same order when rendering)
JOURNEY_SECTIONS = [
    "1. Problem & Business Case",
    "2. Solution Walkthrough",
    "3. Validation",
    "4. Commercials & Legal",
    "All Materials",
]


def _get_room_url(token: str) -> str:
    platform_url = getattr(settings, "PLATFORM_URL", "http://localhost:3003")
    return f"{platform_url.rstrip('/')}/room/{token}"


def _can_access_room(room: DealRoom, user: User) -> bool:
    """Check if user can access this deal room (for confidential content)."""
    if user.role in ("admin", "director", "pmm"):
        return True
    if user.role == "sales" and room.created_by_user_id == user.id:
        return True
    if user.role == "customer" and room.customer_email:
        return room.customer_email.strip().lower() == user.email.strip().lower()
    return False


def _ensure_sales_or_above(user: User):
    if user.role not in ("sales", "pmm", "director", "admin") and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Only sales, PMM, director, or admin can manage deal rooms")


# --- Authenticated CRUD ---

@router.post("", response_model=DealRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_deal_room(
    data: DealRoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new Digital Sales Room."""
    _ensure_sales_or_above(current_user)

    token = DealRoom.generate_token()
    while db.query(DealRoom).filter(DealRoom.unique_token == token).first():
        token = DealRoom.generate_token()

    expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    room = DealRoom(
        unique_token=token,
        name=data.name,
        description=data.description,
        created_by_user_id=current_user.id,
        customer_email=data.customer_email,
        customer_name=data.customer_name,
        company_name=data.company_name,
        opportunity_name=data.opportunity_name,
        welcome_message=data.welcome_message,
        executive_summary=getattr(data, "executive_summary", None),
        welcome_video_url=getattr(data, "welcome_video_url", None),
        expires_at=expires_at,
        is_active=True,
    )
    db.add(room)
    db.flush()

    for i, m in enumerate(data.materials):
        mat = db.query(Material).filter(Material.id == m.material_id).first()
        if not mat:
            raise HTTPException(status_code=404, detail=f"Material {m.material_id} not found")
        if mat.status != "published":
            raise HTTPException(status_code=400, detail=f"Material '{mat.name}' must be published")
        rm = DealRoomMaterial(
            deal_room_id=room.id,
            material_id=m.material_id,
            persona_id=m.persona_id,
            section_name=m.section_name,
            display_order=m.display_order or i,
        )
        db.add(rm)

    for i, ap in enumerate(data.action_plan):
        api = ActionPlanItem(
            deal_room_id=room.id,
            title=ap.title,
            description=ap.description,
            due_date=ap.due_date,
            status=ap.status,
            assignee=ap.assignee,
            display_order=ap.display_order or i,
        )
        db.add(api)

    db.commit()
    db.refresh(room)
    return _room_to_response(room, db)


@router.get("", response_model=List[DealRoomResponse])
async def list_deal_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List deal rooms (sales see own, PMM/director/admin see all)."""
    _ensure_sales_or_above(current_user)

    q = db.query(DealRoom)
    if current_user.role == "sales":
        q = q.filter(DealRoom.created_by_user_id == current_user.id)
    rooms = q.order_by(DealRoom.created_at.desc()).all()
    return [_room_to_response(r, db) for r in rooms]


@router.get("/{room_id}", response_model=DealRoomResponse)
async def get_deal_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a deal room by ID."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _room_to_response(room, db)


@router.put("/{room_id}", response_model=DealRoomResponse)
async def update_deal_room(
    room_id: int,
    data: DealRoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a deal room."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.name is not None:
        room.name = data.name
    if data.description is not None:
        room.description = data.description
    if data.customer_email is not None:
        room.customer_email = data.customer_email
    if data.customer_name is not None:
        room.customer_name = data.customer_name
    if data.company_name is not None:
        room.company_name = data.company_name
    if data.opportunity_name is not None:
        room.opportunity_name = data.opportunity_name
    if data.welcome_message is not None:
        room.welcome_message = data.welcome_message
    if getattr(data, "executive_summary", None) is not None:
        room.executive_summary = data.executive_summary
    if getattr(data, "welcome_video_url", None) is not None:
        room.welcome_video_url = data.welcome_video_url
    if getattr(data, "customer_logo_url", None) is not None:
        room.customer_logo_url = data.customer_logo_url
    if data.is_active is not None:
        room.is_active = data.is_active
    if data.expires_in_days is not None:
        room.expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

    db.commit()
    db.refresh(room)
    return _room_to_response(room, db)


@router.post("/{room_id}/logo", response_model=DealRoomResponse)
async def upload_room_logo(
    room_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload or replace customer logo for deal room header. PNG, JPEG, GIF, WebP. Max 2MB."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    allowed = (".png", ".jpg", ".jpeg", ".gif", ".webp")
    ext = "." + (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else ""
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed formats: {', '.join(allowed)}")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    # Remove old logo file if exists
    if room.customer_logo_url:
        old_name = room.customer_logo_url.split("/")[-1] if "/" in (room.customer_logo_url or "") else None
        if old_name and old_name.startswith("room_"):
            old_path = DEAL_ROOM_LOGOS_DIR / old_name
            if old_path.exists():
                old_path.unlink(missing_ok=True)
    filename = f"room_{room.id}{ext}"
    path = DEAL_ROOM_LOGOS_DIR / filename
    path.write_bytes(content)
    room.customer_logo_url = f"/api/deal-room-logos/{filename}"
    db.commit()
    db.refresh(room)
    return _room_to_response(room, db)


@router.delete("/{room_id}/logo", response_model=DealRoomResponse)
async def remove_room_logo(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove customer logo from deal room header."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    if room.customer_logo_url:
        old_name = room.customer_logo_url.split("/")[-1] if "/" in (room.customer_logo_url or "") else None
        if old_name and old_name.startswith("room_"):
            old_path = DEAL_ROOM_LOGOS_DIR / old_name
            if old_path.exists():
                old_path.unlink(missing_ok=True)
    room.customer_logo_url = None
    db.commit()
    db.refresh(room)
    return _room_to_response(room, db)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Deactivate a deal room (soft delete by setting is_active=False)."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    room.is_active = False
    db.commit()


# --- Materials & Action Plan ---

@router.post("/{room_id}/materials", response_model=RoomMaterialResponse, status_code=status.HTTP_201_CREATED)
async def add_room_material(
    room_id: int,
    data: DealRoomMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a material to a deal room."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    mat = db.query(Material).filter(Material.id == data.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    if mat.status != "published":
        raise HTTPException(status_code=400, detail="Material must be published")
    rm = DealRoomMaterial(
        deal_room_id=room.id,
        material_id=data.material_id,
        persona_id=data.persona_id,
        section_name=data.section_name,
        display_order=data.display_order,
    )
    db.add(rm)
    db.commit()
    db.refresh(rm)
    return _room_material_to_response(rm, db)


@router.patch("/{room_id}/materials/{material_id}", response_model=RoomMaterialResponse)
async def update_room_material(
    room_id: int,
    material_id: int,
    data: DealRoomMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a material's section, persona, or display order in a deal room."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    rm = db.query(DealRoomMaterial).filter(
        DealRoomMaterial.deal_room_id == room.id,
        DealRoomMaterial.material_id == material_id,
    ).first()
    if not rm:
        raise HTTPException(status_code=404, detail="Material not in this room")
    if data.section_name is not None:
        rm.section_name = data.section_name
    if data.persona_id is not None:
        rm.persona_id = data.persona_id
    if data.display_order is not None:
        rm.display_order = data.display_order
    db.commit()
    db.refresh(rm)
    return _room_material_to_response(rm, db)


@router.delete("/{room_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_room_material(
    room_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove a material from a deal room."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    rm = db.query(DealRoomMaterial).filter(
        DealRoomMaterial.deal_room_id == room.id,
        DealRoomMaterial.material_id == material_id,
    ).first()
    if rm:
        db.delete(rm)
        db.commit()


@router.post("/{room_id}/action-plan", response_model=ActionPlanItemResponse, status_code=status.HTTP_201_CREATED)
async def add_action_plan_item(
    room_id: int,
    data: ActionPlanItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add an action plan milestone."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    api = ActionPlanItem(
        deal_room_id=room.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status=data.status,
        assignee=data.assignee,
        display_order=data.display_order,
    )
    db.add(api)
    db.commit()
    db.refresh(api)
    return _action_plan_to_response(api)


def _can_update_action_plan_item(room: DealRoom, item: ActionPlanItem, user: User) -> bool:
    """Customer can update only when assignee is customer/both; sales/pmm/director/admin have full access."""
    if user.role in ("pmm", "director", "admin") or user.is_superuser:
        return True
    if user.role == "sales" and room.created_by_user_id == user.id:
        return True
    if user.role == "customer" and room.customer_email and room.customer_email.lower() == user.email.lower():
        return item.assignee in ("customer", "both")
    return False


@router.patch("/{room_id}/action-plan/{item_id}/status", response_model=ActionPlanItemResponse)
async def update_action_plan_item_status(
    room_id: int,
    item_id: int,
    data: ActionPlanStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update action plan item status. Customers can mark complete when assignee is customer/both."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not room.is_valid():
        raise HTTPException(status_code=404, detail="Deal room expired or deactivated")

    item = db.query(ActionPlanItem).filter(
        ActionPlanItem.deal_room_id == room.id,
        ActionPlanItem.id == item_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Action plan item not found")

    if not _can_update_action_plan_item(room, item, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update this item")

    item.status = data.status
    db.commit()
    db.refresh(item)
    return _action_plan_to_response(item)


@router.put("/{room_id}/action-plan/{item_id}", response_model=ActionPlanItemResponse)
async def update_action_plan_item(
    room_id: int,
    item_id: int,
    data: ActionPlanItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an action plan item."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    api = db.query(ActionPlanItem).filter(
        ActionPlanItem.deal_room_id == room.id,
        ActionPlanItem.id == item_id,
    ).first()
    if not api:
        raise HTTPException(status_code=404, detail="Action plan item not found")
    if data.title is not None:
        api.title = data.title
    if data.description is not None:
        api.description = data.description
    if data.due_date is not None:
        api.due_date = data.due_date
    if data.status is not None:
        api.status = data.status
    if data.assignee is not None:
        api.assignee = data.assignee
    if data.display_order is not None:
        api.display_order = data.display_order
    db.commit()
    db.refresh(api)
    return _action_plan_to_response(api)


@router.delete("/{room_id}/action-plan/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action_plan_item(
    room_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an action plan item."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    api = db.query(ActionPlanItem).filter(
        ActionPlanItem.deal_room_id == room.id,
        ActionPlanItem.id == item_id,
    ).first()
    if api:
        db.delete(api)
        db.commit()


# --- Messaging ---

@router.get("/{room_id}/messages", response_model=List[RoomMessageResponse])
async def get_room_messages(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get messages in a deal room (sales or customer with access)."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    # Sales: creator; Customer: must match customer_email
    if current_user.role == "sales":
        if room.created_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "customer":
        if room.customer_email and room.customer_email.lower() != current_user.email.lower():
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        _ensure_sales_or_above(current_user)

    msgs = db.query(RoomMessage).filter(RoomMessage.deal_room_id == room.id).order_by(RoomMessage.created_at).all()
    return [
        RoomMessageResponse(
            id=m.id,
            message=m.message,
            sent_by_customer=m.sent_by_customer,
            is_read=m.is_read,
            created_at=m.created_at,
            sender_name=m.sender.full_name or m.sender.email if m.sender else None,
        )
        for m in msgs
    ]


@router.post("/{room_id}/messages", response_model=RoomMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_room_message(
    room_id: int,
    data: RoomMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message in a deal room."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not room.is_valid():
        raise HTTPException(status_code=404, detail="Deal room expired or deactivated")

    sent_by_customer = current_user.role == "customer"
    if sent_by_customer:
        if room.customer_email and room.customer_email.lower() != current_user.email.lower():
            raise HTTPException(status_code=403, detail="Not authorized for this room")
    else:
        _ensure_sales_or_above(current_user)
        if room.created_by_user_id != current_user.id and current_user.role == "sales":
            raise HTTPException(status_code=403, detail="Not authorized")

    msg = RoomMessage(
        deal_room_id=room.id,
        sender_user_id=current_user.id,
        message=data.message,
        sent_by_customer=sent_by_customer,
        parent_message_id=data.parent_message_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return RoomMessageResponse(
        id=msg.id,
        message=msg.message,
        sent_by_customer=msg.sent_by_customer,
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender_name=current_user.full_name or current_user.email,
    )


# --- Room view by token (auth required - confidential) ---

@router.get(
    "/token/{token}",
    response_model=DealRoomPublicResponse,
    summary="Get Deal Room by Token",
)
async def get_room_by_token(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get deal room by token. Requires login - room is confidential."""
    room = db.query(DealRoom).filter(DealRoom.unique_token == token).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    if not room.is_valid():
        raise HTTPException(status_code=404, detail="Room not found or expired")
    if not _can_access_room(room, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this room")

    room.record_access()
    db.commit()

    # Group materials by section
    sections: dict = {}
    for rm in room.room_materials:
        sec = rm.section_name or "All Materials"
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(_room_material_to_response(rm, db))
    for sec in sections:
        sections[sec] = sorted(sections[sec], key=lambda x: x.display_order)

    # Order sections: journey first, then custom (for deterministic JSON key order)
    ordered_sections = {}
    for sec in JOURNEY_SECTIONS:
        if sec in sections:
            ordered_sections[sec] = sections[sec]
    for sec in sorted(sections.keys()):
        if sec not in ordered_sections:
            ordered_sections[sec] = sections[sec]

    return DealRoomPublicResponse(
        id=room.id,
        unique_token=room.unique_token,
        name=room.name,
        description=room.description,
        company_name=room.company_name,
        welcome_message=room.welcome_message,
        executive_summary=getattr(room, "executive_summary", None),
        welcome_video_url=getattr(room, "welcome_video_url", None),
        customer_logo_url=getattr(room, "customer_logo_url", None),
        expires_at=room.expires_at,
        room_url=_get_room_url(token),
        materials_by_section=ordered_sections,
        action_plan=[_action_plan_to_response(a) for a in room.action_plan_items],
    )


@router.get("/token/{token}/materials/{material_id}/download")
async def download_room_material(
    token: str,
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download a material from a deal room. Requires login."""
    room = db.query(DealRoom).filter(DealRoom.unique_token == token).first()
    if not room or not room.is_valid():
        raise HTTPException(status_code=404, detail="Room not found or expired")
    if not _can_access_room(room, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this room")

    rm = db.query(DealRoomMaterial).filter(
        DealRoomMaterial.deal_room_id == room.id,
        DealRoomMaterial.material_id == material_id,
    ).first()
    if not rm:
        raise HTTPException(status_code=404, detail="Material not in this room")

    material = db.query(Material).filter(Material.id == material_id).first()
    if not material or not material.file_path:
        raise HTTPException(status_code=404, detail="File not available")

    # Track download
    try:
        usage = MaterialUsage(
            material_id=material.id,
            user_id=room.created_by_user_id,
            action=UsageAction.DOWNLOAD.value,
            used_at=datetime.utcnow(),
            deal_room_id=room.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(usage)
        material.usage_count = (material.usage_count or 0) + 1
    except Exception:
        pass
    db.commit()

    file_path = storage_service.get_file_path(material.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    file_format = material.file_format or (material.file_name.split(".")[-1] if material.file_name else "")
    media_type_map = {
        "pdf": "application/pdf",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    media_type = media_type_map.get(file_format.lower(), "application/octet-stream")
    filename = material.file_name or f"material_{material.id}.{file_format}"

    return FileResponse(path=str(file_path), filename=filename, media_type=media_type)


@router.get("/token/{token}/materials/{material_id}/thumbnail")
async def thumbnail_room_material(
    token: str,
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get pre-generated thumbnail for material in room. Requires login."""
    from fastapi.responses import FileResponse
    from app.services.thumbnail_service import ensure_thumbnail

    room = db.query(DealRoom).filter(DealRoom.unique_token == token).first()
    if not room or not room.is_valid():
        raise HTTPException(status_code=404, detail="Room not found or expired")
    if not _can_access_room(room, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this room")

    rm = db.query(DealRoomMaterial).filter(
        DealRoomMaterial.deal_room_id == room.id,
        DealRoomMaterial.material_id == material_id,
    ).first()
    if not rm:
        raise HTTPException(status_code=404, detail="Material not in this room")

    material = db.query(Material).filter(Material.id == material_id).first()
    if not material or not material.file_path:
        raise HTTPException(status_code=404, detail="File not available")

    file_path = storage_service.get_file_path(material.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_format = material.file_format or (material.file_name.split(".")[-1] if material.file_name else "")
    thumb_path = ensure_thumbnail(material.id, file_path, file_format)

    if not thumb_path or not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not available")

    return FileResponse(
        path=str(thumb_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/token/{token}/materials/{material_id}/view")
async def view_room_material(
    token: str,
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """View a material in browser (stream with inline disposition). Requires login. Records view event."""
    room = db.query(DealRoom).filter(DealRoom.unique_token == token).first()
    if not room or not room.is_valid():
        raise HTTPException(status_code=404, detail="Room not found or expired")
    if not _can_access_room(room, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this room")

    rm = db.query(DealRoomMaterial).filter(
        DealRoomMaterial.deal_room_id == room.id,
        DealRoomMaterial.material_id == material_id,
    ).first()
    if not rm:
        raise HTTPException(status_code=404, detail="Material not in this room")

    material = db.query(Material).filter(Material.id == material_id).first()
    if not material or not material.file_path:
        raise HTTPException(status_code=404, detail="File not available")

    # Track view (user_id required; use room creator when available)
    try:
        if room.created_by_user_id is not None:
            usage = MaterialUsage(
                material_id=material.id,
                user_id=room.created_by_user_id,
                action=UsageAction.VIEW.value,
                used_at=datetime.utcnow(),
                deal_room_id=room.id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            db.add(usage)
        material.usage_count = (material.usage_count or 0) + 1
    except Exception:
        pass
    db.commit()

    file_path = storage_service.get_file_path(material.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    file_format = material.file_format or (material.file_name.split(".")[-1] if material.file_name else "")
    media_type_map = {
        "pdf": "application/pdf",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    media_type = media_type_map.get(file_format.lower(), "application/octet-stream")
    filename = material.file_name or f"material_{material.id}.{file_format}"

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# --- Analytics ---

@router.get("/{room_id}/analytics")
async def get_room_analytics(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get engagement analytics for a deal room."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Material views/downloads from MaterialUsage with deal_room_id
    from sqlalchemy import case
    mat_stats = (
        db.query(
            MaterialUsage.material_id,
            func.sum(case((MaterialUsage.action == "view", 1), else_=0)).label("views"),
            func.sum(case((MaterialUsage.action == "download", 1), else_=0)).label("downloads"),
        )
        .filter(MaterialUsage.deal_room_id == room.id)
        .group_by(MaterialUsage.material_id)
        .all()
    )
    material_views = []
    total_downloads = 0
    for row in mat_stats:
        mat = db.query(Material).filter(Material.id == row.material_id).first()
        v = int(row.views or 0)
        d = int(row.downloads or 0)
        total_downloads += d
        material_views.append({
            "material_id": row.material_id,
            "material_name": mat.name if mat else "Unknown",
            "views": v,
            "downloads": d,
        })

    return {
        "room_id": room.id,
        "room_name": room.name,
        "access_count": room.access_count,
        "unique_visitors": room.unique_visitors,
        "last_accessed_at": room.last_accessed_at,
        "material_views": material_views,
        "total_downloads": total_downloads,
    }


# --- Helpers ---

def _get_room_for_edit(room_id: int, user: User, db: Session) -> DealRoom:
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if user.role == "sales" and room.created_by_user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return room


def _room_material_to_response(rm: DealRoomMaterial, db: Session) -> RoomMaterialResponse:
    mat = rm.material
    persona = db.query(Persona).filter(Persona.id == rm.persona_id).first() if rm.persona_id else None
    return RoomMaterialResponse(
        id=rm.id,
        material_id=rm.material_id,
        material_name=mat.name if mat else "",
        material_type=mat.material_type if mat else None,
        file_name=mat.file_name if mat else None,
        file_format=mat.file_format if mat else None,
        persona_id=rm.persona_id,
        persona_name=persona.name if persona else None,
        section_name=rm.section_name,
        display_order=rm.display_order,
    )


def _action_plan_to_response(api: ActionPlanItem) -> ActionPlanItemResponse:
    return ActionPlanItemResponse(
        id=api.id,
        title=api.title,
        description=api.description,
        due_date=api.due_date,
        status=api.status,
        assignee=api.assignee,
        display_order=api.display_order,
    )


def _room_to_response(room: DealRoom, db: Session) -> DealRoomResponse:
    materials = [_room_material_to_response(rm, db) for rm in room.room_materials]
    action_plan = [_action_plan_to_response(a) for a in room.action_plan_items]
    return DealRoomResponse(
        id=room.id,
        unique_token=room.unique_token,
        name=room.name,
        description=room.description,
        customer_email=room.customer_email,
        customer_name=room.customer_name,
        company_name=room.company_name,
        opportunity_name=room.opportunity_name,
        welcome_message=room.welcome_message,
        executive_summary=getattr(room, "executive_summary", None),
        welcome_video_url=getattr(room, "welcome_video_url", None),
        customer_logo_url=getattr(room, "customer_logo_url", None),
        expires_at=room.expires_at,
        is_active=room.is_active,
        access_count=room.access_count,
        last_accessed_at=room.last_accessed_at,
        unique_visitors=room.unique_visitors,
        created_at=room.created_at,
        room_url=_get_room_url(room.unique_token),
        materials=materials,
        action_plan=action_plan,
    )
