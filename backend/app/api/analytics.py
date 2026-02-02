"""
Analytics API endpoints for material usage tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.models.usage import MaterialUsage
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class UsageRateResponse(BaseModel):
    """Usage rate response schema"""
    material_id: int
    material_name: str
    total_usage: int
    daily_usage: float
    weekly_usage: float
    monthly_usage: float
    usage_trend: str  # "increasing", "stable", "decreasing"
    last_used: Optional[datetime]
    usage_count: int


class UsageStatsResponse(BaseModel):
    """Overall usage statistics"""
    total_materials: int
    materials_with_usage: int
    total_downloads: int
    total_views: int
    average_usage_per_material: float
    most_used_materials: List[dict]
    usage_by_type: List[dict]
    usage_by_universe: List[dict]


@router.get("/usage-rates")
async def get_usage_rates(
    material_id: Optional[int] = Query(None, description="Filter by material ID"),
    days: Optional[int] = Query(None, description="Number of days to analyze"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get usage rates for materials"""
    now = datetime.utcnow()
    
    # Determine date range: custom dates take precedence over days
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            # Set end date to end of day
            end = end.replace(hour=23, minute=59, second=59)
            if start > end:
                raise HTTPException(
                    status_code=400,
                    detail="Start date must be before end date"
                )
            date_range_days = (end - start).days + 1
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    elif days:
        start = now - timedelta(days=days)
        end = now
        date_range_days = days
    else:
        # Default to 30 days if neither specified
        start = now - timedelta(days=30)
        end = now
        date_range_days = 30
    
    start_date = start
    
    # Base query
    query = db.query(Material)
    
    if material_id:
        query = query.filter(Material.id == material_id)
    
    materials = query.all()
    
    usage_rates = []
    
    for material in materials:
        # Get usage events for this material
        usage_events = db.query(MaterialUsage).filter(
            and_(
                MaterialUsage.material_id == material.id,
                MaterialUsage.used_at >= start_date,
                MaterialUsage.used_at <= end
            )
        ).all()
        
        total_usage = len(usage_events)
        
        # Calculate daily, weekly, monthly usage
        daily_usage = total_usage / date_range_days if date_range_days > 0 else 0
        weekly_usage = daily_usage * 7
        monthly_usage = daily_usage * 30
        
        # Calculate trend (compare first half vs second half of period)
        if len(usage_events) >= 2:
            midpoint = start_date + timedelta(days=date_range_days / 2)
            first_half = len([e for e in usage_events if e.used_at < midpoint])
            second_half = len([e for e in usage_events if e.used_at >= midpoint])
            
            if second_half > first_half * 1.1:
                trend = "increasing"
            elif second_half < first_half * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        # Get last usage
        last_usage = db.query(MaterialUsage).filter(
            MaterialUsage.material_id == material.id
        ).order_by(MaterialUsage.used_at.desc()).first()
        
        usage_rates.append({
            "material_id": material.id,
            "material_name": material.name,
            "total_usage": total_usage,
            "daily_usage": round(daily_usage, 2),
            "weekly_usage": round(weekly_usage, 2),
            "monthly_usage": round(monthly_usage, 2),
            "usage_trend": trend,
            "last_used": last_usage.used_at if last_usage else None,
            "usage_count": material.usage_count or 0
        })
    
    # Sort by total usage descending
    usage_rates.sort(key=lambda x: x["total_usage"], reverse=True)
    
    return usage_rates


@router.get("/usage-stats")
async def get_usage_stats(
    days: Optional[int] = Query(None, description="Number of days to analyze"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overall usage statistics"""
    now = datetime.utcnow()
    
    # Determine date range: custom dates take precedence over days
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            # Set end date to end of day
            end = end.replace(hour=23, minute=59, second=59)
            if start > end:
                raise HTTPException(
                    status_code=400,
                    detail="Start date must be before end date"
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    elif days:
        start = now - timedelta(days=days)
        end = now
    else:
        # Default to 30 days if neither specified
        start = now - timedelta(days=30)
        end = now
    
    start_date = start
    
    # Total materials
    total_materials = db.query(Material).count()
    
    # Materials with usage
    materials_with_usage = db.query(Material).filter(
        Material.usage_count > 0
    ).count()
    
    # Total downloads and views
    total_downloads = db.query(MaterialUsage).filter(
        and_(
            MaterialUsage.action == "download",
            MaterialUsage.used_at >= start_date,
            MaterialUsage.used_at <= end
        )
    ).count()
    
    total_views = db.query(MaterialUsage).filter(
        and_(
            MaterialUsage.action == "view",
            MaterialUsage.used_at >= start_date,
            MaterialUsage.used_at <= end
        )
    ).count()
    
    # Average usage per material
    total_usage_count = db.query(func.sum(Material.usage_count)).scalar() or 0
    average_usage = total_usage_count / total_materials if total_materials > 0 else 0
    
    # Most used materials
    most_used = db.query(
        Material.id,
        Material.name,
        Material.material_type,
        Material.universe_name,
        Material.usage_count
    ).filter(
        Material.usage_count > 0
    ).order_by(
        Material.usage_count.desc()
    ).limit(10).all()
    
    most_used_materials = [
        {
            "id": m.id,
            "name": m.name,
            "material_type": m.material_type,
            "universe_name": m.universe_name,
            "usage_count": m.usage_count
        }
        for m in most_used
    ]
    
    # Usage by material type
    usage_by_type = db.query(
        Material.material_type,
        func.sum(Material.usage_count).label("total_usage")
    ).group_by(
        Material.material_type
    ).all()
    
    usage_by_type_list = [
        {
            "material_type": ut[0],
            "total_usage": ut[1] or 0
        }
        for ut in usage_by_type
    ]
    
    # Usage by universe
    usage_by_universe = db.query(
        Material.universe_name,
        func.sum(Material.usage_count).label("total_usage")
    ).group_by(
        Material.universe_name
    ).all()
    
    usage_by_universe_list = [
        {
            "universe_name": uu[0] or "Unknown",
            "total_usage": uu[1] or 0
        }
        for uu in usage_by_universe
    ]
    
    return {
        "total_materials": total_materials,
        "materials_with_usage": materials_with_usage,
        "total_downloads": total_downloads,
        "total_views": total_views,
        "average_usage_per_material": round(average_usage, 2),
        "most_used_materials": most_used_materials,
        "usage_by_type": usage_by_type_list,
        "usage_by_universe": usage_by_universe_list
    }


@router.get("/material/{material_id}/usage-history")
async def get_material_usage_history(
    material_id: int,
    days: Optional[int] = Query(None, description="Number of days to retrieve"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed usage history for a specific material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    now = datetime.utcnow()
    
    # Determine date range: custom dates take precedence over days
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            # Set end date to end of day
            end = end.replace(hour=23, minute=59, second=59)
            if start > end:
                raise HTTPException(
                    status_code=400,
                    detail="Start date must be before end date"
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    elif days:
        start = now - timedelta(days=days)
        end = now
    else:
        # Default to 30 days if neither specified
        start = now - timedelta(days=30)
        end = now
    
    start_date = start
    
    # Get usage events
    usage_events = db.query(MaterialUsage).filter(
        and_(
            MaterialUsage.material_id == material_id,
            MaterialUsage.used_at >= start_date,
            MaterialUsage.used_at <= end
        )
    ).order_by(MaterialUsage.used_at.desc()).all()
    
    # Group by date
    daily_usage = {}
    for event in usage_events:
        date_key = event.used_at.date().isoformat()
        if date_key not in daily_usage:
            daily_usage[date_key] = {"downloads": 0, "views": 0, "shares": 0, "copies": 0}
        daily_usage[date_key][event.action] = daily_usage[date_key].get(event.action, 0) + 1
    
    return {
        "material_id": material.id,
        "material_name": material.name,
        "total_usage_count": material.usage_count or 0,
        "usage_events": [
            {
                "id": event.id,
                "user_id": event.user_id,
                "action": event.action,
                "used_at": event.used_at.isoformat(),
                "ip_address": event.ip_address
            }
            for event in usage_events
        ],
        "daily_usage": daily_usage
    }
