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
    name = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    
    # Characteristics
    characteristics = Column(Text)  # Description of persona characteristics
    pain_points = Column(Text)  # JSON array or text
    buying_behavior = Column(Text)  # Description of buying behavior
    messaging_preferences = Column(Text)  # What messaging resonates
    
    # Segment Connection
    segment_id = Column(Integer, ForeignKey("segments.id"))
    segment = relationship("Segment", back_populates="personas")
    
    # Metadata
    description = Column(Text)
    version = Column(String(50), default="1.0")
    
    # Governance
    created_by_id = Column(Integer, ForeignKey("users.id"))
    approved_by_ids = Column(JSON)  # Array of user IDs who approved
    approval_count = Column(Integer, default=0)
    
    # Usage
    usage_count = Column(Integer, default=0)  # How many materials reference this persona
    
    # Relationships
    material_references = relationship("Material", secondary="material_persona", back_populates="personas")
