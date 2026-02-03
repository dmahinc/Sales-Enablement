"""
User Pydantic schemas for API responses
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    is_superuser: Optional[bool] = False
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)
    role: str = Field(default="pmm", pattern="^(pmm|sales|admin)$")
    is_active: bool = True
    is_superuser: bool = False


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[str] = Field(None, pattern="^(pmm|sales|admin)$")
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
