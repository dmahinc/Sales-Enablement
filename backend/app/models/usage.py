"""
Material Usage model - tracks individual usage events
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from enum import Enum
from datetime import datetime
from app.models.base import BaseModel


class UsageAction(str, Enum):
    """Types of usage actions"""
    DOWNLOAD = "download"
    VIEW = "view"
    SHARE = "share"
    COPY = "copy"


class MaterialUsage(BaseModel):
    """Tracks individual material usage events"""
    __tablename__ = "material_usage"
    
    # Material reference
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    # material = relationship("Material", back_populates="usage_events")  # Commented out - Material model doesn't have this relationship
    
    # User who performed the action
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user = relationship("User")
    
    # Action type
    action = Column(String(50), nullable=False, index=True)  # download, view, share, copy
    
    # Timestamp
    used_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Additional metadata
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))  # Browser/client info
    
    def __repr__(self):
        return f"<MaterialUsage(material_id={self.material_id}, action={self.action}, used_at={self.used_at})>"
