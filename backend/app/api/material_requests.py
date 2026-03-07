"""
Material Requests API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.models.material_request import MaterialRequest, MaterialRequestStatus, MaterialRequestCloseReason
from app.models.user import User
from app.models.material import Material
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.schemas.material_request import (
    MaterialRequestCreate,
    MaterialRequestAcknowledge,
    MaterialRequestClose,
    MaterialRequestDeliver,
    MaterialRequestResponse
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/material-requests", tags=["material-requests"])


def require_pmm_or_director(current_user: User = Depends(get_current_active_user)):
    """Require PMM or Director role"""
    if current_user.role not in ["pmm", "director", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PMM or Director access required"
        )
    return current_user


@router.post("", response_model=MaterialRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_material_request(
    request_data: MaterialRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new material request (Sales only)"""
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sales users can create material requests"
        )
    
    # Build products JSON structure
    products_json = None
    if request_data.products or request_data.universe_ids or request_data.category_ids:
        products_json = {
            "product_ids": request_data.products or [],
            "universe_ids": request_data.universe_ids or [],
            "category_ids": request_data.category_ids or []
        }
    
    material_request = MaterialRequest(
        requester_id=current_user.id,
        material_type=request_data.material_type,
        products=products_json,
        description=request_data.description,
        priority=request_data.priority,
        target_audience=request_data.target_audience,
        use_case=request_data.use_case,
        needed_by_date=request_data.needed_by_date,
        additional_notes=request_data.additional_notes,
        status=MaterialRequestStatus.PENDING
    )
    
    db.add(material_request)
    db.commit()
    db.refresh(material_request)
    
    return _build_response(material_request, db)


@router.get("", response_model=List[MaterialRequestResponse])
async def list_material_requests(
    status_filter: Optional[str] = None,
    assigned_to_me: Optional[bool] = None,
    my_requests: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List material requests"""
    query = db.query(MaterialRequest)
    
    # Sales users can only see their own requests
    if current_user.role == "sales":
        query = query.filter(MaterialRequest.requester_id == current_user.id)
    # PMM/Director can see all requests
    elif current_user.role in ["pmm", "director", "admin"]:
        if assigned_to_me:
            query = query.filter(MaterialRequest.assigned_to_id == current_user.id)
        if my_requests:
            query = query.filter(MaterialRequest.requester_id == current_user.id)
    
    if status_filter:
        try:
            status_enum = MaterialRequestStatus(status_filter)
            query = query.filter(MaterialRequest.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    requests = query.order_by(desc(MaterialRequest.created_at)).all()
    return [_build_response(req, db) for req in requests]


@router.get("/{request_id}", response_model=MaterialRequestResponse)
async def get_material_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific material request"""
    request = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material request not found"
        )
    
    # Sales can only see their own requests
    if current_user.role == "sales" and request.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return _build_response(request, db)


@router.post("/{request_id}/acknowledge", response_model=MaterialRequestResponse)
async def acknowledge_material_request(
    request_id: int,
    acknowledge_data: MaterialRequestAcknowledge,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pmm_or_director)
):
    """Acknowledge a material request and assign it"""
    request = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material request not found"
        )
    
    if request.status != MaterialRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not in pending status"
        )
    
    # Determine assignment
    assigned_to_id = acknowledge_data.assigned_to_id
    if current_user.role == "pmm":
        # PMM can only assign to themselves
        assigned_to_id = current_user.id
    elif current_user.role in ["director", "admin"]:
        # Director can assign to any PMM or themselves
        if assigned_to_id:
            assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
            if not assigned_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned user not found"
                )
            if assigned_user.role not in ["pmm", "director", "admin"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only assign to PMM, Director, or Admin"
                )
        else:
            assigned_to_id = current_user.id
    
    request.status = MaterialRequestStatus.ACKNOWLEDGED
    request.assigned_to_id = assigned_to_id
    request.acknowledged_at = datetime.utcnow()
    request.eta_date = acknowledge_data.eta_date
    
    db.commit()
    db.refresh(request)
    
    return _build_response(request, db)


@router.post("/{request_id}/close", response_model=MaterialRequestResponse)
async def close_material_request(
    request_id: int,
    close_data: MaterialRequestClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pmm_or_director)
):
    """Close a material request with a reason"""
    request = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material request not found"
        )
    
    if request.status == MaterialRequestStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot close a delivered request"
        )
    
    # Validate close reason
    if close_data.close_reason == MaterialRequestCloseReason.ALREADY_EXISTS:
        if not close_data.existing_material_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="existing_material_id is required when reason is 'already_exists'"
            )
            # Verify material exists
            material = db.query(Material).filter(Material.id == close_data.existing_material_id).first()
            if not material:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Existing material not found"
                )
    
    if close_data.close_reason == MaterialRequestCloseReason.PLANNED_LATER:
        if not close_data.planned_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="planned_date is required when reason is 'planned_later'"
            )
    
    request.status = MaterialRequestStatus.CLOSED
    request.closed_at = datetime.utcnow()
    request.close_reason = close_data.close_reason
    request.close_reason_details = close_data.close_reason_details
    request.existing_material_id = close_data.existing_material_id
    request.planned_date = close_data.planned_date
    
    db.commit()
    db.refresh(request)
    
    return _build_response(request, db)


@router.post("/{request_id}/deliver", response_model=MaterialRequestResponse)
async def deliver_material_request(
    request_id: int,
    deliver_data: MaterialRequestDeliver,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pmm_or_director)
):
    """Mark a material request as delivered"""
    request = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material request not found"
        )
    
    # Verify material exists
    material = db.query(Material).filter(Material.id == deliver_data.delivered_material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivered material not found"
        )
    
    request.status = MaterialRequestStatus.DELIVERED
    request.delivered_at = datetime.utcnow()
    request.delivered_material_id = deliver_data.delivered_material_id
    
    db.commit()
    db.refresh(request)
    
    return _build_response(request, db)


@router.post("/{request_id}/reopen", response_model=MaterialRequestResponse)
async def reopen_material_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pmm_or_director)
):
    """Reopen a closed material request"""
    request = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material request not found"
        )
    
    if request.status != MaterialRequestStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only reopen closed requests"
        )
    
    # Reset status to pending and clear close-related fields
    request.status = MaterialRequestStatus.PENDING
    request.closed_at = None
    request.close_reason = None
    request.close_reason_details = None
    request.existing_material_id = None
    request.planned_date = None
    # Keep assignment and acknowledgment info, but reset acknowledged_at if needed
    # Actually, let's keep the assignment - they can still work on it
    
    db.commit()
    db.refresh(request)
    
    return _build_response(request, db)


def _build_response(request: MaterialRequest, db: Session) -> MaterialRequestResponse:
    """Build response with related data"""
    requester = db.query(User).filter(User.id == request.requester_id).first()
    assigned_to = None
    if request.assigned_to_id:
        assigned_to = db.query(User).filter(User.id == request.assigned_to_id).first()
    
    delivered_material = None
    if request.delivered_material_id:
        delivered_material = db.query(Material).filter(Material.id == request.delivered_material_id).first()
    
    # Get product names if products JSON exists
    product_names = None
    product_ids = None
    if request.products:
        if isinstance(request.products, dict):
            product_ids = request.products.get('product_ids', [])
        elif isinstance(request.products, list):
            # Legacy format - just product IDs
            product_ids = request.products
        else:
            product_ids = []
        
        if product_ids:
            from app.models.product import Product
            products = db.query(Product).filter(Product.id.in_(product_ids)).all()
            product_names = [p.display_name or p.name for p in products]
    
    return MaterialRequestResponse(
        id=request.id,
        requester_id=request.requester_id,
        requester_name=requester.full_name if requester else None,
        requester_email=requester.email if requester else None,
        material_type=request.material_type,
        products=product_ids if product_ids else (request.products if isinstance(request.products, list) else None),
        product_names=product_names,
        universe_ids=request.products.get('universe_ids', []) if isinstance(request.products, dict) else None,
        category_ids=request.products.get('category_ids', []) if isinstance(request.products, dict) else None,
        description=request.description,
        priority=request.priority,
        target_audience=request.target_audience if isinstance(request.target_audience, dict) else None,
        use_case=request.use_case,
        needed_by_date=request.needed_by_date,
        additional_notes=request.additional_notes,
        status=request.status.value if isinstance(request.status, MaterialRequestStatus) else request.status,
        assigned_to_id=request.assigned_to_id,
        assigned_to_name=assigned_to.full_name if assigned_to else None,
        acknowledged_at=request.acknowledged_at,
        eta_date=request.eta_date,
        closed_at=request.closed_at,
        close_reason=request.close_reason.value if isinstance(request.close_reason, MaterialRequestCloseReason) else (request.close_reason if request.close_reason else None),
        close_reason_details=request.close_reason_details,
        existing_material_id=request.existing_material_id,
        planned_date=request.planned_date,
        delivered_at=request.delivered_at,
        delivered_material_id=request.delivered_material_id,
        delivered_material_name=delivered_material.name if delivered_material else None,
        created_at=request.created_at,
        updated_at=request.updated_at
    )
