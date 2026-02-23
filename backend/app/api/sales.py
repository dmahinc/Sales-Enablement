"""
Sales API endpoints - Sales persona customer management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/sales", tags=["sales"])


class CustomerResponse(BaseModel):
    """Response model for customer data"""
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[str]
    assigned_sales_id: Optional[int]
    created_by_id: Optional[int]
    assigned_sales_name: Optional[str]
    created_by_name: Optional[str]
    
    class Config:
        from_attributes = True


@router.get("/customers", response_model=List[CustomerResponse])
async def get_my_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get customers assigned to or created by the current sales person
    
    Returns ONLY customers (role == 'customer') where:
    - assigned_sales_id == current_user.id, OR
    - created_by_id == current_user.id
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    # Get ONLY customers (role == 'customer') assigned to this sales person or created by them
    customers = db.query(User).filter(
        and_(
            User.role == "customer",  # Only customers, not PMMs or other roles
            or_(
                User.assigned_sales_id == current_user.id,
                User.created_by_id == current_user.id
            )
        )
    ).order_by(User.created_at.desc()).all()
    
    result = []
    for customer in customers:
        result.append({
            "id": customer.id,
            "email": customer.email,
            "full_name": customer.full_name,
            "role": customer.role,
            "is_active": customer.is_active,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "assigned_sales_id": customer.assigned_sales_id,
            "created_by_id": customer.created_by_id,
            "assigned_sales_name": customer.assigned_sales.full_name if customer.assigned_sales else None,
            "created_by_name": customer.creator.full_name if customer.creator else None,
        })
    
    return result


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new customer account (Sales only)
    The customer will be automatically assigned to the current sales person
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    # Ensure role is customer
    if customer_data.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only create customer accounts"
        )
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == customer_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create customer
    from app.core.security import get_password_hash
    customer = User(
        email=customer_data.email,
        full_name=customer_data.full_name,
        hashed_password=get_password_hash(customer_data.password),
        role="customer",
        is_active=True,
        assigned_sales_id=current_user.id,  # Assign to current sales person
        created_by_id=current_user.id  # Track creator
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    return {
        "id": customer.id,
        "email": customer.email,
        "full_name": customer.full_name,
        "role": customer.role,
        "is_active": customer.is_active,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "assigned_sales_id": customer.assigned_sales_id,
        "created_by_id": customer.created_by_id,
        "assigned_sales_name": customer.assigned_sales.full_name if customer.assigned_sales else None,
        "created_by_name": customer.creator.full_name if customer.creator else None,
    }


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a customer account (Sales can only update their own customers)
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    # Get customer and verify ownership
    customer = db.query(User).filter(User.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    if customer.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only update customer accounts"
        )
    
    # Verify this sales person owns this customer
    if customer.assigned_sales_id != current_user.id and customer.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update customers assigned to you or created by you"
        )
    
    # Update customer
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            from app.core.security import get_password_hash
            setattr(customer, "hashed_password", get_password_hash(value))
        elif field != "password":
            setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    return {
        "id": customer.id,
        "email": customer.email,
        "full_name": customer.full_name,
        "role": customer.role,
        "is_active": customer.is_active,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "assigned_sales_id": customer.assigned_sales_id,
        "created_by_id": customer.created_by_id,
        "assigned_sales_name": customer.assigned_sales.full_name if customer.assigned_sales else None,
        "created_by_name": customer.creator.full_name if customer.creator else None,
    }


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a customer account (Sales can only delete their own customers)
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    # Get customer and verify ownership
    customer = db.query(User).filter(User.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    if customer.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only delete customer accounts"
        )
    
    # Verify this sales person owns this customer
    if customer.assigned_sales_id != current_user.id and customer.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete customers assigned to you or created by you"
        )
    
    db.delete(customer)
    db.commit()
    
    return None
