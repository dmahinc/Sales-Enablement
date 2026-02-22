"""
Dashboard API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, or_
from app.models.material import Material, MaterialStatus
from app.models.product import Product
from app.models.usage import MaterialUsage
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/director")
async def get_director_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get director dashboard data"""
    
    # Get total products
    total_products = db.query(Product).filter(Product.is_active == True).count()
    
    # Get products with materials (use distinct on product ID to avoid JSON comparison issues)
    products_with_materials = db.query(Product.id).join(
        Material, Product.name == Material.product_name
    ).filter(Product.is_active == True).distinct().count()
    
    # Calculate overall completion percentage
    overall_completion_percentage = (
        (products_with_materials / total_products * 100) if total_products > 0 else 0
    )
    
    # Get total materials count
    total_materials = db.query(Material).count()
    
    # Get material counts by status
    material_counts_by_status = db.query(
        Material.status,
        func.count(Material.id).label('count')
    ).group_by(Material.status).all()
    
    # Convert to dictionary
    status_counts = {
        'draft': 0,
        'published': 0,
        'review': 0,
        'archived': 0
    }
    
    for status, count in material_counts_by_status:
        status_key = status.value if hasattr(status, 'value') else str(status).lower()
        if status_key in status_counts:
            status_counts[status_key] = count
    
    # Get team contributions (simplified - you may want to enhance this)
    team_contributions = []
    
    # Get recent activity (materials uploaded in last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    materials_last_7_days = db.query(Material).filter(
        Material.created_at >= seven_days_ago
    ).count()
    
    # Get total cumulative connection sessions for sales people
    # Count unique days when sales users had activity (MaterialUsage events)
    # This approximates connection sessions since we don't have explicit login tracking
    sales_users = db.query(User.id).filter(User.role == "sales", User.is_active == True).all()
    sales_user_ids = [u.id for u in sales_users]
    
    total_sales_sessions = 0
    if sales_user_ids:
        # Count unique days per sales user when they had activity
        # Using MaterialUsage events as a proxy for connection sessions
        unique_days_per_user = db.query(
            MaterialUsage.user_id,
            func.date(MaterialUsage.used_at).label('activity_date')
        ).filter(
            MaterialUsage.user_id.in_(sales_user_ids)
        ).distinct().all()
        
        # Total cumulative sessions = sum of unique activity days across all sales users
        total_sales_sessions = len(unique_days_per_user)
    
    return {
        "total_products": total_products,
        "products_with_materials": products_with_materials,
        "overall_completion_percentage": round(overall_completion_percentage, 2),
        "total_materials": total_materials,
        "material_counts_by_status": status_counts,
        "team_contributions": team_contributions,
        "total_sales_sessions": total_sales_sessions,
        "recent_activity": {
            "materials_last_7_days": materials_last_7_days
        }
    }

@router.get("/sales")
async def get_sales_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get sales dashboard data"""
    
    # Get all published materials
    # Handle both enum and string status values
    published_materials = db.query(Material).filter(
        or_(
            Material.status == MaterialStatus.PUBLISHED,
            Material.status == "published"
        )
    ).all()
    
    # Calculate available materials by type
    materials_by_type = {}
    for material in published_materials:
        material_type = material.material_type or "Other"
        if material_type not in materials_by_type:
            materials_by_type[material_type] = 0
        materials_by_type[material_type] += 1
    
    # Get popular materials (top 10 by usage_count)
    popular_materials = db.query(Material).filter(
        or_(
            Material.status == MaterialStatus.PUBLISHED,
            Material.status == "published"
        ),
        Material.usage_count > 0
    ).order_by(desc(Material.usage_count)).limit(10).all()
    
    popular_materials_list = [
        {
            "id": m.id,
            "name": m.name,
            "material_type": m.material_type,
            "usage_count": m.usage_count or 0
        }
        for m in popular_materials
    ]
    
    # Get recently viewed materials (last 10 views by current user)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_views = db.query(MaterialUsage).filter(
        and_(
            MaterialUsage.user_id == current_user.id,
            MaterialUsage.action == "view",
            MaterialUsage.used_at >= thirty_days_ago
        )
    ).order_by(desc(MaterialUsage.used_at)).limit(10).all()
    
    # Get unique materials from recent views
    viewed_material_ids = list(set([v.material_id for v in recent_views]))
    recently_viewed_materials = db.query(Material).filter(
        Material.id.in_(viewed_material_ids),
        or_(
            Material.status == MaterialStatus.PUBLISHED,
            Material.status == "published"
        )
    ).all() if viewed_material_ids else []
    
    # Create a map of material_id -> last viewed timestamp
    material_view_times = {}
    for view in recent_views:
        if view.material_id not in material_view_times:
            material_view_times[view.material_id] = view.used_at
    
    recently_viewed_list = [
        {
            "id": m.id,
            "name": m.name,
            "material_type": m.material_type,
            "viewed_at": material_view_times.get(m.id, m.updated_at).isoformat() if material_view_times.get(m.id) or m.updated_at else None
        }
        for m in recently_viewed_materials
    ]
    # Sort by viewed_at (most recent first)
    recently_viewed_list.sort(key=lambda x: x["viewed_at"] or "", reverse=True)
    
    return {
        "available_materials": {
            "total": len(published_materials),
            "by_type": materials_by_type
        },
        "popular_materials": popular_materials_list,
        "recently_viewed": recently_viewed_list
    }
