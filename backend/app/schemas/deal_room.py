"""
DealRoom (Digital Sales Room) Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


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


class DealRoomPublicResponse(BaseModel):
    """Public room view - no sensitive data"""
    id: int
    unique_token: str
    name: str
    description: Optional[str] = None
    company_name: Optional[str] = None
    welcome_message: Optional[str] = None
    executive_summary: Optional[str] = None
    welcome_video_url: Optional[str] = None
    customer_logo_url: Optional[str] = None
    expires_at: datetime
    room_url: str
    materials_by_section: dict  # {section_name: [RoomMaterialResponse]}
    action_plan: List[ActionPlanItemResponse]

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
