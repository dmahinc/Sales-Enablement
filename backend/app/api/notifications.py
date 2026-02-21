"""
Notifications API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, select
from app.models.notification import Notification, notification_recipients
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationUpdate
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notifications for the current user"""
    query = db.query(Notification).join(
        notification_recipients,
        Notification.id == notification_recipients.c.notification_id
    ).filter(
        notification_recipients.c.user_id == current_user.id
    )
    
    if unread_only:
        query = query.filter(notification_recipients.c.is_read == False)
    
    notifications = query.order_by(desc(Notification.created_at)).all()
    
    # Convert to response format with read status
    result = []
    for notification in notifications:
        # Get read status for this user
        read_status = db.execute(
            select(notification_recipients.c.is_read, notification_recipients.c.read_at)
            .where(
                and_(
                    notification_recipients.c.notification_id == notification.id,
                    notification_recipients.c.user_id == current_user.id
                )
            )
        ).first()
        
        # Build the response dictionary manually
        notification_dict = {
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'target_id': notification.target_id,
            'link_path': notification.link_path,
            'sent_by_id': notification.sent_by_id,
            'created_at': notification.created_at,
            'updated_at': notification.updated_at,
            'is_read': bool(read_status[0]) if read_status else False,
            'read_at': read_status[1] if read_status and read_status[1] else None,
            'sent_by_name': notification.sent_by.full_name if notification.sent_by else None,
            'sent_by_email': notification.sent_by.email if notification.sent_by else None,
        }
        
        result.append(notification_dict)
    
    return result


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications for the current user"""
    count = db.query(Notification).join(
        notification_recipients,
        Notification.id == notification_recipients.c.notification_id
    ).filter(
        and_(
            notification_recipients.c.user_id == current_user.id,
            notification_recipients.c.is_read == False
        )
    ).count()
    
    return {"unread_count": count}


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new notification (only PMM and Director can create)"""
    # Check permissions
    if current_user.role not in ['pmm', 'director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only PMMs and Directors can create notifications"
        )
    
    # Create notification
    notification = Notification(
        title=notification_data.title,
        message=notification_data.message,
        notification_type=notification_data.notification_type,
        target_id=notification_data.target_id,
        link_path=notification_data.link_path,
        sent_by_id=current_user.id
    )
    
    db.add(notification)
    db.flush()  # Flush to get the notification ID
    
    # Determine recipients
    if notification_data.send_to_all:
        # Get all users except the sender
        recipients = db.query(User).filter(
            User.id != current_user.id,
            User.is_active == True
        ).all()
    else:
        # For now, send_to_all is the only option
        recipients = db.query(User).filter(
            User.id != current_user.id,
            User.is_active == True
        ).all()
    
    # Add recipients to the notification
    for recipient in recipients:
        db.execute(
            notification_recipients.insert().values(
                notification_id=notification.id,
                user_id=recipient.id,
                is_read=False,
                read_at=None
            )
        )
    
    db.commit()
    db.refresh(notification)
    
    notification_dict = NotificationResponse.model_validate(notification).model_dump(mode='json')
    notification_dict['is_read'] = False
    notification_dict['read_at'] = None
    if notification.sent_by:
        notification_dict['sent_by_name'] = notification.sent_by.full_name
        notification_dict['sent_by_email'] = notification.sent_by.email
    
    return notification_dict


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read for the current user"""
    # Verify notification exists and user is a recipient
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check if user is a recipient
    recipient_check = db.execute(
        select(notification_recipients.c.notification_id)
        .where(
            and_(
                notification_recipients.c.notification_id == notification_id,
                notification_recipients.c.user_id == current_user.id
            )
        )
    ).first()
    
    if not recipient_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found for this user"
        )
    
    # Update read status
    db.execute(
        notification_recipients.update()
        .where(
            and_(
                notification_recipients.c.notification_id == notification_id,
                notification_recipients.c.user_id == current_user.id
            )
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    
    db.commit()
    db.refresh(notification)
    
    notification_dict = NotificationResponse.model_validate(notification).model_dump(mode='json')
    notification_dict['is_read'] = True
    notification_dict['read_at'] = datetime.utcnow()
    if notification.sent_by:
        notification_dict['sent_by_name'] = notification.sent_by.full_name
        notification_dict['sent_by_email'] = notification.sent_by.email
    
    return notification_dict


@router.put("/mark-all-read", response_model=dict)
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read for the current user"""
    db.execute(
        notification_recipients.update()
        .where(notification_recipients.c.user_id == current_user.id)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    
    db.commit()
    
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification (only sender can delete)"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Only sender can delete
    if notification.sent_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete notifications you sent"
        )
    
    db.delete(notification)
    db.commit()
    
    return None
