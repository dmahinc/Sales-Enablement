"""
Marketing Updates API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.marketing_update import MarketingUpdate
from app.models.product import Universe, Category, Product
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.marketing_update import MarketingUpdateCreate, MarketingUpdateUpdate, MarketingUpdateResponse
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketing-updates", tags=["marketing-updates"])


@router.get("", response_model=List[MarketingUpdateResponse])
async def list_marketing_updates(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    universe_id: Optional[int] = None,
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all marketing updates, sorted by latest first"""
    query = db.query(MarketingUpdate)
    
    # Apply filters
    if category:
        query = query.filter(MarketingUpdate.category == category)
    if subcategory:
        query = query.filter(MarketingUpdate.subcategory == subcategory)
    if universe_id:
        query = query.filter(MarketingUpdate.universe_id == universe_id)
    if category_id:
        query = query.filter(MarketingUpdate.category_id == category_id)
    if product_id:
        query = query.filter(MarketingUpdate.product_id == product_id)
    if priority:
        query = query.filter(MarketingUpdate.priority == priority)
    
    # Filter out expired updates
    now = datetime.utcnow()
    query = query.filter(
        (MarketingUpdate.expires_at.is_(None)) | (MarketingUpdate.expires_at > now)
    )
    
    # Sort by published_at (latest first), then by created_at
    updates = query.order_by(
        desc(MarketingUpdate.published_at),
        desc(MarketingUpdate.created_at)
    ).all()
    
    # Convert to response format
    result = []
    for update in updates:
        update_dict = MarketingUpdateResponse.model_validate(update).model_dump(mode='json')
        # Add creator info
        if update.created_by:
            update_dict['created_by_name'] = update.created_by.full_name
            update_dict['created_by_email'] = update.created_by.email
        result.append(update_dict)
    
    return result


@router.get("/categories", response_model=dict)
async def get_categories(
    current_user: User = Depends(get_current_active_user)
):
    """Get available categories and their subcategories"""
    categories = {
        "competitive_intelligence": {
            "label": "Competitive Intelligence",
            "subcategories": [
                "Competitor Product Updates",
                "Competitive Positioning",
                "Win/Loss Analysis",
                "Market Share Data",
                "Competitor Pricing"
            ]
        },
        "market_trends_insights": {
            "label": "Market Trends & Insights",
            "subcategories": [
                "Industry Reports",
                "Market Research",
                "Technology Trends",
                "Customer Behavior",
                "Market Opportunities"
            ]
        },
        "campaign_messaging": {
            "label": "Campaign & Messaging",
            "subcategories": [
                "New Campaign Launches",
                "Messaging Updates",
                "Value Propositions",
                "Talking Points",
                "Campaign Results"
            ]
        },
        "customer_success": {
            "label": "Customer Success Stories",
            "subcategories": [
                "Case Studies",
                "Customer Testimonials",
                "Use Cases",
                "ROI Stories",
                "Customer Spotlights"
            ]
        },
        "content_enablement": {
            "label": "Content & Enablement",
            "subcategories": [
                "New Content Releases",
                "Content Updates",
                "Sales Playbooks",
                "Training Materials",
                "Content Best Practices",
                "Product Monthly Update"
            ]
        },
        "events_activities": {
            "label": "Events & Activities",
            "subcategories": [
                "Upcoming Events",
                "Webinars",
                "Trade Shows",
                "Regional Activities",
                "Event Recaps"
            ]
        },
        "pricing_promotions": {
            "label": "Pricing & Promotions",
            "subcategories": [
                "Pricing Updates",
                "Special Offers",
                "Discount Programs",
                "Bundle Deals",
                "Promotional Campaigns"
            ]
        },
        "win_themes": {
            "label": "Win Themes & Battle Cards",
            "subcategories": [
                "Win Themes",
                "Battle Cards",
                "Objection Handling",
                "Competitive Advantages",
                "Differentiation Points"
            ]
        },
        "industry_vertical": {
            "label": "Industry & Vertical Insights",
            "subcategories": [
                "Vertical-Specific News",
                "Industry Regulations",
                "Vertical Use Cases",
                "Industry Trends",
                "Vertical Best Practices"
            ]
        },
        "other": {
            "label": "Other",
            "subcategories": []
        }
    }
    return categories


@router.get("/{update_id}", response_model=MarketingUpdateResponse)
async def get_marketing_update(
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single marketing update by ID"""
    update = db.query(MarketingUpdate).filter(MarketingUpdate.id == update_id).first()
    
    if not update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketing update not found"
        )
    
    # Check if expired
    if update.expires_at and update.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketing update has expired"
        )
    
    update_dict = MarketingUpdateResponse.model_validate(update).model_dump(mode='json')
    if update.created_by:
        update_dict['created_by_name'] = update.created_by.full_name
        update_dict['created_by_email'] = update.created_by.email
    
    return update_dict


@router.post("", response_model=MarketingUpdateResponse, status_code=status.HTTP_201_CREATED)
async def create_marketing_update(
    update_data: MarketingUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new marketing update"""
    # Validate hierarchy if provided
    if update_data.universe_id:
        universe = db.query(Universe).filter(Universe.id == update_data.universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {update_data.universe_id} not found"
            )
        if not update_data.universe_name:
            update_data.universe_name = universe.name or universe.display_name
    
    if update_data.category_id:
        category = db.query(Category).filter(Category.id == update_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {update_data.category_id} not found"
            )
        if not update_data.category_name:
            update_data.category_name = category.display_name or category.name
        # Validate category belongs to universe
        if update_data.universe_id and category.universe_id != update_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    if update_data.product_id:
        product = db.query(Product).filter(Product.id == update_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {update_data.product_id} not found"
            )
        if not update_data.product_name:
            update_data.product_name = product.display_name or product.name
        # Validate product belongs to category
        if update_data.category_id and product.category_id != update_data.category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
        # Validate product belongs to universe
        if update_data.universe_id and product.universe_id != update_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
    
    # Set published_at to now if not provided
    published_at = update_data.published_at or datetime.utcnow()
    
    # Create update
    update = MarketingUpdate(
        title=update_data.title,
        short_description=update_data.short_description,
        content=update_data.content,
        category=update_data.category,
        subcategory=update_data.subcategory,
        universe_id=update_data.universe_id,
        category_id=update_data.category_id,
        product_id=update_data.product_id,
        universe_name=update_data.universe_name,
        category_name=update_data.category_name,
        product_name=update_data.product_name,
        priority=update_data.priority or 'informational',
        target_audience=update_data.target_audience,
        created_by_id=current_user.id,
        published_at=published_at,
        expires_at=update_data.expires_at
    )
    
    db.add(update)
    db.commit()
    db.refresh(update)
    
    update_dict = MarketingUpdateResponse.model_validate(update).model_dump(mode='json')
    if update.created_by:
        update_dict['created_by_name'] = update.created_by.full_name
        update_dict['created_by_email'] = update.created_by.email
    
    # Create notification if requested (only PMM/Director can send)
    if update_data.send_notification and current_user.role in ['pmm', 'director', 'admin']:
        try:
            from app.models.notification import Notification, notification_recipients
            
            notification = Notification(
                title=f"New Marketing Update: {update.title}",
                message=f"A new marketing update has been published: {update.title}",
                notification_type="marketing_update",
                target_id=update.id,
                link_path=f"/marketing-updates",
                sent_by_id=current_user.id
            )
            
            db.add(notification)
            db.flush()
            
            # Get all active users except sender
            recipients = db.query(User).filter(
                User.id != current_user.id,
                User.is_active == True
            ).all()
            
            # Add recipients
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
        except Exception as e:
            # Log error but don't fail the creation
            import logging
            logging.error(f"Failed to create notification: {str(e)}")
            db.rollback()
    
    return update_dict


@router.put("/{update_id}", response_model=MarketingUpdateResponse)
async def update_marketing_update(
    update_id: int,
    update_data: MarketingUpdateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a marketing update"""
    update = db.query(MarketingUpdate).filter(MarketingUpdate.id == update_id).first()
    
    if not update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketing update not found"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Validate hierarchy if being updated
    if 'universe_id' in update_dict and update_dict['universe_id']:
        universe = db.query(Universe).filter(Universe.id == update_dict['universe_id']).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {update_dict['universe_id']} not found"
            )
        if 'universe_name' not in update_dict or not update_dict['universe_name']:
            update_dict['universe_name'] = universe.name or universe.display_name
    
    if 'category_id' in update_dict and update_dict['category_id']:
        category = db.query(Category).filter(Category.id == update_dict['category_id']).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {update_dict['category_id']} not found"
            )
        if 'category_name' not in update_dict or not update_dict['category_name']:
            update_dict['category_name'] = category.display_name or category.name
        # Validate category belongs to universe
        universe_id = update_dict.get('universe_id', update.universe_id)
        if universe_id and category.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    if 'product_id' in update_dict and update_dict['product_id']:
        product = db.query(Product).filter(Product.id == update_dict['product_id']).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {update_dict['product_id']} not found"
            )
        if 'product_name' not in update_dict or not update_dict['product_name']:
            update_dict['product_name'] = product.display_name or product.name
        # Validate product belongs to category
        category_id = update_dict.get('category_id', update.category_id)
        if category_id and product.category_id != category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
        # Validate product belongs to universe
        universe_id = update_dict.get('universe_id', update.universe_id)
        if universe_id and product.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
    
    for key, value in update_dict.items():
        setattr(update, key, value)
    
    db.commit()
    db.refresh(update)
    
    update_dict = MarketingUpdateResponse.model_validate(update).model_dump(mode='json')
    if update.created_by:
        update_dict['created_by_name'] = update.created_by.full_name
        update_dict['created_by_email'] = update.created_by.email
    
    return update_dict


@router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_marketing_update(
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a marketing update"""
    update = db.query(MarketingUpdate).filter(MarketingUpdate.id == update_id).first()
    
    if not update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketing update not found"
        )
    
    db.delete(update)
    db.commit()
    
    return None
