"""
SharedLink model - Track document sharing with customers
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from app.models.base import BaseModel
import secrets


class SharedLink(BaseModel):
    """SharedLink model - tracks document sharing with customers"""
    __tablename__ = "shared_links"
    
    # Link identification
    unique_token = Column(String(64), unique=True, nullable=False, index=True)
    
    # Material reference
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    
    # User who created the share
    shared_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Customer information
    customer_email = Column(String(255), nullable=True, index=True)
    customer_name = Column(String(255), nullable=True)
    
    # Link management
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(days=90))
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Tracking
    access_count = Column(Integer, default=0, nullable=False)  # Total views/accesses
    last_accessed_at = Column(DateTime, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)  # Total downloads
    last_downloaded_at = Column(DateTime, nullable=True)
    
    # Relationships
    material = relationship("Material", back_populates="shared_links")
    shared_by_user = relationship("User", foreign_keys=[shared_by_user_id])
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_shared_links_material', 'material_id'),
        Index('idx_shared_links_customer', 'customer_email'),
        Index('idx_shared_links_user', 'shared_by_user_id'),
        Index('idx_shared_links_active', 'is_active', 'expires_at'),
    )
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure unique token for the shareable link"""
        return secrets.token_urlsafe(32)
    
    def is_expired(self) -> bool:
        """Check if the link has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if the link is valid (active and not expired)"""
        return self.is_active and not self.is_expired()
    
    def record_access(self):
        """Record that the link was accessed (viewed)"""
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()
    
    def record_view(self):
        """Record that the link was viewed (alias for record_access for clarity)"""
        self.record_access()
    
    def record_download(self):
        """Record that the document was downloaded"""
        self.download_count += 1
        self.last_downloaded_at = datetime.utcnow()
        # Also increment access count since download implies access
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()
