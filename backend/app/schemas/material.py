"""
Pydantic schemas for Material model
"""
from pydantic import BaseModel, Field, validator, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.material import MaterialType, MaterialAudience, MaterialStatus
import json


def convert_db_enum_to_frontend(db_value: str, enum_class) -> str:
    """Convert database enum value to frontend enum value"""
    if not db_value:
        return db_value
    
    # Mapping from database enum names to frontend enum values
    material_type_mapping = {
        'PRODUCT_BRIEF': 'product_brief',
        'PRODUCT_SALES_ENABLEMENT_DECK': 'sales_enablement_deck',
        'PRODUCT_PORTFOLIO_PRESENTATION': 'product_portfolio',
        'PRODUCT_SALES_DECK': 'sales_deck',
        'PRODUCT_DATASHEET': 'datasheet',
        'PRODUCT_CATALOG': 'product_catalog',
    }
    
    audience_mapping = {
        'INTERNAL': 'internal',
        'CUSTOMER_FACING': 'customer_facing',
        'BOTH': 'shared_asset',
    }
    
    status_mapping = {
        'DRAFT': 'draft',
        'REVIEW': 'review',
        'PUBLISHED': 'published',
        'ARCHIVED': 'archived',
    }
    
    if enum_class == MaterialType:
        return material_type_mapping.get(db_value, db_value.lower())
    elif enum_class == MaterialAudience:
        return audience_mapping.get(db_value, db_value.lower())
    elif enum_class == MaterialStatus:
        return status_mapping.get(db_value, db_value.lower())
    
    return db_value


def parse_json_field(value) -> Optional[List[str]]:
    """Parse JSON string field to list"""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            # If it's not valid JSON, try splitting by comma
            return [v.strip() for v in value.split(',') if v.strip()]
    return []


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
    health_score: int = Field(default=0)
    usage_count: int = Field(default=0)
    completeness_score: int = Field(default=0)
    last_updated: Optional[datetime] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('material_type', mode='before')
    @classmethod
    def convert_material_type(cls, v):
        """Convert database enum to frontend enum"""
        return convert_db_enum_to_frontend(v, MaterialType)

    @field_validator('audience', mode='before')
    @classmethod
    def convert_audience(cls, v):
        """Convert database enum to frontend enum"""
        return convert_db_enum_to_frontend(v, MaterialAudience)

    @field_validator('status', mode='before')
    @classmethod
    def convert_status(cls, v):
        """Convert database enum to frontend enum"""
        if v:
            return convert_db_enum_to_frontend(v, MaterialStatus)
        return 'draft'

    @field_validator('tags', 'keywords', 'use_cases', 'pain_points', mode='before')
    @classmethod
    def parse_list_fields(cls, v):
        """Parse JSON string or None to list"""
        return parse_json_field(v)

    @field_validator('health_score', 'usage_count', 'completeness_score', mode='before')
    @classmethod
    def handle_none_int(cls, v):
        """Convert None to 0 for integer fields"""
        return v if v is not None else 0

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
