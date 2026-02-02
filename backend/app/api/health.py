"""
Material Health Dashboard API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.material import Material
from app.models.health import MaterialHealthHistory
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/api/health", tags=["health"])

def calculate_health_score(material: Material) -> int:
    """Calculate material health score (0-100)"""
    freshness_score = 100
    completeness_score = material.completeness_score or 0
    usage_score = min(100, (material.usage_count or 0) * 2)  # Cap at 100
    
    # Calculate freshness (penalty for old materials)
    if material.last_updated:
        days_old = (datetime.utcnow() - material.last_updated).days
        if days_old > 180:  # 6 months
            freshness_score = max(0, 100 - (days_old - 180) * 0.5)
        elif days_old > 90:  # 3 months
            freshness_score = max(50, 100 - (days_old - 90))
    else:
        freshness_score = 0
    
    # Weighted average
    overall_score = int(
        (freshness_score * 0.3) +
        (completeness_score * 0.4) +
        (usage_score * 0.3)
    )
    
    return max(0, min(100, overall_score))

@router.get("/dashboard")
async def get_health_dashboard(
    skip: int = 0,
    limit: int = 100,
    min_health_score: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get health dashboard data"""
    query = db.query(Material)
    
    materials = query.offset(skip).limit(limit).all()
    
    # Calculate health scores
    health_data = []
    for material in materials:
        health_score = calculate_health_score(material)
        material.health_score = health_score
        
        health_data.append({
            "material_id": material.id,
            "name": material.name,
            "material_type": material.material_type,
            "product_name": material.product_name,
            "health_score": health_score,
            "freshness": material.last_updated.isoformat() if material.last_updated else None,
            "completeness": material.completeness_score,
            "usage": material.usage_count,
            "status": material.status
        })
    
    # Filter by min health score if provided
    if min_health_score is not None:
        health_data = [h for h in health_data if h["health_score"] < min_health_score]
    
    # Aggregate statistics
    total_materials = len(health_data)
    avg_health_score = sum(h["health_score"] for h in health_data) / total_materials if total_materials > 0 else 0
    low_health_count = len([h for h in health_data if h["health_score"] < 70])
    
    return {
        "materials": health_data,
        "statistics": {
            "total_materials": total_materials,
            "average_health_score": round(avg_health_score, 2),
            "low_health_count": low_health_count,
            "low_health_percentage": round((low_health_count / total_materials * 100) if total_materials > 0 else 0, 2)
        }
    }

@router.get("/material/{material_id}")
async def get_material_health(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get health metrics for a specific material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    health_score = calculate_health_score(material)
    
    # Get health history
    history = db.query(MaterialHealthHistory).filter(
        MaterialHealthHistory.material_id == material_id
    ).order_by(MaterialHealthHistory.created_at.desc()).limit(10).all()
    
    return {
        "material_id": material.id,
        "name": material.name,
        "health_score": health_score,
        "freshness_score": 100 if material.last_updated else 0,
        "completeness_score": material.completeness_score or 0,
        "usage_score": min(100, (material.usage_count or 0) * 2),
        "last_updated": material.last_updated.isoformat() if material.last_updated else None,
        "usage_count": material.usage_count or 0,
        "status": material.status,
        "history": [
            {
                "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
                "overall_health_score": h.overall_health_score,
                "freshness_score": h.freshness_score,
                "completeness_score": h.completeness_score,
                "usage_score": h.usage_score
            }
            for h in history
        ]
    }

@router.post("/material/{material_id}/record")
async def record_material_health(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record current health metrics for a material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    health_score = calculate_health_score(material)
    
    # Create health history record
    health_record = MaterialHealthHistory(
        material_id=material_id,
        freshness_score=100 if material.last_updated else 0,
        completeness_score=material.completeness_score or 0,
        usage_score=min(100, (material.usage_count or 0) * 2),
        performance_score=0,  # TODO: Calculate from win/loss data
        overall_health_score=health_score,
        recorded_at=datetime.utcnow()
    )
    
    db.add(health_record)
    material.health_score = health_score
    db.commit()
    db.refresh(health_record)
    
    return health_record

@router.get("/quarterly-review")
async def get_quarterly_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quarterly health review data"""
    # Get all materials
    materials = db.query(Material).all()
    
    # Calculate health for all
    health_data = []
    for material in materials:
        health_score = calculate_health_score(material)
        health_data.append({
            "material_id": material.id,
            "name": material.name,
            "owner_id": material.owner_id,
            "health_score": health_score,
            "status": "current" if health_score >= 70 else "needs_update"
        })
    
    # Group by owner
    owner_stats = {}
    for h in health_data:
        owner_id = h["owner_id"]
        if owner_id not in owner_stats:
            owner_stats[owner_id] = {
                "total": 0,
                "current": 0,
                "needs_update": 0
            }
        owner_stats[owner_id]["total"] += 1
        if h["status"] == "current":
            owner_stats[owner_id]["current"] += 1
        else:
            owner_stats[owner_id]["needs_update"] += 1
    
    return {
        "materials": health_data,
        "owner_statistics": owner_stats,
        "overall_statistics": {
            "total_materials": len(health_data),
            "current_count": len([h for h in health_data if h["status"] == "current"]),
            "needs_update_count": len([h for h in health_data if h["status"] == "needs_update"])
        }
    }
