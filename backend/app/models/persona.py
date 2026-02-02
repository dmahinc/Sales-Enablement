"""
Persona model - represents buyer personas
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Persona(BaseModel):
    """Persona model"""
    __tablename__ = "personas"
    
    # Basic Information
    name = Column(String(100), nullable=False, unique=True, index=True)
    
    # Persona Details (matching Product Brief and frontend)
    role = Column(String(100))  # Job title/role
    description = Column(Text)  # Background information
    goals = Column(Text)  # What they're trying to achieve
    challenges = Column(Text)  # Pain points they face
    preferred_content = Column(Text)  # Types of content they prefer
    
    # Legacy fields (kept for backward compatibility, can be removed later)
    display_name = Column(String(255))  # Deprecated: use name instead
    characteristics = Column(Text)  # Deprecated: use description instead
    pain_points = Column(Text)  # Deprecated: use challenges instead
    buying_behavior = Column(Text)  # Deprecated
    messaging_preferences = Column(Text)  # Deprecated: use preferred_content instead
    
    # Segment Connection (optional)
    segment_id = Column(Integer, ForeignKey("segments.id"))
    segment = relationship("Segment", back_populates="personas")
    
    # Metadata
    version = Column(String(50), default="1.0")
    
    # Governance (optional)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    approved_by_ids = Column(JSON)  # Array of user IDs who approved
    approval_count = Column(Integer, default=0)
    
    # Usage
    usage_count = Column(Integer, default=0)  # How many materials reference this persona
    
    # Relationships
    material_references = relationship("Material", secondary="material_persona", back_populates="personas")
