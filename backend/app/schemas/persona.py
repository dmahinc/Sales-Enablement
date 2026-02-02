"""
Pydantic schemas for Persona model
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PersonaBase(BaseModel):
    """Base schema for Persona"""
    name: str = Field(..., min_length=1, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    goals: Optional[str] = None
    challenges: Optional[str] = None
    preferred_content: Optional[str] = None


class PersonaCreate(PersonaBase):
    """Schema for creating a persona"""
    pass


class PersonaUpdate(BaseModel):
    """Schema for updating a persona"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    goals: Optional[str] = None
    challenges: Optional[str] = None
    preferred_content: Optional[str] = None


class PersonaResponse(PersonaBase):
    """Schema for persona response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
