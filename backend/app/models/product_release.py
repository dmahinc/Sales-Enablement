"""
Product Release model - represents product release news
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class ProductRelease(BaseModel):
    """Product Release model"""
    __tablename__ = "product_releases"
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    short_description = Column(Text, nullable=True)  # Short description for card display
    content = Column(Text, nullable=False)  # Full content for detail view
    
    # Product Hierarchy Linkage
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Store names for easier querying (denormalized)
    universe_name = Column(String(100), nullable=True, index=True)
    category_name = Column(String(255), nullable=True)
    product_name = Column(String(255), nullable=True, index=True)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, nullable=True, index=True)  # When the release was published
    
    # Relationships
    universe = relationship("Universe", foreign_keys=[universe_id])
    category = relationship("Category", foreign_keys=[category_id])
    product = relationship("Product", foreign_keys=[product_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
