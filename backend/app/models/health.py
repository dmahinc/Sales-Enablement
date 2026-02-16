"""
Material Health tracking models
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class MaterialHealthHistory(BaseModel):
    """Tracks material health over time"""
    __tablename__ = "material_health_history"
    
    material_id = Column(Integer, ForeignKey("materials.id"))
    # material = relationship("Material", back_populates="health_history")  # Commented out - Material model doesn't have this relationship
    
    # Health Metrics
    freshness_score = Column(Integer)  # 0-100
    completeness_score = Column(Integer)  # 0-100
    usage_score = Column(Integer)  # 0-100
    performance_score = Column(Integer)  # 0-100 (from win/loss)
    overall_health_score = Column(Integer)  # 0-100
    
    # Details
    notes = Column(Text)
    recorded_at = Column(DateTime)
