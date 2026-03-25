"""
DealRoom (Digital Sales Room) Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Literal
from datetime import datetime


RoomParticipantRole = Literal["viewer", "contributor", "co_host"]


class RoomPermissionsResponse(BaseModel):
    """Effective permissions for the current user in this room."""
    role_in_room: str  # staff | primary_customer | viewer | contributor | co_host
    can_message: bool = True
    can_download_materials: bool = False
    can_invite_participants: bool = False
    can_update_action_plan: bool = False


class DealRoomMaterialCreate(BaseModel):
    material_id: int
    persona_id: Optional[int] = None
    section_name: Optional[str] = Field(None, max_length=100)
    display_order: int = 0


class DealRoomMaterialUpdate(BaseModel):
    section_name: Optional[str] = Field(None, max_length=100)
    persona_id: Optional[int] = None
    display_order: Optional[int] = None


class ActionPlanItemCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = Field(default="pending", max_length=50)
    assignee: Optional[str] = Field(None, max_length=50)
    display_order: int = 0


class ActionPlanItemUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = Field(None, max_length=50)
    assignee: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None


class ActionPlanStatusUpdate(BaseModel):
    """Minimal update for customer marking items complete."""
    status: str = Field(..., max_length=50)


class DealRoomCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    opportunity_name: Optional[str] = Field(None, max_length=255)
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = Field(None, max_length=500)
    customer_logo_url: Optional[str] = Field(None, max_length=500)
    expires_in_days: int = Field(default=90, ge=1, le=365)
    materials: List[DealRoomMaterialCreate] = []
    action_plan: List[ActionPlanItemCreate] = []


class DealRoomShareRequest(BaseModel):
    """Request to share a deal room via email"""
    recipients: List[str] = Field(..., min_length=1, description="List of recipient email addresses")
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(default="")
    send_separate: bool = Field(default=True, description="Send separate email to each recipient")


class DealRoomUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    opportunity_name: Optional[str] = Field(None, max_length=255)
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = Field(None, max_length=500)
    customer_logo_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    password_protected: Optional[bool] = None


class RoomMaterialResponse(BaseModel):
    id: int
    material_id: int
    material_name: str
    material_type: Optional[str] = None
    file_name: Optional[str] = None
    file_format: Optional[str] = None
    persona_id: Optional[int] = None
    persona_name: Optional[str] = None
    section_name: Optional[str] = None
    display_order: int

    class Config:
        from_attributes = True


class ActionPlanItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str
    assignee: Optional[str] = None
    display_order: int

    class Config:
        from_attributes = True


class RoomMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)
    parent_message_id: Optional[int] = None


class RoomMessageResponse(BaseModel):
    id: int
    message: str
    sent_by_customer: bool
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


class DealRoomResponse(BaseModel):
    id: int
    unique_token: str
    name: str
    description: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    opportunity_name: Optional[str] = None
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = None
    customer_logo_url: Optional[str] = None
    expires_at: datetime
    is_active: bool
    access_count: int
    last_accessed_at: Optional[datetime] = None
    unique_visitors: int
    created_at: datetime
    room_url: str
    materials: List[RoomMaterialResponse] = []
    action_plan: List[ActionPlanItemResponse] = []

    class Config:
        from_attributes = True


class DealRoomTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = None
    materials_json: Optional[list] = None
    action_plan_json: Optional[list] = None

    class Config:
        from_attributes = True


class DealRoomTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = None
    materials_json: Optional[list] = None
    action_plan_json: Optional[list] = None


class DealRoomInviteCustomerCandidate(BaseModel):
    """Customer tied to this room's owner — can be granted room access in one click."""
    id: int
    email: str
    full_name: str

    class Config:
        from_attributes = True


class DealRoomParticipantCreate(BaseModel):
    """Invite by email and/or pick an existing customer. If the email has no User yet, set create_customer_if_missing and name/password."""
    email: Optional[EmailStr] = None
    customer_user_id: Optional[int] = Field(
        None,
        description="Invite this existing customer (must belong to the room owner's book of business).",
    )
    role: RoomParticipantRole = "viewer"
    send_notification_email: bool = Field(
        default=True,
        description="If true, send an invitation email to the invitee (requires SMTP).",
    )
    create_customer_if_missing: bool = Field(
        default=False,
        description="If no user exists for email, create a customer account (requires permission and name/password).",
    )
    new_customer_first_name: Optional[str] = Field(None, max_length=255)
    new_customer_last_name: Optional[str] = Field(None, max_length=255)
    new_customer_password: Optional[str] = Field(None, min_length=8)
    new_customer_send_welcome_email: bool = Field(
        default=False,
        description="Send welcome email with credentials when creating a new customer (SMTP).",
    )

    @model_validator(mode="after")
    def email_or_customer_id(self):
        if self.customer_user_id is not None and self.email:
            raise ValueError("Provide either customer_user_id or email, not both")
        if self.customer_user_id is None and not self.email:
            raise ValueError("Provide email or customer_user_id")
        return self


class DealRoomParticipantUpdate(BaseModel):
    role: Optional[RoomParticipantRole] = None


class DealRoomParticipantResponse(BaseModel):
    id: int
    email: str
    role: str
    invited_by_user_id: Optional[int] = None
    created_at: datetime
    # Set on invite (POST) only: outcome of optional notification email
    notification_email_sent: Optional[bool] = None
    account_created: Optional[bool] = None
    welcome_email_sent: Optional[bool] = None

    class Config:
        from_attributes = True


class DealRoomPublicResponse(BaseModel):
    """Public room view - no sensitive data"""
    id: int
    unique_token: str
    name: str
    description: Optional[str] = None
    company_name: Optional[str] = None
    customer_name: Optional[str] = None
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = None
    customer_logo_url: Optional[str] = None
    expires_at: datetime
    room_url: str
    materials_by_section: dict  # {section_name: [RoomMaterialResponse]}
    action_plan: List[ActionPlanItemResponse]
    created_by_name: Optional[str] = None
    created_by_avatar_url: Optional[str] = None
    activity: Optional[list] = None
    my_permissions: Optional[RoomPermissionsResponse] = None

    class Config:
        from_attributes = True


class DealRoomAnalytics(BaseModel):
    room_id: int
    room_name: str
    access_count: int
    unique_visitors: int
    last_accessed_at: Optional[datetime] = None
    material_views: List[dict]
    total_downloads: int
