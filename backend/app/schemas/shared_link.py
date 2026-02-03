"""
SharedLink Pydantic schemas for API requests/responses
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SharedLinkCreate(BaseModel):
    """Schema for creating a shared link"""
    material_id: int
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    expires_in_days: int = Field(default=90, ge=1, le=365)


class SharedLinkResponse(BaseModel):
    """Schema for shared link response"""
    id: int
    unique_token: str
    material_id: int
    shared_by_user_id: Optional[int] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    expires_at: datetime
    is_active: bool
    access_count: int
    last_accessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    share_url: str  # Full URL to access the shared document
    
    class Config:
        from_attributes = True


class SharedLinkUpdate(BaseModel):
    """Schema for updating a shared link"""
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class SharedLinkStats(BaseModel):
    """Schema for shared link statistics"""
    total_shares: int
    active_shares: int
    expired_shares: int
    total_accesses: int
    unique_customers: int


class MaterialShareStats(BaseModel):
    """Schema for material sharing statistics"""
    material_id: int
    material_name: str
    total_shares: int
    unique_customers: int
    total_accesses: int
    last_shared_at: Optional[datetime] = None


class CustomerShareStats(BaseModel):
    """Schema for customer sharing statistics"""
    customer_email: str
    customer_name: Optional[str] = None
    total_documents_shared: int
    total_accesses: int
    last_shared_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
