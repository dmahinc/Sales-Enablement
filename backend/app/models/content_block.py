"""
Content Block model - represents reusable content blocks
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from enum import Enum
from app.models.base import BaseModel

class ContentBlockType(str, Enum):
    NARRATIVE = "narrative"
    VALUE_PROP = "value_prop"
    PROOF_POINT = "proof_point"
    USE_CASE = "use_case"
    OTHER = "other"

class ContentBlock(BaseModel):
    """Content Block model"""
    __tablename__ = "content_blocks"
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    block_type = Column(String(50), nullable=False)  # narrative, value_prop, proof_point
    content = Column(Text, nullable=False)
    
    # Tagging
    tags = Column(JSON)  # Array of tags
    keywords = Column(JSON)  # Array of keywords
    use_cases = Column(JSON)  # Array of use cases
    products = Column(JSON)  # Array of product names
    segments = Column(JSON)  # Array of segment names
    personas = Column(JSON)  # Array of persona names
    core_values = Column(JSON)  # Array of core values
    
    # Ownership
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Ratings & Comments
    rating_average = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    
    # Usage
    usage_count = Column(Integer, default=0)  # How many materials use this block
    
    # Relationships
    ratings = relationship("ContentBlockRating", back_populates="content_block")
    comments = relationship("ContentBlockComment", back_populates="content_block")
    material_usages = relationship("ContentBlockUsage", back_populates="content_block")

class ContentBlockRating(BaseModel):
    """Content Block Rating"""
    __tablename__ = "content_block_ratings"
    
    content_block_id = Column(Integer, ForeignKey("content_blocks.id"))
    content_block = relationship("ContentBlock", back_populates="ratings")
    
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)  # 1-5
    
    comment = Column(Text)

class ContentBlockComment(BaseModel):
    """Content Block Comment"""
    __tablename__ = "content_block_comments"
    
    content_block_id = Column(Integer, ForeignKey("content_blocks.id"))
    content_block = relationship("ContentBlock", back_populates="comments")
    
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text, nullable=False)

class ContentBlockUsage(BaseModel):
    """Tracks which materials use which content blocks"""
    __tablename__ = "content_block_usages"
    
    content_block_id = Column(Integer, ForeignKey("content_blocks.id"))
    content_block = relationship("ContentBlock", back_populates="material_usages")
    
    material_id = Column(Integer, ForeignKey("materials.id"))
    # Note: Material relationship removed to avoid circular import issues
    # material = relationship("Material", back_populates="content_blocks")
