"""
Market Segment model - represents market segments
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Segment(BaseModel):
    """Market Segment model"""
    __tablename__ = "segments"
    
    # Basic Information
    name = Column(String(100), nullable=False, unique=True, index=True)
    
    # Segment Details (matching Product Brief and frontend)
    description = Column(Text)  # Detailed description
    industry = Column(String(100))  # Target industry
    company_size = Column(String(50))  # Company size range
    region = Column(String(50))  # Geographic region
    key_drivers = Column(Text)  # Business drivers
    pain_points = Column(Text)  # Common pain points
    buying_criteria = Column(Text)  # Purchase factors
    
    # Legacy fields (kept for backward compatibility)
    display_name = Column(String(255))  # Deprecated: use name instead
    characteristics = Column(Text)  # Deprecated: use description instead
    firmographics = Column(Text)  # Deprecated: use company_size instead
    technographics = Column(Text)  # Deprecated
    buying_behavior = Column(Text)  # Deprecated: use buying_criteria instead
    messaging_preferences = Column(Text)  # Deprecated
    
    # Hierarchy (optional)
    parent_segment_id = Column(Integer, ForeignKey("segments.id"))
    parent_segment = relationship("Segment", remote_side="Segment.id", backref="sub_segments")
    
    # Metadata
    version = Column(String(50), default="1.0")
    
    # Governance (optional)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    approved_by_ids = Column(JSON)  # Array of user IDs who approved
    approval_count = Column(Integer, default=0)
    
    # Usage
    usage_count = Column(Integer, default=0)  # How many materials reference this segment
    
    # Relationships
    personas = relationship("Persona", back_populates="segment")
    material_references = relationship("Material", secondary="material_segment", back_populates="segments")
