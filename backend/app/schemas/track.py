"""
Pydantic schemas for Track model
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TrackMaterialBase(BaseModel):
    """Base schema for track material association"""
    material_id: int
    order: int = Field(..., ge=1, description="Sequence order in track")
    step_description: Optional[str] = None
    is_required: bool = True


class TrackMaterialCreate(TrackMaterialBase):
    """Schema for creating a track material"""
    pass


class TrackMaterialResponse(TrackMaterialBase):
    """Schema for track material response"""
    id: int
    material: Optional[dict] = None  # Will be populated with material details
    
    class Config:
        from_attributes = True


class TrackBase(BaseModel):
    """Base schema for Track"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    use_case: str = Field(..., min_length=1, max_length=255)
    learning_objectives: Optional[str] = None
    target_audience: Optional[str] = None
    estimated_duration_minutes: Optional[int] = Field(None, ge=1)
    status: str = "draft"


class TrackCreate(TrackBase):
    """Schema for creating a track"""
    materials: Optional[List[TrackMaterialCreate]] = []
    send_notification: Optional[bool] = Field(False, description="Send notification to all users about this track")


class TrackUpdate(BaseModel):
    """Schema for updating a track"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    use_case: Optional[str] = Field(None, min_length=1, max_length=255)
    learning_objectives: Optional[str] = None
    target_audience: Optional[str] = None
    estimated_duration_minutes: Optional[int] = Field(None, ge=1)
    status: Optional[str] = None
    materials: Optional[List[TrackMaterialCreate]] = None


class TrackResponse(TrackBase):
    """Schema for track response"""
    id: int
    created_by_id: int
    materials: List[TrackMaterialResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TrackProgressResponse(BaseModel):
    """Schema for track progress response"""
    track_id: int
    user_id: int
    completed_material_ids: List[int] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    progress_percentage: float = 0.0
    
    class Config:
        from_attributes = True


class TrackProgressUpdate(BaseModel):
    """Schema for updating track progress"""
    material_id: int
    completed: bool = True
