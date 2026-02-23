"""
CustomerFavorite model - Customer favorites/bookmarks for shared materials
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class CustomerFavorite(BaseModel):
    """CustomerFavorite model - tracks materials favorited by customers"""
    __tablename__ = "customer_favorites"

    # Foreign keys
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="favorites")
    material = relationship("Material", foreign_keys=[material_id])

    # Unique constraint: a customer can only favorite a material once
    __table_args__ = (
        UniqueConstraint('customer_id', 'material_id', name='uq_customer_favorite'),
        Index('idx_customer_favorites_customer', 'customer_id'),
        Index('idx_customer_favorites_material', 'material_id'),
    )
