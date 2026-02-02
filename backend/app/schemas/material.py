"""
Pydantic schemas for Material model
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.material import MaterialType, MaterialAudience, MaterialStatus


class MaterialBase(BaseModel):
    """Base schema for Material"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    material_type: str
    audience: str
    product_name: Optional[str] = Field(None, max_length=255)
    universe_name: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = "draft"
    tags: Optional[List[str]] = []
    keywords: Optional[List[str]] = []
    use_cases: Optional[List[str]] = []
    pain_points: Optional[List[str]] = []

    @validator('material_type')
    def validate_material_type(cls, v):
        valid_types = [e.value for e in MaterialType]
        if v not in valid_types:
            raise ValueError(f"material_type must be one of: {valid_types}")
        return v

    @validator('audience')
    def validate_audience(cls, v):
        valid_audiences = [e.value for e in MaterialAudience]
        if v not in valid_audiences:
            raise ValueError(f"audience must be one of: {valid_audiences}")
        return v

    @validator('status')
    def validate_status(cls, v):
        if v:
            valid_statuses = [e.value for e in MaterialStatus]
            if v not in valid_statuses:
                raise ValueError(f"status must be one of: {valid_statuses}")
        return v

    @validator('universe_name')
    def validate_universe(cls, v):
        if v:
            valid_universes = ["Public Cloud", "Private Cloud", "Bare Metal", "Hosting & Collaboration"]
            if v not in valid_universes:
                raise ValueError(f"universe_name must be one of: {valid_universes}")
        return v


class MaterialCreate(MaterialBase):
    """Schema for creating a material"""
    pass


class MaterialUpdate(BaseModel):
    """Schema for updating a material"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    material_type: Optional[str] = None
    audience: Optional[str] = None
    product_name: Optional[str] = Field(None, max_length=255)
    universe_name: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None

    @validator('material_type')
    def validate_material_type(cls, v):
        if v:
            valid_types = [e.value for e in MaterialType]
            if v not in valid_types:
                raise ValueError(f"material_type must be one of: {valid_types}")
        return v

    @validator('audience')
    def validate_audience(cls, v):
        if v:
            valid_audiences = [e.value for e in MaterialAudience]
            if v not in valid_audiences:
                raise ValueError(f"audience must be one of: {valid_audiences}")
        return v

    @validator('status')
    def validate_status(cls, v):
        if v:
            valid_statuses = [e.value for e in MaterialStatus]
            if v not in valid_statuses:
                raise ValueError(f"status must be one of: {valid_statuses}")
        return v


class MaterialResponse(MaterialBase):
    """Schema for material response"""
    id: int
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_format: Optional[str] = None
    file_size: Optional[int] = None
    version: Optional[str] = None
    health_score: int = 0
    usage_count: int = 0
    completeness_score: int = 0
    last_updated: Optional[datetime] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaterialUpload(BaseModel):
    """Schema for file upload metadata"""
    material_type: str = Field(..., description="Type of material")
    audience: str = Field(..., description="Target audience")
    universe_name: str = Field(..., description="Product universe")
    product_name: Optional[str] = Field(None, max_length=255)

    @validator('material_type')
    def validate_material_type(cls, v):
        valid_types = [e.value for e in MaterialType]
        if v not in valid_types:
            raise ValueError(f"material_type must be one of: {valid_types}")
        return v

    @validator('audience')
    def validate_audience(cls, v):
        valid_audiences = [e.value for e in MaterialAudience]
        if v not in valid_audiences:
            raise ValueError(f"audience must be one of: {valid_audiences}")
        return v

    @validator('universe_name')
    def validate_universe(cls, v):
        valid_universes = ["Public Cloud", "Private Cloud", "Bare Metal", "Hosting & Collaboration"]
        if v not in valid_universes:
            raise ValueError(f"universe_name must be one of: {valid_universes}")
        return v
