"""
Material Request Pydantic schemas for API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MaterialRequestStatus(str, Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    DELIVERED = "delivered"
    CLOSED = "closed"

class MaterialRequestCloseReason(str, Enum):
    ALREADY_EXISTS = "already_exists"
    PLANNED_LATER = "planned_later"
    NOT_PLANNED = "not_planned"

class MaterialRequestCreate(BaseModel):
    material_type: str = Field(..., description="Type of material requested")
    products: Optional[List[int]] = Field(None, description="List of product IDs")
    universe_ids: Optional[List[int]] = Field(None, description="List of universe IDs")
    category_ids: Optional[List[int]] = Field(None, description="List of category IDs")
    description: str = Field(..., min_length=1, description="Explanation of needs")
    priority: str = Field(default="medium", pattern="^(high|medium|low)$")
    target_audience: Optional[dict] = Field(None, description="Target audience with categories and personas")
    use_case: Optional[str] = None
    needed_by_date: Optional[datetime] = None
    additional_notes: Optional[str] = None

class MaterialRequestAcknowledge(BaseModel):
    assigned_to_id: Optional[int] = Field(None, description="PMM/Director ID to assign to (Director only)")
    eta_date: datetime = Field(..., description="Expected delivery date")

class MaterialRequestClose(BaseModel):
    close_reason: MaterialRequestCloseReason = Field(..., description="Reason for closing")
    close_reason_details: Optional[str] = None
    existing_material_id: Optional[int] = Field(None, description="Material ID if reason is 'already_exists'")
    planned_date: Optional[datetime] = Field(None, description="Planned date if reason is 'planned_later'")

class MaterialRequestDeliver(BaseModel):
    delivered_material_id: int = Field(..., description="ID of the delivered material")

class MaterialRequestResponse(BaseModel):
    id: int
    requester_id: int
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    material_type: str
    products: Optional[List[int]] = None
    product_names: Optional[List[str]] = None
    universe_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None
    description: str
    priority: str
    target_audience: Optional[dict] = None
    use_case: Optional[str] = None
    needed_by_date: Optional[datetime] = None
    additional_notes: Optional[str] = None
    status: str
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    eta_date: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    close_reason: Optional[str] = None
    close_reason_details: Optional[str] = None
    existing_material_id: Optional[int] = None
    planned_date: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivered_material_id: Optional[int] = None
    delivered_material_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
