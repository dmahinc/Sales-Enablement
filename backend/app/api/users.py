"""
Users API endpoints - User management (Admin only)
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user, require_role
# Email notification may not be available in all deployments
try:
    from app.core.email import send_user_creation_notification
except ImportError:
    def send_user_creation_notification(*args, **kwargs):
        pass  # No-op if email module doesn't exist
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from pydantic import EmailStr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


def require_admin(current_user: User = Depends(get_current_active_user)):
    """Require admin role or superuser"""
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users (Admin only)"""
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users


@router.get("/pmms", response_model=List[UserResponse])
async def list_pmm_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all PMM users (accessible to all authenticated users)"""
    pmm_users = db.query(User).filter(User.role == "pmm").order_by(User.full_name).all()
    # Convert to response models to ensure proper serialization
    return [UserResponse.model_validate(user) for user in pmm_users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get a specific user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Create a new user account (admin only)",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Invalid input data or email already exists"},
        401: {"description": "Authentication required"},
        403: {"description": "Admin access required"},
        500: {"description": "Failed to create user"}
    }
)
async def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user account.
    
    **Admin Only** - Only users with admin role can create new users.
    
    **Requirements:**
    - User must be authenticated and have admin role
    - Email must be unique
    - Password must meet security requirements
    
    **Email Notification:**
    - If SMTP is configured, sends welcome email with credentials
    - Email sending happens asynchronously and does not block the response
    - User creation succeeds even if email fails
    
    **Parameters:**
    - `user_data`: User information including email, password, name, and role
    
    **Returns:**
    - Created user object (password is hashed and not returned)
    """
    """Create a new user (Admin only)"""
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        from app.core.security import get_password_hash
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            is_active=user_data.is_active if hasattr(user_data, 'is_active') else True,
            is_superuser=user_data.is_superuser if hasattr(user_data, 'is_superuser') else False
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Schedule email sending in background (non-blocking)
        # This ensures user creation succeeds even if email fails
        def send_email_task():
            try:
                platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
                email_sent = send_user_creation_notification(
                    user_email=user.email,
                    user_name=user.full_name,
                    user_password=user_data.password,  # Send the plain password before it's hashed
                    user_role=user.role,
                    platform_url=platform_url
                )
                if not email_sent:
                    logger.warning(f"User {user.email} created but email notification failed to send")
            except Exception as e:
                # Log error but don't fail user creation
                logger.error(f"Error sending welcome email to {user.email}: {str(e)}", exc_info=True)
        
        # Add email task to background (executes after response is sent)
        background_tasks.add_task(send_email_task)
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deactivation or role change
    if user_id == current_user.id:
        if user_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate yourself"
            )
        if user_data.role and user_data.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own role"
            )
        if user_data.is_superuser is False and user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove your own superuser status"
            )
    
    # Update fields
    update_data = user_data.dict(exclude_unset=True, exclude={"password"})
    
    # Handle password update separately
    if user_data.password:
        from app.core.security import get_password_hash
        user.hashed_password = get_password_hash(user_data.password)
    
    # Update other fields
    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a user (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-deletion
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete yourself"
            )
        
        db.delete(user)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
