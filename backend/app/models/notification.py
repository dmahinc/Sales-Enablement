"""
Notification model - represents notifications sent to users about new content
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel, Base

# Association table for many-to-many relationship between notifications and users
notification_recipients = Table(
    'notification_recipients',
    Base.metadata,
    Column('notification_id', Integer, ForeignKey('notifications.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('is_read', Boolean, default=False, nullable=False),
    Column('read_at', DateTime, nullable=True)
)


class Notification(BaseModel):
    """Notification model"""
    __tablename__ = "notifications"
    
    # Notification content
    title = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    
    # Notification type and target
    notification_type = Column(String(50), nullable=False, index=True)  # 'material', 'product_release', 'marketing_update', 'track'
    target_id = Column(Integer, nullable=False, index=True)  # ID of the material/release/update/track
    
    # Link to the content (optional - for navigation)
    link_path = Column(String(255), nullable=True)  # e.g., '/materials', '/product-releases/123'
    
    # Sender information
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    sent_by = relationship("User", foreign_keys=[sent_by_id])
    recipients = relationship("User", secondary=notification_recipients, back_populates="notifications")
