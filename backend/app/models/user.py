"""
User model - represents PMMs and other users
"""
from sqlalchemy import Column, String, Boolean, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class User(BaseModel):
    """User model"""
    __tablename__ = "users"
    
    # Basic Information
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    
    # Authentication
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Role
    role = Column(String(50), default="pmm")  # pmm, director, sales, admin
    
    # Relationships (using string references to avoid circular imports)
    materials = relationship("Material", back_populates="owner", lazy="dynamic")
