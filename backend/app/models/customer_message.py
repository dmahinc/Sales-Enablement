"""
CustomerMessage model - Communication between customers and sales contacts
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class CustomerMessage(BaseModel):
    """CustomerMessage model - tracks messages between customers and sales contacts"""
    __tablename__ = "customer_messages"
    
    # Participants
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sales_contact_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Message content
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    
    # Message metadata
    sent_by_customer = Column(Boolean, default=True, nullable=False)  # True if customer sent, False if sales sent
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    
    # Threading (for replies)
    parent_message_id = Column(Integer, ForeignKey("customer_messages.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="customer_messages")
    sales_contact = relationship("User", foreign_keys=[sales_contact_id], backref="sales_messages")
    parent_message = relationship("CustomerMessage", remote_side="CustomerMessage.id", backref="replies")
    
    # Indexes
    __table_args__ = (
        Index('idx_customer_messages_customer', 'customer_id'),
        Index('idx_customer_messages_sales', 'sales_contact_id'),
        Index('idx_customer_messages_thread', 'parent_message_id'),
        Index('idx_customer_messages_unread', 'customer_id', 'is_read'),
    )
    
    def mark_as_read(self):
        """Mark message as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()
