"""
Pydantic schemas for Segment model
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SegmentBase(BaseModel):
    """Base schema for Segment"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    region: Optional[str] = Field(None, max_length=50)
    key_drivers: Optional[str] = None
    pain_points: Optional[str] = None
    buying_criteria: Optional[str] = None


class SegmentCreate(SegmentBase):
    """Schema for creating a segment"""
    pass


class SegmentUpdate(BaseModel):
    """Schema for updating a segment"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    region: Optional[str] = Field(None, max_length=50)
    key_drivers: Optional[str] = None
    pain_points: Optional[str] = None
    buying_criteria: Optional[str] = None


class SegmentResponse(SegmentBase):
    """Schema for segment response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
