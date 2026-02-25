"""
Sales API endpoints - Sales persona customer management and messaging
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.shared_link import SharedLink
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel, EmailStr
from sqlalchemy.exc import ProgrammingError, OperationalError

# Try to import CustomerMessage - it may not exist if table hasn't been created yet
try:
    from app.models.customer_message import CustomerMessage
    CUSTOMER_MESSAGES_AVAILABLE = True
except (ImportError, Exception):
    CustomerMessage = None
    CUSTOMER_MESSAGES_AVAILABLE = False

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


# ========== MESSAGING ENDPOINTS ==========

class MessageCreate(BaseModel):
    """Schema for creating a message from sales to customer"""
    customer_id: int
    subject: Optional[str] = None
    message: str
    parent_message_id: Optional[int] = None
    material_id: Optional[int] = None  # Optional: attach a material to the message


class MessageResponse(BaseModel):
    """Response model for messages"""
    id: int
    customer_id: int
    sales_contact_id: Optional[int]
    subject: Optional[str]
    message: str
    sent_by_customer: bool
    is_read: bool
    read_at: Optional[datetime]
    parent_message_id: Optional[int]
    created_at: datetime
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    sales_contact_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    """Summary of a conversation with a customer"""
    customer_id: int
    customer_name: str
    customer_email: str
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    total_messages: int = 0
    last_activity_at: Optional[datetime] = None


@router.get("/messages/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of conversations with customers assigned to this sales person
    
    Returns conversations sorted by last activity (most recent first)
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        return []
    
    try:
        # Get all customers assigned to or created by this sales person
        customers = db.query(User).filter(
            and_(
                User.role == "customer",
                or_(
                    User.assigned_sales_id == current_user.id,
                    User.created_by_id == current_user.id
                )
            )
        ).all()
        
        if search:
            customers = [c for c in customers if search.lower() in c.full_name.lower() or search.lower() in c.email.lower()]
        
        conversations = []
        for customer in customers:
            # Get all messages in this conversation
            messages = db.query(CustomerMessage).filter(
                and_(
                    CustomerMessage.customer_id == customer.id,
                    CustomerMessage.sales_contact_id == current_user.id
                )
            ).order_by(CustomerMessage.created_at.desc()).all()
            
            # Count unread messages (messages sent by customer that sales hasn't read)
            unread_count = sum(1 for msg in messages if msg.sent_by_customer and not msg.is_read)
            
            # Get last message
            last_message = messages[0] if messages else None
            
            # Format last message for response
            last_message_response = None
            if last_message:
                last_message_response = MessageResponse(
                    id=last_message.id,
                    customer_id=last_message.customer_id,
                    sales_contact_id=last_message.sales_contact_id,
                    subject=last_message.subject,
                    message=last_message.message,
                    sent_by_customer=last_message.sent_by_customer,
                    is_read=last_message.is_read,
                    read_at=last_message.read_at,
                    parent_message_id=last_message.parent_message_id,
                    created_at=last_message.created_at,
                    customer_name=customer.full_name,
                    customer_email=customer.email,
                    sales_contact_name=current_user.full_name
                )
            
            # Include ALL customers, even if they have no messages yet
            conversations.append(ConversationSummary(
                customer_id=customer.id,
                customer_name=customer.full_name,
                customer_email=customer.email,
                last_message=last_message_response,
                unread_count=unread_count,
                total_messages=len(messages),
                last_activity_at=last_message.created_at if last_message else None
            ))
        
        # Sort by last activity (most recent first), then by customer name for those without messages
        conversations.sort(key=lambda x: (
            x.last_activity_at if x.last_activity_at else datetime.min,
            x.customer_name.lower()
        ), reverse=True)
        
        return conversations
        
    except (ProgrammingError, OperationalError) as e:
        return []
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching conversations: {str(e)}")
        return []


@router.get("/messages/unread-count", response_model=dict)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get total unread messages count for sales person"""
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        return {"unread_count": 0}
    
    try:
        # Count unread messages from customers (sent_by_customer=True and is_read=False)
        unread_count = db.query(CustomerMessage).filter(
            and_(
                CustomerMessage.sales_contact_id == current_user.id,
                CustomerMessage.sent_by_customer == True,
                CustomerMessage.is_read == False
            )
        ).count()
        
        return {"unread_count": unread_count}
    except (ProgrammingError, OperationalError):
        return {"unread_count": 0}
    except Exception:
        return {"unread_count": 0}


@router.get("/messages/{customer_id}", response_model=List[MessageResponse])
async def get_conversation(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get full conversation thread with a specific customer
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        return []
    
    try:
        # Verify customer is assigned to this sales person
        customer = db.query(User).filter(
            and_(
                User.id == customer_id,
                User.role == "customer",
                or_(
                    User.assigned_sales_id == current_user.id,
                    User.created_by_id == current_user.id
                )
            )
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found or not assigned to you"
            )
        
        # Get all messages in this conversation
        messages = db.query(CustomerMessage).filter(
            and_(
                CustomerMessage.customer_id == customer_id,
                CustomerMessage.sales_contact_id == current_user.id
            )
        ).order_by(CustomerMessage.created_at.asc()).all()  # Ascending for chronological display
        
        # Format messages for response
        result = []
        for msg in messages:
            result.append(MessageResponse(
                id=msg.id,
                customer_id=msg.customer_id,
                sales_contact_id=msg.sales_contact_id,
                subject=msg.subject,
                message=msg.message,
                sent_by_customer=msg.sent_by_customer,
                is_read=msg.is_read,
                read_at=msg.read_at,
                parent_message_id=msg.parent_message_id,
                created_at=msg.created_at,
                customer_name=customer.full_name,
                customer_email=customer.email,
                sales_contact_name=current_user.full_name
            ))
        
        return result
        
    except HTTPException:
        raise
    except (ProgrammingError, OperationalError):
        return []
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching conversation: {str(e)}")
        return []


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a message to a customer
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )
    
    # Verify customer is assigned to this sales person
    customer = db.query(User).filter(
        and_(
            User.id == message_data.customer_id,
            User.role == "customer",
            or_(
                User.assigned_sales_id == current_user.id,
                User.created_by_id == current_user.id
            )
        )
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or not assigned to you"
        )
    
    # Create message (sent_by_customer=False for sales messages)
    message = CustomerMessage(
        customer_id=message_data.customer_id,
        sales_contact_id=current_user.id,
        subject=message_data.subject,
        message=message_data.message,
        sent_by_customer=False,  # Sales is sending
        parent_message_id=message_data.parent_message_id,
        is_read=False  # Customer hasn't read it yet
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Format response
    return MessageResponse(
        id=message.id,
        customer_id=message.customer_id,
        sales_contact_id=message.sales_contact_id,
        subject=message.subject,
        message=message.message,
        sent_by_customer=message.sent_by_customer,
        is_read=message.is_read,
        read_at=message.read_at,
        parent_message_id=message.parent_message_id,
        created_at=message.created_at,
        customer_name=customer.full_name,
        customer_email=customer.email,
        sales_contact_name=current_user.full_name
    )


@router.put("/messages/{message_id}/read", response_model=MessageResponse)
async def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark a customer message as read (sales reading customer's message)
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )
    
    try:
        message = db.query(CustomerMessage).filter(
            and_(
                CustomerMessage.id == message_id,
                CustomerMessage.sales_contact_id == current_user.id,
                CustomerMessage.sent_by_customer == True  # Only mark customer messages as read
            )
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        message.mark_as_read()
        db.commit()
        db.refresh(message)
        
        # Get customer info for response
        customer = db.query(User).filter(User.id == message.customer_id).first()
        
        return MessageResponse(
            id=message.id,
            customer_id=message.customer_id,
            sales_contact_id=message.sales_contact_id,
            subject=message.subject,
            message=message.message,
            sent_by_customer=message.sent_by_customer,
            is_read=message.is_read,
            read_at=message.read_at,
            parent_message_id=message.parent_message_id,
            created_at=message.created_at,
            customer_name=customer.full_name if customer else None,
            customer_email=customer.email if customer else None,
            sales_contact_name=current_user.full_name
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error marking message as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating message"
        )
