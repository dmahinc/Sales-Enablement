"""
User Pydantic schemas for API responses
"""
from pydantic import BaseModel, EmailStr
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
