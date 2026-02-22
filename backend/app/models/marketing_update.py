"""
Marketing Update model - represents marketing news and information for sales teams
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class MarketingUpdate(BaseModel):
    """Marketing Update model"""
    __tablename__ = "marketing_updates"
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    short_description = Column(Text, nullable=True)  # Short description for card display
    content = Column(Text, nullable=False)  # Full content for detail view (HTML supported)
    
    # Category and Subcategory
    category = Column(String(50), nullable=False, index=True)  # Main category (competitive_intelligence, market_trends_insights, etc.)
    subcategory = Column(String(100), nullable=True)  # Subcategory within the main category
    
    # Product Hierarchy Linkage (optional - some updates may be product-specific)
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Store names for easier querying (denormalized)
    universe_name = Column(String(100), nullable=True, index=True)
    category_name = Column(String(255), nullable=True)
    product_name = Column(String(255), nullable=True, index=True)
    
    # Priority and Targeting
    priority = Column(String(20), nullable=True, default='informational')  # critical, important, informational
    target_audience = Column(String(100), nullable=True)  # all_sales, specific_role, specific_region, etc.
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, nullable=True, index=True)  # When the update was published
    expires_at = Column(DateTime, nullable=True)  # Optional expiration date for time-sensitive updates
    
    # Attached Material
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)  # Optional attached material
    
    # Relationships
    universe = relationship("Universe", foreign_keys=[universe_id])
    category_rel = relationship("Category", foreign_keys=[category_id])
    product = relationship("Product", foreign_keys=[product_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    material = relationship("Material", foreign_keys=[material_id])
