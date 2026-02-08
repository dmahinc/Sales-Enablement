"""
AI Correction tracking model for learning from user corrections
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Float, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class AICorrection(BaseModel):
    """Track user corrections to AI suggestions for learning"""
    __tablename__ = "ai_corrections"
    
    # File information
    filename = Column(String(255), nullable=False, index=True)
    file_hash = Column(String(64), nullable=True, index=True)  # SHA-256 hash for deduplication
    
    # AI suggestions (what AI predicted)
    ai_universe_id = Column(Integer, ForeignKey('universes.id'), nullable=True)
    ai_category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    ai_product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    ai_confidence = Column(Float, nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    
    # User corrections (what user actually selected)
    corrected_universe_id = Column(Integer, ForeignKey('universes.id'), nullable=True)
    corrected_category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    corrected_product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    
    # Context for learning
    file_content_summary = Column(Text, nullable=True)  # Extracted text summary
    file_metadata = Column(JSON, nullable=True)  # File metadata as JSON
    
    # User information
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="ai_corrections")
    ai_universe = relationship("Universe", foreign_keys=[ai_universe_id])
    ai_category = relationship("Category", foreign_keys=[ai_category_id])
    ai_product = relationship("Product", foreign_keys=[ai_product_id])
    corrected_universe = relationship("Universe", foreign_keys=[corrected_universe_id])
    corrected_category = relationship("Category", foreign_keys=[corrected_category_id])
    corrected_product = relationship("Product", foreign_keys=[corrected_product_id])
