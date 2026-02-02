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
    name = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    
    # Characteristics
    characteristics = Column(Text)  # Description of segment characteristics
    firmographics = Column(Text)  # Company size, revenue, employees
    technographics = Column(Text)  # Technology stack, cloud maturity
    buying_behavior = Column(Text)  # Description of buying behavior
    pain_points = Column(Text)  # JSON array or text
    messaging_preferences = Column(Text)  # What messaging resonates
    
    # Hierarchy
    parent_segment_id = Column(Integer, ForeignKey("segments.id"))
    parent_segment = relationship("Segment", remote_side="Segment.id", backref="sub_segments")
    
    # Metadata
    description = Column(Text)
    version = Column(String(50), default="1.0")
    
    # Governance
    created_by_id = Column(Integer, ForeignKey("users.id"))
    approved_by_ids = Column(JSON)  # Array of user IDs who approved
    approval_count = Column(Integer, default=0)
    
    # Usage
    usage_count = Column(Integer, default=0)  # How many materials reference this segment
    
    # Relationships
    personas = relationship("Persona", back_populates="segment")
    material_references = relationship("Material", secondary="material_segment", back_populates="segments")
