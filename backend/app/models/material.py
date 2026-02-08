"""
Material model - represents sales enablement materials
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from enum import Enum
from datetime import datetime
from app.models.base import BaseModel
from app.models.associations import material_persona, material_segment

class MaterialType(str, Enum):
    PRODUCT_BRIEF = "product_brief"
    SALES_ENABLEMENT_DECK = "sales_enablement_deck"
    PRODUCT_PORTFOLIO = "product_portfolio"
    SALES_DECK = "sales_deck"
    DATASHEET = "datasheet"
    PRODUCT_CATALOG = "product_catalog"

class MaterialAudience(str, Enum):
    INTERNAL = "internal"
    CUSTOMER_FACING = "customer_facing"
    SHARED_ASSET = "shared_asset"

class MaterialStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    HIGH_USAGE = "high_usage"
    DECLINING = "declining"
    ARCHIVED = "archived"

class Material(BaseModel):
    """Material model"""
    __tablename__ = "materials"
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    # Note: Database uses PostgreSQL enum with names (PRODUCT_SALES_DECK, etc.)
    # We'll handle conversion in the API layer
    material_type = Column(String(50), nullable=False)
    other_type_description = Column(String(255), nullable=True)  # Description when material_type is "other"
    audience = Column(String(50), nullable=False)
    
    # Product/Universe
    product_name = Column(String(255), index=True)
    universe_name = Column(String(255), index=True)
    
    # File Information
    file_path = Column(String(500), nullable=True)  # Nullable to allow materials without files
    file_name = Column(String(255), nullable=True)  # Nullable to allow materials without files
    file_format = Column(String(50))  # pdf, pptx, docx
    file_size = Column(Integer)  # bytes
    
    # Versioning
    version = Column(String(50))
    
    # Status
    status = Column(SQLEnum(MaterialStatus), default=MaterialStatus.DRAFT)
    
    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="materials")
    
    # Health Metrics
    last_updated = Column(DateTime)
    completeness_score = Column(Integer, default=0)  # 0-100
    usage_count = Column(Integer, default=0)
    health_score = Column(Integer, default=0)  # 0-100
    
    # Metadata
    description = Column(Text)
    tags = Column(Text)  # JSON array of tags
    keywords = Column(Text)  # JSON array of keywords
    use_cases = Column(Text)  # JSON array of use cases
    pain_points = Column(Text)  # JSON array of pain points
    
    # Relationships (using string references to avoid circular imports)
    # Note: ContentBlockUsage relationship removed temporarily to fix import issues
    # content_blocks = relationship("ContentBlockUsage", back_populates="material")
    health_history = relationship("MaterialHealthHistory", back_populates="material", lazy="dynamic")
    usage_events = relationship("MaterialUsage", back_populates="material", lazy="dynamic")
    track_materials = relationship("TrackMaterial", back_populates="material", lazy="dynamic")
    shared_links = relationship("SharedLink", back_populates="material", lazy="dynamic")
    personas = relationship("Persona", secondary=material_persona, back_populates="material_references", lazy="dynamic")
    segments = relationship("Segment", secondary=material_segment, back_populates="material_references", lazy="dynamic")
