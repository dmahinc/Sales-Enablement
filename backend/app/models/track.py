"""
Track model - Sales Enablement Tracks (learning paths/syllabi)
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class Track(BaseModel):
    """Sales Enablement Track - A structured learning path for use cases or business stories"""
    __tablename__ = "tracks"
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    
    # Track Context
    use_case = Column(String(255), nullable=False, index=True)  # Primary use case or business story
    learning_objectives = Column(Text)  # What Sales will learn from this track
    target_audience = Column(Text)  # Description of target personas/segments
    
    # Metadata
    estimated_duration_minutes = Column(Integer)  # Estimated time to complete track
    status = Column(String(50), default="draft")  # draft, published, archived
    
    # Ownership
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User")
    
    # Relationships
    track_materials = relationship("TrackMaterial", back_populates="track", cascade="all, delete-orphan", order_by="TrackMaterial.order")
    progress_records = relationship("TrackProgress", back_populates="track", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Track(name={self.name}, use_case={self.use_case})>"


class TrackMaterial(BaseModel):
    """Association table for materials in a track with ordering"""
    __tablename__ = "track_materials"
    
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    
    # Ordering and context
    order = Column(Integer, nullable=False)  # Sequence in track (1, 2, 3...)
    step_description = Column(Text)  # What this step teaches
    is_required = Column(Boolean, default=True)  # Required vs optional step
    
    # Relationships
    track = relationship("Track", back_populates="track_materials")
    material = relationship("Material")
    
    def __repr__(self):
        return f"<TrackMaterial(track_id={self.track_id}, material_id={self.material_id}, order={self.order})>"


class TrackProgress(BaseModel):
    """User progress through a track"""
    __tablename__ = "track_progress"
    
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Progress tracking
    completed_material_ids = Column(JSON)  # Array of material IDs that user has completed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    track = relationship("Track", back_populates="progress_records")
    user = relationship("User")
    
    def __repr__(self):
        return f"<TrackProgress(track_id={self.track_id}, user_id={self.user_id})>"
