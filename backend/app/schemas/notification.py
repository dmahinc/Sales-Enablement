"""
Pydantic schemas for Notification model
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    """Base schema for Notification"""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    notification_type: str = Field(..., description="Type: 'material', 'product_release', 'marketing_update', 'track'")
    target_id: int = Field(..., description="ID of the material/release/update/track")
    link_path: Optional[str] = Field(None, max_length=255, description="Path to navigate to the content")


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    send_to_all: bool = Field(True, description="Send notification to all users (except sender)")


class NotificationResponse(NotificationBase):
    """Schema for notification response"""
    id: int
    sent_by_id: int
    sent_by_name: Optional[str] = None
    sent_by_email: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    """Schema for updating notification (mark as read)"""
    is_read: Optional[bool] = None
