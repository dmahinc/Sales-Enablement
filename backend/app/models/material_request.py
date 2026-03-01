"""
Material Request model - represents requests from Sales for new materials
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from datetime import datetime
import enum

class MaterialRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    DELIVERED = "delivered"
    CLOSED = "closed"

class MaterialRequestCloseReason(str, enum.Enum):
    ALREADY_EXISTS = "already_exists"
    PLANNED_LATER = "planned_later"
    NOT_PLANNED = "not_planned"

class MaterialRequest(BaseModel):
    """Material Request model"""
    __tablename__ = "material_requests"
    
    # Requester (Sales person)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    requester = relationship("User", foreign_keys=[requester_id])
    
    # Request Details
    material_type = Column(String(50), nullable=False)  # Product Brief, Sales Deck, Battle Card, etc.
    products = Column(JSON, nullable=True)  # JSON: {universe_ids: [], category_ids: [], product_ids: []}
    description = Column(Text, nullable=False)  # Required: explanation of needs
    priority = Column(String(20), nullable=False, default="medium")  # high, medium, low
    
    # Optional Details
    target_audience = Column(JSON, nullable=True)  # JSON: {categories: [], personas: {category: [personas]}}
    use_case = Column(Text, nullable=True)
    needed_by_date = Column(DateTime, nullable=True)
    additional_notes = Column(Text, nullable=True)
    
    # Status and Assignment
    status = Column(
        SQLEnum(MaterialRequestStatus, values_callable=lambda x: [e.value for e in x],
                name='materialrequeststatus', create_constraint=False),
        default=MaterialRequestStatus.PENDING, index=True
    )
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # PMM/Director handling it
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    
    # Acknowledgment
    acknowledged_at = Column(DateTime, nullable=True)
    eta_date = Column(DateTime, nullable=True)  # Expected delivery date
    
    # Closing
    closed_at = Column(DateTime, nullable=True)
    close_reason = Column(
        SQLEnum(MaterialRequestCloseReason, values_callable=lambda x: [e.value for e in x],
                name='materialrequestclosereason', create_constraint=False),
        nullable=True
    )
    close_reason_details = Column(Text, nullable=True)  # Additional explanation for close reason
    existing_material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)  # If "already exists"
    planned_date = Column(DateTime, nullable=True)  # If "planned later"
    
    # Delivery
    delivered_at = Column(DateTime, nullable=True)
    delivered_material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)  # Link to delivered material
    delivered_material = relationship("Material", foreign_keys=[delivered_material_id])
