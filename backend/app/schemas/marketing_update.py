"""
Pydantic schemas for MarketingUpdate model
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.core.constants import VALID_UNIVERSES


class MarketingUpdateBase(BaseModel):
    """Base schema for MarketingUpdate"""
    title: str = Field(..., min_length=1, max_length=255)
    short_description: Optional[str] = Field(None, description="Short description for card display")
    content: str = Field(..., min_length=1, description="Full content for detail view (HTML supported)")
    category: str = Field(..., description="Main category")
    subcategory: Optional[str] = Field(None, max_length=100, description="Subcategory within main category")
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    universe_name: Optional[str] = Field(None, max_length=100)
    category_name: Optional[str] = Field(None, max_length=255)
    product_name: Optional[str] = Field(None, max_length=255)
    priority: Optional[str] = Field('informational', description="Priority: critical, important, informational")
    target_audience: Optional[str] = Field(None, max_length=100, description="Target audience")
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    material_id: Optional[int] = Field(None, description="Optional attached material ID")
    
    @field_validator('universe_name')
    @classmethod
    def validate_universe(cls, v):
        if v:
            if v not in VALID_UNIVERSES:
                raise ValueError(f"universe_name must be one of: {VALID_UNIVERSES}")
        return v


class MarketingUpdateCreate(MarketingUpdateBase):
    """Schema for creating a marketing update"""
    send_notification: Optional[bool] = Field(False, description="Send notification to all users about this update")


class MarketingUpdateUpdate(BaseModel):
    """Schema for updating a marketing update"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    short_description: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    subcategory: Optional[str] = Field(None, max_length=100)
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    universe_name: Optional[str] = Field(None, max_length=100)
    category_name: Optional[str] = Field(None, max_length=255)
    product_name: Optional[str] = Field(None, max_length=255)
    priority: Optional[str] = None
    target_audience: Optional[str] = Field(None, max_length=100)
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    material_id: Optional[int] = None
    
    @field_validator('universe_name')
    @classmethod
    def validate_universe(cls, v):
        if v:
            if v not in VALID_UNIVERSES:
                raise ValueError(f"universe_name must be one of: {VALID_UNIVERSES}")
        return v


class MarketingUpdateResponse(MarketingUpdateBase):
    """Schema for marketing update response"""
    id: int
    created_by_id: int
    created_by_name: Optional[str] = None
    created_by_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
