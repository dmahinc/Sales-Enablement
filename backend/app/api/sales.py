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
from app.models.usage import MaterialUsage, UsageAction
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import ProgrammingError, OperationalError
import secrets

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
    company_name: Optional[str] = None
    password: Optional[str] = None  # Only included if email was not sent
    email_sent: Optional[bool] = None  # Whether welcome email was sent
    message: Optional[str] = None  # Message about email sending status
    
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
        # Get company_name from the most recent shared link for this customer
        company_name = None
        try:
            latest_link = db.query(SharedLink).filter(
                and_(
                    SharedLink.customer_email == customer.email,
                    SharedLink.shared_by_user_id == current_user.id,
                    SharedLink.company_name.isnot(None)
                )
            ).order_by(SharedLink.created_at.desc()).first()
            
            if latest_link:
                company_name = latest_link.company_name
        except Exception:
            # If there's an error, just continue without company_name
            pass
        
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
            "company_name": company_name,
            "password": None,  # Never return password in list endpoint
            "email_sent": None,
            "message": None,
        })
    
    return result


class CustomerCreateRequest(BaseModel):
    """Request to create a customer (from My Customers page)"""
    email: EmailStr
    first_name: str
    last_name: str
    password: str = Field(..., min_length=8)
    company_name: Optional[str] = None
    is_active: bool = True
    send_welcome_email: bool = False


class CustomerAssignRequest(BaseModel):
    """Request to assign/create a customer (from Share modal)"""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None  # For backward compatibility
    company_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)  # Required when creating new customer
    send_welcome_email: bool = False


@router.post("/customers/assign", response_model=CustomerResponse, status_code=status.HTTP_200_OK)
async def assign_or_create_customer(
    customer_data: CustomerAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Assign an existing customer to the current sales person, or create a new customer if they don't exist.
    This endpoint is used when sharing materials - it ensures the customer is assigned to the sales person.
    
    If customer exists:
    - If already assigned to this sales person: return existing customer
    - If assigned to another sales person: reassign to this sales person (allows multiple assignments over time)
    - If not assigned: assign to this sales person
    
    If customer doesn't exist:
    - Create new customer account with a default password
    - Assign to current sales person
    """
    if current_user.role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for sales users"
        )
    
    # Check if customer exists
    existing_customer = db.query(User).filter(User.email == customer_data.email).first()
    
    if existing_customer:
        # Customer exists
        if existing_customer.role != "customer":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email belongs to a non-customer account"
            )
        
        # Assign to current sales person (update if needed)
        if existing_customer.assigned_sales_id != current_user.id:
            existing_customer.assigned_sales_id = current_user.id
            # Update created_by_id if not set
            if not existing_customer.created_by_id:
                existing_customer.created_by_id = current_user.id
            db.commit()
            db.refresh(existing_customer)
        
        return {
            "id": existing_customer.id,
            "email": existing_customer.email,
            "full_name": existing_customer.full_name,
            "role": existing_customer.role,
            "is_active": existing_customer.is_active,
            "created_at": existing_customer.created_at.isoformat() if existing_customer.created_at else None,
            "assigned_sales_id": existing_customer.assigned_sales_id,
            "created_by_id": existing_customer.created_by_id,
            "assigned_sales_name": existing_customer.assigned_sales.full_name if existing_customer.assigned_sales else None,
            "created_by_name": existing_customer.creator.full_name if existing_customer.creator else None,
        }
    else:
        # Customer doesn't exist - create new customer
        # Build full_name from first_name and last_name, or use full_name if provided
        full_name = None
        if customer_data.first_name and customer_data.last_name:
            full_name = f"{customer_data.first_name} {customer_data.last_name}".strip()
        elif customer_data.full_name:
            full_name = customer_data.full_name
        elif customer_data.first_name:
            full_name = customer_data.first_name
        elif customer_data.last_name:
            full_name = customer_data.last_name
        
        if not full_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="first_name and last_name (or full_name) are required when creating a new customer"
            )
        
        # Password is required when creating a new customer
        if not customer_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="password is required when creating a new customer"
            )
        
        from app.core.security import get_password_hash
        new_customer = User(
            email=customer_data.email,
            full_name=full_name,
            hashed_password=get_password_hash(customer_data.password),
            role="customer",
            is_active=True,
            assigned_sales_id=current_user.id,
            created_by_id=current_user.id
        )
        
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        
        # Send welcome email if requested
        email_sent = False
        if customer_data.send_welcome_email:
            from app.core.email import send_user_creation_notification
            from app.core.config import settings
            email_sent = send_user_creation_notification(
                user_email=new_customer.email,
                user_name=new_customer.full_name,
                user_password=customer_data.password,
                user_role="customer",
                platform_url=settings.PLATFORM_URL
            )
        
        response_data = {
            "id": new_customer.id,
            "email": new_customer.email,
            "full_name": new_customer.full_name,
            "role": new_customer.role,
            "is_active": new_customer.is_active,
            "created_at": new_customer.created_at.isoformat() if new_customer.created_at else None,
            "assigned_sales_id": new_customer.assigned_sales_id,
            "created_by_id": new_customer.created_by_id,
            "assigned_sales_name": new_customer.assigned_sales.full_name if new_customer.assigned_sales else None,
            "created_by_name": new_customer.creator.full_name if new_customer.creator else None,
        }
        
        # If email was not sent (SMTP disabled or failed), include password in response
        # so sales person can share it manually
        if not email_sent:
            response_data["password"] = customer_data.password
            response_data["email_sent"] = False
            response_data["message"] = "Welcome email could not be sent. Please share the password with the customer manually."
        else:
            response_data["email_sent"] = True
        
        return response_data


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreateRequest,
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
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == customer_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Build full_name from first_name and last_name
    full_name = f"{customer_data.first_name} {customer_data.last_name}".strip()
    
    # Create customer
    from app.core.security import get_password_hash
    customer = User(
        email=customer_data.email,
        full_name=full_name,
        hashed_password=get_password_hash(customer_data.password),
        role="customer",
        is_active=customer_data.is_active,
        assigned_sales_id=current_user.id,  # Assign to current sales person
        created_by_id=current_user.id  # Track creator
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    # Send welcome email if requested
    email_sent = False
    if customer_data.send_welcome_email:
        from app.core.email import send_user_creation_notification
        from app.core.config import settings
        email_sent = send_user_creation_notification(
            user_email=customer.email,
            user_name=customer.full_name,
            user_password=customer_data.password,
            user_role="customer",
            platform_url=settings.PLATFORM_URL
        )
    
    response_data = {
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
        "company_name": None,  # Company name is stored in SharedLink, not User
    }
    
    # If email was not sent (SMTP disabled or failed), include password in response
    # so sales person can share it manually
    if not email_sent:
        response_data["password"] = customer_data.password
        response_data["email_sent"] = False
        response_data["message"] = "Welcome email could not be sent. Please share the password with the customer manually."
    else:
        response_data["email_sent"] = True
    
    return response_data


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


class CustomerEngagementResponse(BaseModel):
    """Response model for customer engagement stats"""
    id: int
    email: str
    full_name: str
    company_name: Optional[str] = None
    assigned_date: Optional[str] = None
    shared_materials_count: int = 0
    total_views: int = 0
    total_downloads: int = 0
    last_engagement: Optional[str] = None


@router.get("/customers/{customer_id}/engagement", response_model=CustomerEngagementResponse)
async def get_customer_engagement(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get engagement statistics for a specific customer
    Uses MaterialUsage events for accurate view/download counts
    """
    try:
        if current_user.role != "sales":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This endpoint is only available for sales users"
            )
        
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
        
        # Get shared links for this customer
        shared_links = db.query(SharedLink).filter(
            and_(
                SharedLink.customer_email == customer.email,
                SharedLink.shared_by_user_id == current_user.id
            )
        ).all()
        
        shared_materials_count = len(shared_links)
        
        # Get material IDs from shared links
        material_ids = [link.material_id for link in shared_links] if shared_links else []
        
        # Get user_ids from shared links (these represent customer actions via shared links)
        shared_link_user_ids = list(set([link.shared_by_user_id for link in shared_links if link.shared_by_user_id])) if shared_links else []
        
        # Count views and downloads from MaterialUsage events
        total_views = 0
        total_downloads = 0
        last_engagement = None
        
        if material_ids and shared_link_user_ids:
            # Count views
            try:
                views_query = db.query(MaterialUsage).filter(
                    MaterialUsage.material_id.in_(material_ids),
                    MaterialUsage.user_id.in_(shared_link_user_ids),
                    MaterialUsage.action == UsageAction.VIEW.value
                )
                total_views = views_query.count()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error counting views: {str(e)}")
                total_views = 0
            
            # Count downloads
            try:
                downloads_query = db.query(MaterialUsage).filter(
                    MaterialUsage.material_id.in_(material_ids),
                    MaterialUsage.user_id.in_(shared_link_user_ids),
                    MaterialUsage.action == UsageAction.DOWNLOAD.value
                )
                total_downloads = downloads_query.count()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error counting downloads: {str(e)}")
                total_downloads = 0
            
            # Get last engagement (most recent MaterialUsage event)
            try:
                last_event = db.query(MaterialUsage).filter(
                    MaterialUsage.material_id.in_(material_ids),
                    MaterialUsage.user_id.in_(shared_link_user_ids),
                    MaterialUsage.action.in_([UsageAction.VIEW.value, UsageAction.DOWNLOAD.value])
                ).order_by(MaterialUsage.used_at.desc()).first()
                
                if last_event:
                    last_engagement = last_event.used_at.isoformat()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error getting last engagement: {str(e)}")
        
        # Fallback to SharedLink last_accessed_at if no MaterialUsage events
        if not last_engagement and shared_links:
            try:
                last_accessed_links = [link for link in shared_links if link.last_accessed_at]
                if last_accessed_links:
                    last_accessed_links.sort(key=lambda x: x.last_accessed_at, reverse=True)
                    last_engagement = last_accessed_links[0].last_accessed_at.isoformat()
                elif shared_links:
                    shared_links.sort(key=lambda x: x.created_at, reverse=True)
                    last_engagement = shared_links[0].created_at.isoformat()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error getting fallback last engagement: {str(e)}")
        
        # Get company_name from shared links if available, otherwise None
        company_name = None
        if shared_links:
            # Try to get company_name from the most recent shared link
            company_names = [link.company_name for link in shared_links if link.company_name]
            if company_names:
                company_name = company_names[0]  # Use first available company name
        
        return {
            "id": customer.id,
            "email": customer.email,
            "full_name": customer.full_name,
            "company_name": company_name,
            "assigned_date": customer.created_at.isoformat() if customer.created_at else None,
            "shared_materials_count": shared_materials_count,
            "total_views": total_views,
            "total_downloads": total_downloads,
            "last_engagement": last_engagement
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_customer_engagement: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching engagement data: {str(e)}"
        )


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
