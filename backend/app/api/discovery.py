"""
Narrative Discovery API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.material import Material
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
import json

router = APIRouter(prefix="/api/discovery", tags=["discovery"])

@router.get("/search")
async def search_narratives(
    keywords: Optional[str] = None,
    use_case: Optional[str] = None,
    pain_point: Optional[str] = None,
    product_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for narratives/materials by keywords, use cases, pain points"""
    query = db.query(Material)
    
    # Build search filters
    filters = []
    
    if keywords:
        # Search in name, description, keywords, tags
        keyword_filter = or_(
            Material.name.ilike(f"%{keywords}%"),
            Material.description.ilike(f"%{keywords}%"),
            Material.keywords.ilike(f"%{keywords}%"),
            Material.tags.ilike(f"%{keywords}%")
        )
        filters.append(keyword_filter)
    
    if use_case:
        # Search in use_cases field (JSON array)
        use_case_filter = Material.use_cases.ilike(f"%{use_case}%")
        filters.append(use_case_filter)
    
    if pain_point:
        # Search in pain_points field (JSON array)
        pain_point_filter = Material.pain_points.ilike(f"%{pain_point}%")
        filters.append(pain_point_filter)
    
    if product_name:
        product_filter = Material.product_name.ilike(f"%{product_name}%")
        filters.append(product_filter)
    
    # Apply all filters
    if filters:
        query = query.filter(and_(*filters))
    
    # Only return published materials
    query = query.filter(Material.status.in_(["published", "high_usage"]))
    
    materials = query.offset(skip).limit(limit).all()
    
    results = []
    for material in materials:
        # Parse JSON fields
        keywords_list = json.loads(material.keywords) if material.keywords else []
        use_cases_list = json.loads(material.use_cases) if material.use_cases else []
        pain_points_list = json.loads(material.pain_points) if material.pain_points else []
        tags_list = json.loads(material.tags) if material.tags else []
        
        results.append({
            "material_id": material.id,
            "name": material.name,
            "material_type": material.material_type,
            "product_name": material.product_name,
            "universe_name": material.universe_name,
            "description": material.description,
            "keywords": keywords_list,
            "use_cases": use_cases_list,
            "pain_points": pain_points_list,
            "tags": tags_list,
            "usage_count": material.usage_count or 0,
            "health_score": material.health_score or 0
        })
    
    return {
        "results": results,
        "total": len(results),
        "skip": skip,
        "limit": limit
    }

@router.get("/by-use-case/{use_case}")
async def get_materials_by_use_case(
    use_case: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get materials for a specific use case"""
    query = db.query(Material).filter(
        Material.use_cases.ilike(f"%{use_case}%"),
        Material.status.in_(["published", "high_usage"])
    )
    
    materials = query.offset(skip).limit(limit).all()
    
    return {
        "use_case": use_case,
        "materials": [
            {
                "material_id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "product_name": m.product_name,
                "description": m.description
            }
            for m in materials
        ]
    }

@router.get("/by-pain-point/{pain_point}")
async def get_materials_by_pain_point(
    pain_point: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get materials for a specific pain point"""
    query = db.query(Material).filter(
        Material.pain_points.ilike(f"%{pain_point}%"),
        Material.status.in_(["published", "high_usage"])
    )
    
    materials = query.offset(skip).limit(limit).all()
    
    return {
        "pain_point": pain_point,
        "materials": [
            {
                "material_id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "product_name": m.product_name,
                "description": m.description
            }
            for m in materials
        ]
    }

@router.post("/material/{material_id}/tag")
async def tag_material(
    material_id: int,
    tags: List[str],
    keywords: Optional[List[str]] = None,
    use_cases: Optional[List[str]] = None,
    pain_points: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tag a material for discovery"""
    import json
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update tags
    if tags:
        material.tags = json.dumps(tags)
    if keywords:
        material.keywords = json.dumps(keywords)
    if use_cases:
        material.use_cases = json.dumps(use_cases)
    if pain_points:
        material.pain_points = json.dumps(pain_points)
    
    db.commit()
    db.refresh(material)
    
    return material
