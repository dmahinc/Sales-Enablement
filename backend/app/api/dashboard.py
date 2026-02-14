"""
Dashboard API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.material import Material, MaterialStatus
from app.models.product import Product
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
    
    return {
        "total_products": total_products,
        "products_with_materials": products_with_materials,
        "overall_completion_percentage": round(overall_completion_percentage, 2),
        "total_materials": total_materials,
        "material_counts_by_status": status_counts,
        "team_contributions": team_contributions,
        "recent_activity": {
            "materials_last_7_days": materials_last_7_days
        }
    }
