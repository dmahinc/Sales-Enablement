"""
Customer API endpoints - Customer persona dashboard and interactions
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.shared_link import SharedLink
from app.models.material import Material
from app.schemas.shared_link import SharedLinkResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.exc import ProgrammingError, OperationalError

# Try to import CustomerFavorite - it may not exist if table hasn't been created yet
try:
    from app.models.customer_favorite import CustomerFavorite
    CUSTOMER_FAVORITES_AVAILABLE = True
except (ImportError, Exception):
    CustomerFavorite = None
    CUSTOMER_FAVORITES_AVAILABLE = False

# Try to import CustomerMessage - it may not exist if table hasn't been created yet
try:
    from app.models.customer_message import CustomerMessage
    CUSTOMER_MESSAGES_AVAILABLE = True
except (ImportError, Exception):
    CustomerMessage = None
    CUSTOMER_MESSAGES_AVAILABLE = False

router = APIRouter(prefix="/api/customers", tags=["customers"])


class CustomerDashboardResponse(BaseModel):
    """Response model for customer dashboard"""
    shared_materials: List[dict]
    sales_contacts: List[dict]
    unread_messages_count: int
    recent_messages: List[dict]


class MessageCreate(BaseModel):
    """Schema for creating a message"""
    sales_contact_id: Optional[int] = None
    subject: Optional[str] = None
    message: str
    parent_message_id: Optional[int] = None


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
    
    class Config:
        from_attributes = True


@router.get("/dashboard", response_model=CustomerDashboardResponse)
async def get_customer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get customer dashboard data
    
    Returns:
    - All shared materials (via shared links)
    - Sales contacts (users who have shared materials with this customer)
    - Unread messages count
    - Recent messages
    """
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    # Get all shared links for this customer (by email)
    # Include both active and expired links, but mark expired ones
    shared_links = db.query(SharedLink).filter(
        and_(
            SharedLink.customer_email == current_user.email,
            SharedLink.is_active == True
        )
    ).all()
    
    # Get unique materials from shared links
    material_ids = list(set([link.material_id for link in shared_links]))
    materials = db.query(Material).filter(Material.id.in_(material_ids)).all() if material_ids else []
    
    # Get favorite material IDs for this customer (if favorites table exists)
    favorite_material_ids = set()
    if CUSTOMER_FAVORITES_AVAILABLE and CustomerFavorite:
        try:
            # Use a separate query session to avoid transaction issues
            favorites = db.query(CustomerFavorite).filter(
                CustomerFavorite.customer_id == current_user.id
            ).all()
            favorite_material_ids = {fav.material_id for fav in favorites}
        except (ProgrammingError, OperationalError) as e:
            # Table doesn't exist yet - rollback and continue without favorites
            try:
                db.rollback()
            except Exception:
                pass  # Already rolled back or no transaction
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Customer favorites table not available: {str(e)}")
        except Exception as e:
            # Other error - rollback and continue
            try:
                db.rollback()
            except Exception:
                pass  # Already rolled back or no transaction
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error accessing customer favorites: {str(e)}")
    
    # Build shared materials response with link info
    shared_materials = []
    for material in materials:
        # Find the most recent shared link for this material
        material_links = [link for link in shared_links if link.material_id == material.id]
        if material_links:
            latest_link = max(material_links, key=lambda l: l.created_at)
            shared_materials.append({
                "material_id": material.id,
                "material_name": material.name,
                "material_type": material.material_type,
                "product_name": material.product_name,
                "universe_name": material.universe_name,
                "file_name": material.file_name,
                "file_format": material.file_format,
                "shared_at": latest_link.created_at.isoformat() if latest_link.created_at else None,
                "shared_by": latest_link.shared_by_user.full_name if latest_link.shared_by_user else None,
                "shared_by_email": latest_link.shared_by_user.email if latest_link.shared_by_user else None,
                "share_token": latest_link.unique_token,
                "access_count": latest_link.access_count,
                "download_count": latest_link.download_count,
                "expires_at": latest_link.expires_at.isoformat() if latest_link.expires_at else None,
                "is_favorite": material.id in favorite_material_ids,
            })
    
    # Get unique sales contacts (users who shared materials with this customer)
    sales_contact_ids = list(set([link.shared_by_user_id for link in shared_links if link.shared_by_user_id]))
    sales_contacts = []
    if sales_contact_ids:
        sales_users = db.query(User).filter(
            User.id.in_(sales_contact_ids),
            User.role.in_(["sales", "director", "pmm", "admin"])
        ).all()
        sales_contacts = [
            {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "role": user.role,
            }
            for user in sales_users
        ]
    
    # Get unread messages count (if customer_messages table exists)
    unread_messages_count = 0
    recent_messages_data = []
    if CUSTOMER_MESSAGES_AVAILABLE and CustomerMessage:
        try:
            unread_messages_count = db.query(CustomerMessage).filter(
                and_(
                    CustomerMessage.customer_id == current_user.id,
                    CustomerMessage.is_read == False,
                    CustomerMessage.sent_by_customer == False  # Only count messages FROM sales
                )
            ).count()
            
            # Get recent messages (last 10)
            recent_messages = db.query(CustomerMessage).filter(
                CustomerMessage.customer_id == current_user.id
            ).order_by(CustomerMessage.created_at.desc()).limit(10).all()
            
            recent_messages_data = [
                {
                    "id": msg.id,
                    "sales_contact_id": msg.sales_contact_id,
                    "sales_contact_name": msg.sales_contact.full_name if msg.sales_contact else None,
                    "subject": msg.subject,
                    "message": msg.message,
                    "sent_by_customer": msg.sent_by_customer,
                    "is_read": msg.is_read,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                    "parent_message_id": msg.parent_message_id,
                }
                for msg in recent_messages
            ]
        except (ProgrammingError, OperationalError) as e:
            # Table doesn't exist yet - just continue without messages
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Customer messages table not available: {str(e)}")
            pass
        except Exception as e:
            # Other error - log but continue
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error accessing customer messages: {str(e)}")
            pass
    
    return CustomerDashboardResponse(
        shared_materials=shared_materials,
        sales_contacts=sales_contacts,
        unread_messages_count=unread_messages_count,
        recent_messages=recent_messages_data
    )


@router.get("/messages", response_model=List[MessageResponse])
async def get_customer_messages(
    sales_contact_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get messages for the current customer"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        return []
    
    try:
        query = db.query(CustomerMessage).filter(CustomerMessage.customer_id == current_user.id)
    except (ProgrammingError, OperationalError):
        return []
    except Exception:
        return []
    
    if sales_contact_id:
        query = query.filter(CustomerMessage.sales_contact_id == sales_contact_id)
    
    messages = query.order_by(CustomerMessage.created_at.desc()).all()
    
    return messages


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new message from customer to sales contact"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )
    
    # If sales_contact_id not provided, find the primary sales contact (most recent shared link)
    sales_contact_id = message_data.sales_contact_id
    if not sales_contact_id:
        latest_link = db.query(SharedLink).filter(
            SharedLink.customer_email == current_user.email
        ).order_by(SharedLink.created_at.desc()).first()
        
        if latest_link and latest_link.shared_by_user_id:
            sales_contact_id = latest_link.shared_by_user_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No sales contact found. Please specify a sales_contact_id."
            )
    
    # Verify sales contact exists and is a valid sales user
    sales_contact = db.query(User).filter(
        User.id == sales_contact_id,
        User.role.in_(["sales", "director", "pmm", "admin"])
    ).first()
    
    if not sales_contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales contact not found"
        )
    
    # Create message
    message = CustomerMessage(
        customer_id=current_user.id,
        sales_contact_id=sales_contact_id,
        subject=message_data.subject,
        message=message_data.message,
        sent_by_customer=True,
        parent_message_id=message_data.parent_message_id,
        is_read=False
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return message


@router.put("/messages/{message_id}/read", response_model=MessageResponse)
async def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a message as read"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_MESSAGES_AVAILABLE or not CustomerMessage:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )
    
    try:
        message = db.query(CustomerMessage).filter(
            CustomerMessage.id == message_id,
            CustomerMessage.customer_id == current_user.id
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        message.mark_as_read()
        db.commit()
        db.refresh(message)
        
        return message
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error accessing customer messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )


@router.post("/favorites/{material_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a material to customer favorites"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_FAVORITES_AVAILABLE or not CustomerFavorite:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Favorites feature is not yet available"
        )
    
    # Verify material exists
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Check if customer has access to this material (via shared links)
    shared_link = db.query(SharedLink).filter(
        and_(
            SharedLink.material_id == material_id,
            SharedLink.customer_email == current_user.email,
            SharedLink.is_active == True
        )
    ).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only favorite materials that have been shared with you"
        )
    
    # Check if already favorited
    existing_favorite = db.query(CustomerFavorite).filter(
        and_(
            CustomerFavorite.customer_id == current_user.id,
            CustomerFavorite.material_id == material_id
        )
    ).first()
    
    try:
        # Check if already favorited
        existing_favorite = db.query(CustomerFavorite).filter(
            and_(
                CustomerFavorite.customer_id == current_user.id,
                CustomerFavorite.material_id == material_id
            )
        ).first()
        
        if existing_favorite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Material is already in your favorites"
            )
        
        # Create favorite
        favorite = CustomerFavorite(
            customer_id=current_user.id,
            material_id=material_id
        )
        
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
        
        return {"message": "Material added to favorites", "material_id": material_id}
    except (ProgrammingError, OperationalError) as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Favorites feature is not yet available"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding favorite: {str(e)}"
        )


@router.delete("/favorites/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a material from customer favorites"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_FAVORITES_AVAILABLE or not CustomerFavorite:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Favorites feature is not yet available"
        )
    
    # Find favorite
    favorite = db.query(CustomerFavorite).filter(
        and_(
            CustomerFavorite.customer_id == current_user.id,
            CustomerFavorite.material_id == material_id
        )
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    db.delete(favorite)
    db.commit()
    
    return None


@router.get("/favorites", response_model=List[dict])
async def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all favorited materials for the current customer"""
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available for customers"
        )
    
    if not CUSTOMER_FAVORITES_AVAILABLE or not CustomerFavorite:
        return []
    
    try:
        # Get favorites
        favorites = db.query(CustomerFavorite).filter(
            CustomerFavorite.customer_id == current_user.id
        ).all()
        
        if not favorites:
            return []
        
        material_ids = [fav.material_id for fav in favorites]
        materials = db.query(Material).filter(Material.id.in_(material_ids)).all()
        
        # Get shared links for these materials
        shared_links = db.query(SharedLink).filter(
            and_(
                SharedLink.material_id.in_(material_ids),
                SharedLink.customer_email == current_user.email,
                SharedLink.is_active == True
            )
        ).all()
        
        # Build response
        result = []
        for material in materials:
            # Find the most recent shared link for this material
            material_links = [link for link in shared_links if link.material_id == material.id]
            if material_links:
                latest_link = max(material_links, key=lambda l: l.created_at)
                result.append({
                    "material_id": material.id,
                    "material_name": material.name,
                    "material_type": material.material_type,
                    "product_name": material.product_name,
                    "universe_name": material.universe_name,
                    "file_name": material.file_name,
                    "file_format": material.file_format,
                    "shared_at": latest_link.created_at.isoformat() if latest_link.created_at else None,
                    "shared_by": latest_link.shared_by_user.full_name if latest_link.shared_by_user else None,
                    "shared_by_email": latest_link.shared_by_user.email if latest_link.shared_by_user else None,
                    "share_token": latest_link.unique_token,
                    "access_count": latest_link.access_count,
                    "download_count": latest_link.download_count,
                    "expires_at": latest_link.expires_at.isoformat() if latest_link.expires_at else None,
                    "is_favorite": True,
                })
        
        return result
    except (ProgrammingError, OperationalError) as e:
        try:
            db.rollback()
        except Exception:
            pass
        return []
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting favorites: {str(e)}")
        return []
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error accessing customer messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Messaging feature is not yet available"
        )
