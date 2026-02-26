"""
Pydantic schemas for ProductRelease model
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.core.constants import VALID_UNIVERSES


class ProductReleaseBase(BaseModel):
    """Base schema for ProductRelease"""
    title: str = Field(..., min_length=1, max_length=255)
    short_description: Optional[str] = Field(None, description="Short description for card display")
    content: str = Field(..., min_length=1, description="Full content for detail view")
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    universe_name: Optional[str] = Field(None, max_length=100)
    category_name: Optional[str] = Field(None, max_length=255)
    product_name: Optional[str] = Field(None, max_length=255)
    published_at: Optional[datetime] = None
    material_id: Optional[int] = Field(None, description="Optional attached material ID")
    phase: Optional[str] = Field(None, description="Release phase: alpha, beta, or ga")
    
    @field_validator('universe_name')
    @classmethod
    def validate_universe(cls, v):
        if v:
            if v not in VALID_UNIVERSES:
                raise ValueError(f"universe_name must be one of: {VALID_UNIVERSES}")
        return v


class ProductReleaseCreate(ProductReleaseBase):
    """Schema for creating a product release"""
    send_notification: Optional[bool] = Field(False, description="Send notification to all users about this release")


class ProductReleaseUpdate(BaseModel):
    """Schema for updating a product release"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    short_description: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    universe_name: Optional[str] = Field(None, max_length=100)
    category_name: Optional[str] = Field(None, max_length=255)
    product_name: Optional[str] = Field(None, max_length=255)
    published_at: Optional[datetime] = None
    material_id: Optional[int] = None
    phase: Optional[str] = Field(None, description="Release phase: alpha, beta, or ga")
    
    @field_validator('universe_name')
    @classmethod
    def validate_universe(cls, v):
        if v:
            if v not in VALID_UNIVERSES:
                raise ValueError(f"universe_name must be one of: {VALID_UNIVERSES}")
        return v


class ProductReleaseResponse(ProductReleaseBase):
    """Schema for product release response"""
    id: int
    created_by_id: int
    created_by_name: Optional[str] = None
    created_by_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
