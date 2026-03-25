"""
Deal Rooms (Digital Sales Rooms) API - branded microsites per opportunity
"""
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.models.persona import Persona
from app.models.deal_room import DealRoom, DealRoomMaterial, DealRoomParticipant, ActionPlanItem, RoomMessage
from app.models.usage import MaterialUsage, UsageAction
from app.schemas.deal_room import (
    DealRoomCreate,
    DealRoomUpdate,
    DealRoomResponse,
    DealRoomPublicResponse,
    DealRoomShareRequest,
    DealRoomMaterialCreate,
    DealRoomMaterialUpdate,
    ActionPlanItemCreate,
    ActionPlanItemUpdate,
    ActionPlanStatusUpdate,
    RoomMessageCreate,
    RoomMessageResponse,
    RoomMaterialResponse,
    ActionPlanItemResponse,
    DealRoomParticipantCreate,
    DealRoomParticipantUpdate,
    DealRoomParticipantResponse,
    DealRoomInviteCustomerCandidate,
    RoomPermissionsResponse,
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


# Invited participant roles (RBAC)
ROOM_ROLE_VIEWER = "viewer"
ROOM_ROLE_CONTRIBUTOR = "contributor"
ROOM_ROLE_CO_HOST = "co_host"
VALID_ROOM_ROLES = frozenset({ROOM_ROLE_VIEWER, ROOM_ROLE_CONTRIBUTOR, ROOM_ROLE_CO_HOST})


def _normalize_room_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


@dataclass
class RoomAccessContext:
    """Effective access for the current user to a deal room."""
    has_access: bool
    is_staff_host: bool = False
    is_primary_customer: bool = False
    participant: Optional[DealRoomParticipant] = None
    role_in_room: str = "none"

    def can_download_materials(self) -> bool:
        if not self.has_access:
            return False
        if self.is_staff_host:
            return True
        if self.is_primary_customer:
            return True
        if self.participant and self.participant.role in (ROOM_ROLE_CONTRIBUTOR, ROOM_ROLE_CO_HOST):
            return True
        return False

    def can_invite_participants(self) -> bool:
        if not self.has_access:
            return False
        if self.is_staff_host:
            return True
        if self.participant and self.participant.role == ROOM_ROLE_CO_HOST:
            return True
        return False

    def can_update_action_plan_as_guest(self) -> bool:
        """Customer-side action plan updates (assignee customer/both)."""
        if not self.has_access:
            return False
        if self.is_staff_host:
            return True
        if self.is_primary_customer:
            return True
        if self.participant and self.participant.role in (ROOM_ROLE_CONTRIBUTOR, ROOM_ROLE_CO_HOST):
            return True
        return False

    def to_permissions_response(self) -> RoomPermissionsResponse:
        return RoomPermissionsResponse(
            role_in_room=self.role_in_room,
            can_message=self.has_access,
            can_download_materials=self.can_download_materials(),
            can_invite_participants=self.can_invite_participants(),
            can_update_action_plan=self.can_update_action_plan_as_guest(),
        )


def get_room_access_context(room: DealRoom, user: User, db: Session) -> RoomAccessContext:
    """Resolve RBAC for this user: staff host, primary customer, or invited participant."""
    email = _normalize_room_email(user.email)

    if user.role in ("admin", "director", "pmm"):
        return RoomAccessContext(
            has_access=True,
            is_staff_host=True,
            role_in_room="staff",
        )
    if user.role == "sales" and room.created_by_user_id == user.id:
        return RoomAccessContext(
            has_access=True,
            is_staff_host=True,
            role_in_room="staff",
        )

    if room.customer_email and _normalize_room_email(room.customer_email) == email:
        return RoomAccessContext(
            has_access=True,
            is_primary_customer=True,
            role_in_room="primary_customer",
        )

    part = (
        db.query(DealRoomParticipant)
        .filter(
            DealRoomParticipant.deal_room_id == room.id,
            DealRoomParticipant.email == email,
        )
        .first()
    )
    if part:
        return RoomAccessContext(
            has_access=True,
            participant=part,
            role_in_room=part.role,
        )

    return RoomAccessContext(has_access=False, role_in_room="none")


def _can_access_room(room: DealRoom, user: User, db: Session) -> bool:
    return get_room_access_context(room, user, db).has_access


def _message_sent_as_guest(room: DealRoom, user: User) -> bool:
    """UI alignment: guest (customer) vs internal host; maps to sent_by_customer."""
    if user.role in ("admin", "director", "pmm"):
        return False
    if user.role == "sales" and room.created_by_user_id == user.id:
        return False
    return True


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
    if getattr(data, "password_protected", None) is not None:
        room.password_protected = data.password_protected

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


@router.post("/{room_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_deal_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Permanently delete a deal room (removes row; cascades to materials, messages, etc.)."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(room)
    db.commit()


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Inactivate a deal room (is_active=False)."""
    _ensure_sales_or_above(current_user)
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if current_user.role == "sales" and room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    room.is_active = False
    db.commit()


@router.post("/{room_id}/send-email")
async def send_room_email(
    room_id: int,
    data: DealRoomShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send the deal room link to recipients via email."""
    _ensure_sales_or_above(current_user)
    room = _get_room_for_edit(room_id, current_user, db)
    room_url = _get_room_url(room.unique_token)
    shared_by = current_user.full_name or current_user.email
    platform_url = getattr(settings, "PLATFORM_URL", "http://localhost:3003")

    from app.core.email import send_deal_room_notification

    sent = []
    for email in data.recipients:
        email = (email or "").strip()
        if not email or "@" not in email:
            continue
        ok = send_deal_room_notification(
            to_email=email,
            subject=data.subject,
            room_name=room.name,
            room_url=room_url,
            shared_by_name=shared_by,
            custom_message=data.message,
            platform_url=platform_url,
        )
        sent.append({"email": email, "sent": ok})
    return {"message": "Emails sent", "results": sent}


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


def _can_update_action_plan_item(room: DealRoom, item: ActionPlanItem, user: User, db: Session) -> bool:
    """Customer-side updates when assignee allows; staff full access; contributors/co-hosts same as primary customer."""
    if user.is_superuser:
        return True
    ctx = get_room_access_context(room, user, db)
    if not ctx.has_access:
        return False
    if ctx.is_staff_host:
        return True
    if item.assignee not in ("customer", "both"):
        return False
    return ctx.can_update_action_plan_as_guest()


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

    if not _can_update_action_plan_item(room, item, current_user, db):
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


def _can_manage_participants(room: DealRoom, user: User, db: Session) -> bool:
    return get_room_access_context(room, user, db).can_invite_participants()


def _participant_to_response(
    p: DealRoomParticipant,
    notification_email_sent: Optional[bool] = None,
    account_created: Optional[bool] = None,
    welcome_email_sent: Optional[bool] = None,
) -> DealRoomParticipantResponse:
    return DealRoomParticipantResponse(
        id=p.id,
        email=p.email,
        role=p.role,
        invited_by_user_id=p.invited_by_user_id,
        created_at=p.created_at,
        notification_email_sent=notification_email_sent,
        account_created=account_created,
        welcome_email_sent=welcome_email_sent,
    )


def _can_provision_customer_for_room(room: DealRoom, user: User) -> bool:
    """Create platform customer accounts for an invite (room owner or staff, not guest co-hosts)."""
    if user.role in ("admin", "director", "pmm"):
        return True
    if room.created_by_user_id and user.id == room.created_by_user_id:
        return True
    return False


def _invite_customer_portfolio_user_ids(room: DealRoom, inviter: User) -> set[int]:
    """
    Which user ids define "my customers" for this invite flow.

    Includes the room creator (when set) and the person inviting. That way:
    - sales co-hosts see their own portfolio plus the room owner's;
    - rooms with a missing creator still show the inviter's customers;
    - staff inviting on someone else's room see that owner's contacts plus any they created/own.
    """
    ids: set[int] = set()
    if room.created_by_user_id is not None:
        ids.add(room.created_by_user_id)
    ids.add(inviter.id)
    return ids


def _customer_eligible_for_room_invite(room: DealRoom, customer: User, inviter: User) -> bool:
    """Customer is assigned to or created by someone in the invite portfolio for this room."""
    if customer.role != "customer":
        return False
    owner_ids = _invite_customer_portfolio_user_ids(room, inviter)
    return (
        customer.assigned_sales_id in owner_ids
        or customer.created_by_id in owner_ids
    )


def _provision_customer_for_room_invite(
    *,
    email: str,
    room: DealRoom,
    current_user: User,
    first_name: str,
    last_name: str,
    password: str,
    send_welcome_email: bool,
    db: Session,
) -> tuple[User, bool]:
    """Create customer User; assign to room owner when they are sales."""
    owner_id = room.created_by_user_id
    if not owner_id:
        raise HTTPException(
            status_code=400,
            detail="This room has no owner; cannot create a customer for this invite.",
        )
    owner = db.query(User).filter(User.id == owner_id).first()
    assigned_sales_id = owner_id if owner and owner.role == "sales" else None

    from app.core.security import get_password_hash
    from app.core.email import send_user_creation_notification

    full_name = f"{first_name.strip()} {last_name.strip()}".strip()
    new_user = User(
        email=email,
        full_name=full_name or email,
        hashed_password=get_password_hash(password),
        role="customer",
        is_active=True,
        assigned_sales_id=assigned_sales_id,
        created_by_id=current_user.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    welcome_ok = False
    if send_welcome_email:
        try:
            welcome_ok = bool(
                send_user_creation_notification(
                    user_email=new_user.email,
                    user_name=new_user.full_name,
                    user_password=password,
                    user_role="customer",
                    platform_url=getattr(settings, "PLATFORM_URL", "http://localhost:3003"),
                )
            )
        except Exception:
            welcome_ok = False
    return new_user, welcome_ok


@router.get("/{room_id}/participants", response_model=List[DealRoomParticipantResponse])
async def list_room_participants(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List invited participants (room hosts and co-hosts only)."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_manage_participants(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to manage participants")
    rows = (
        db.query(DealRoomParticipant)
        .filter(DealRoomParticipant.deal_room_id == room.id)
        .order_by(DealRoomParticipant.created_at)
        .all()
    )
    return [_participant_to_response(p) for p in rows]


@router.get(
    "/{room_id}/invite-customer-candidates",
    response_model=List[DealRoomInviteCustomerCandidate],
)
async def list_invite_customer_candidates(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Customers linked to the room creator and/or the inviting user (for one-click invite)."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_manage_participants(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to manage participants")

    owner_ids = _invite_customer_portfolio_user_ids(room, current_user)
    id_list = list(owner_ids)

    customers = (
        db.query(User)
        .filter(
            User.role == "customer",
            or_(
                User.assigned_sales_id.in_(id_list),
                User.created_by_id.in_(id_list),
            ),
        )
        .order_by(User.full_name)
        .all()
    )
    return [
        DealRoomInviteCustomerCandidate(
            id=c.id,
            email=c.email,
            full_name=c.full_name,
        )
        for c in customers
    ]


@router.post(
    "/{room_id}/participants",
    response_model=DealRoomParticipantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_room_participant(
    room_id: int,
    data: DealRoomParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Grant room access by email. The email must match an existing platform user, unless
    create_customer_if_missing is true (creates a customer tied to this room's owner).
    Alternatively pass customer_user_id to invite a contact from the room owner's list.
    """
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_manage_participants(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to manage participants")

    if data.customer_user_id is not None:
        cust = db.query(User).filter(User.id == data.customer_user_id).first()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")
        if not _customer_eligible_for_room_invite(room, cust, current_user):
            raise HTTPException(
                status_code=400,
                detail="This contact is not linked to the room owner's customer list.",
            )
        email = _normalize_room_email(cust.email)
    else:
        email = _normalize_room_email(str(data.email or ""))

    if not email:
        raise HTTPException(status_code=400, detail="Invalid email")

    if room.customer_email and _normalize_room_email(room.customer_email) == email:
        raise HTTPException(
            status_code=400,
            detail="This email is already the primary customer for this room; they have full access.",
        )

    if data.role not in VALID_ROOM_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing_row = (
        db.query(DealRoomParticipant)
        .filter(
            DealRoomParticipant.deal_room_id == room.id,
            DealRoomParticipant.email == email,
        )
        .first()
    )
    if existing_row:
        raise HTTPException(status_code=400, detail="This email is already invited to this room")

    account_user = db.query(User).filter(User.email == email).first()
    account_created = False
    welcome_email_sent: Optional[bool] = None

    if not account_user:
        if not data.create_customer_if_missing:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No platform account exists for this email. Choose someone from your contacts, "
                    "or turn on Create account and enter their name and password."
                ),
            )
        if not _can_provision_customer_for_room(room, current_user):
            raise HTTPException(
                status_code=403,
                detail="Only the room owner or staff can create new customer accounts from here.",
            )
        fn = (data.new_customer_first_name or "").strip()
        ln = (data.new_customer_last_name or "").strip()
        pw = data.new_customer_password or ""
        if not fn or not ln:
            raise HTTPException(
                status_code=400,
                detail="First and last name are required to create a new customer account.",
            )
        if not pw or len(pw) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters to create a new customer account.",
            )
        account_user, welcome_email_sent = _provision_customer_for_room_invite(
            email=email,
            room=room,
            current_user=current_user,
            first_name=fn,
            last_name=ln,
            password=pw,
            send_welcome_email=data.new_customer_send_welcome_email,
            db=db,
        )
        account_created = True

    row = DealRoomParticipant(
        deal_room_id=room.id,
        email=email,
        role=data.role,
        invited_by_user_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    notification_email_sent: Optional[bool] = None
    if data.send_notification_email:
        from app.core.email import send_deal_room_participant_invite_email

        ok = send_deal_room_participant_invite_email(
            to_email=email,
            room_name=room.name,
            room_url=_get_room_url(room.unique_token),
            invited_by_name=current_user.full_name or current_user.email,
            role=data.role,
        )
        notification_email_sent = ok

    return _participant_to_response(
        row,
        notification_email_sent=notification_email_sent,
        account_created=account_created if account_created else None,
        welcome_email_sent=welcome_email_sent,
    )


@router.patch("/{room_id}/participants/{participant_id}", response_model=DealRoomParticipantResponse)
async def update_room_participant(
    room_id: int,
    participant_id: int,
    data: DealRoomParticipantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_manage_participants(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to manage participants")

    row = (
        db.query(DealRoomParticipant)
        .filter(
            DealRoomParticipant.id == participant_id,
            DealRoomParticipant.deal_room_id == room.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Participant not found")

    if data.role is not None:
        if data.role not in VALID_ROOM_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
        row.role = data.role

    db.commit()
    db.refresh(row)
    return _participant_to_response(row)


@router.delete("/{room_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_participant(
    room_id: int,
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_manage_participants(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to manage participants")

    row = (
        db.query(DealRoomParticipant)
        .filter(
            DealRoomParticipant.id == participant_id,
            DealRoomParticipant.deal_room_id == room.id,
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


# --- Messaging ---

@router.get("/{room_id}/messages", response_model=List[RoomMessageResponse])
async def get_room_messages(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get messages in a deal room (any user with room access, including invited participants)."""
    room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Deal room not found")
    if not _can_access_room(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

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

    if not _can_access_room(room, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized for this room")

    sent_by_customer = _message_sent_as_guest(room, current_user)

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
    if not _can_access_room(room, current_user, db):
        raise HTTPException(status_code=403, detail="You do not have access to this room")

    ctx = get_room_access_context(room, current_user, db)
    my_permissions = ctx.to_permissions_response()

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

    # Activity feed - recent material views/downloads
    activity = []
    usage_rows = (
        db.query(MaterialUsage, Material)
        .join(Material, Material.id == MaterialUsage.material_id)
        .filter(MaterialUsage.deal_room_id == room.id)
        .order_by(MaterialUsage.used_at.desc())
        .limit(20)
        .all()
    )
    for u, mat in usage_rows:
        action_label = "viewed" if u.action == "view" else "downloaded"
        activity.append({
            "material_name": mat.name if mat else "Document",
            "action": u.action,
            "action_label": action_label,
            "used_at": u.used_at.isoformat() if u.used_at else None,
        })

    # Creator info
    creator = room.created_by_user
    created_by_name = creator.full_name or creator.email if creator else None
    created_by_avatar_url = creator.avatar_url if creator else None

    return DealRoomPublicResponse(
        id=room.id,
        unique_token=room.unique_token,
        name=room.name,
        description=room.description,
        company_name=room.company_name,
        customer_name=room.customer_name,
        welcome_message=room.welcome_message,
        executive_summary=getattr(room, "executive_summary", None),
        welcome_video_url=getattr(room, "welcome_video_url", None),
        customer_logo_url=getattr(room, "customer_logo_url", None),
        expires_at=room.expires_at,
        room_url=_get_room_url(token),
        materials_by_section=ordered_sections,
        action_plan=[_action_plan_to_response(a) for a in room.action_plan_items],
        created_by_name=created_by_name,
        created_by_avatar_url=created_by_avatar_url,
        activity=activity,
        my_permissions=my_permissions,
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
    if not _can_access_room(room, current_user, db):
        raise HTTPException(status_code=403, detail="You do not have access to this room")
    ctx = get_room_access_context(room, current_user, db)
    if not ctx.can_download_materials():
        raise HTTPException(status_code=403, detail="You do not have permission to download materials in this room")

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
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "avi": "video/x-msvideo", "mkv": "video/x-matroska",
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
    if not _can_access_room(room, current_user, db):
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
    if not _can_access_room(room, current_user, db):
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
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "avi": "video/x-msvideo", "mkv": "video/x-matroska",
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
