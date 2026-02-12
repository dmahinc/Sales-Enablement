"""
Role-based Dashboard API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material, MaterialType
from app.models.product import Product
from app.models.persona import Persona
from app.models.segment import Segment
from app.models.usage import MaterialUsage

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/director")
async def get_director_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Director Dashboard - Monitoring team progress on document completion"""
    # Allow director, pmm, and superuser roles
    if current_user.role not in ["director", "pmm"] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Requires director or PMM role")
    
    # Get all materials with product hierarchy info
    materials = db.query(Material).all()
    
    # Get all products with universe relationship loaded
    from sqlalchemy.orm import joinedload
    products = db.query(Product).options(joinedload(Product.universe)).all()
    
    # Get standard material types (excluding product_portfolio and product_catalog)
    # Map database enum values to frontend enum values for comparison
    db_to_frontend_type_mapping = {
        'PRODUCT_BRIEF': 'product_brief',
        'PRODUCT_SALES_ENABLEMENT_DECK': 'sales_enablement_deck',
        'PRODUCT_SALES_DECK': 'sales_deck',
        'PRODUCT_DATASHEET': 'datasheet',
        'PRODUCT_PORTFOLIO_PRESENTATION': 'product_portfolio',
        'PRODUCT_CATALOG': 'product_catalog',
    }
    
    standard_material_types = [
        MaterialType.PRODUCT_BRIEF.value,
        MaterialType.SALES_ENABLEMENT_DECK.value,
        MaterialType.SALES_DECK.value,
        MaterialType.DATASHEET.value
    ]
    
    # Also include database enum values for comparison
    standard_db_types = [
        'PRODUCT_BRIEF',
        'PRODUCT_SALES_ENABLEMENT_DECK',
        'PRODUCT_SALES_DECK',
        'PRODUCT_DATASHEET'
    ]
    material_type_labels = {
        "product_brief": "Product Brief",
        "sales_enablement_deck": "Sales Enablement Deck",
        "sales_deck": "Sales Deck",
        "datasheet": "Datasheet",
        "other": "Other"
    }
    all_material_types = standard_material_types + ["other"]
    
    # Calculate completion metrics by product with detailed material type breakdown
    product_completion = {}
    product_completion_matrix = []
    
    for product in products:
        # Match materials by product_name - check both name and display_name
        # Materials might have product_name matching either product.name or product.display_name
        # Use case-insensitive comparison and also check display_name
        product_materials = [
            m for m in materials 
            if m.product_name and (
                m.product_name.lower().strip() == product.name.lower().strip() or 
                m.product_name.lower().strip() == (product.display_name or '').lower().strip() or
                m.product_name.lower().strip() == product.name.lower().strip().replace(' ', '') or
                m.product_name.lower().strip() == (product.display_name or '').lower().strip().replace(' ', '')
            )
        ]
        
        # Get universe name from relationship
        universe_name = None
        universe_id = product.universe_id
        if product.universe:
            universe_name = product.universe.name
        
        # Create material type completion map
        # Convert database enum values to frontend enum values for comparison
        material_type_completion = {}
        
        # Check standard material types
        for mat_type in standard_material_types:
            # Check if any material has this type (either as DB enum or frontend enum)
            has_type = False
            for m in product_materials:
                if not m.material_type:
                    continue
                # Check if it matches the frontend enum value
                if m.material_type.lower() == mat_type.lower():
                    has_type = True
                    break
                # Check if it matches the database enum value (convert to frontend)
                db_type_normalized = m.material_type.upper()
                frontend_equivalent = db_to_frontend_type_mapping.get(db_type_normalized)
                if frontend_equivalent and frontend_equivalent == mat_type:
                    has_type = True
                    break
            material_type_completion[mat_type] = has_type
        
        # Count "Other" materials (materials with types not in standard list)
        # Check both database and frontend enum values
        other_materials = []
        for m in product_materials:
            if not m.material_type:
                other_materials.append(m)
                continue
            
            # Check if it's a standard type (either DB or frontend format)
            is_standard = False
            db_type_normalized = m.material_type.upper()
            frontend_equivalent = db_to_frontend_type_mapping.get(db_type_normalized)
            
            if m.material_type.lower() in [mt.lower() for mt in standard_material_types]:
                is_standard = True
            elif frontend_equivalent and frontend_equivalent in standard_material_types:
                is_standard = True
            elif db_type_normalized in standard_db_types:
                is_standard = True
            
            if not is_standard:
                other_materials.append(m)
        # Store count of other materials (will be displayed as number, not checkbox)
        material_type_completion["other"] = len(other_materials)
        
        # Count completed standard types (excluding "other" which is a count, not a boolean)
        completed_standard_types = sum(1 for mt in standard_material_types if material_type_completion.get(mt, False))
        total_material_types = len(standard_material_types)
        completion_pct = int((completed_standard_types / total_material_types) * 100) if total_material_types > 0 else 0
        
        product_completion[product.id] = {
            "product_id": product.id,
            "product_name": product.name,
            "display_name": product.display_name,
            "universe": universe_name,
            "universe_id": universe_id,
            "completion_percentage": completion_pct,
            "materials_count": len(product_materials),
            "missing_types": total_material_types - completed_standard_types,
            "material_types": material_type_completion,
            "other_materials_count": len(other_materials)
        }
        
        product_completion_matrix.append({
            "product_id": product.id,
            "product_name": product.name,
            "display_name": product.display_name,
            "universe": universe_name,
            "universe_id": universe_id,
            "material_types": material_type_completion,
            "other_materials_count": len(other_materials)
        })
    
    # Get team member contributions
    pmm_users = db.query(User).filter(User.role == "pmm").all()
    team_contributions = []
    for pmm in pmm_users:
        pmm_materials = db.query(Material).filter(Material.owner_id == pmm.id).all()
        team_contributions.append({
            "user_id": pmm.id,
            "full_name": pmm.full_name,
            "email": pmm.email,
            "materials_count": len(pmm_materials),
            "recent_uploads": len([m for m in pmm_materials if m.created_at and (datetime.utcnow() - m.created_at).days <= 30])
        })
    
    # Calculate overall completion
    total_products = len(products)
    products_with_materials = len([p for p in product_completion.values() if p["materials_count"] > 0])
    overall_completion = int((products_with_materials / total_products * 100)) if total_products > 0 else 0
    
    # Get gap analysis - products missing critical materials
    gaps = []
    for product_id, data in product_completion.items():
        if data["missing_types"] > 0:
            gaps.append({
                "product_name": data["product_name"],
                "missing_count": data["missing_types"],
                "completion": data["completion_percentage"]
            })
    gaps.sort(key=lambda x: x["missing_count"], reverse=True)
    
    return {
        "overall_completion_percentage": overall_completion,
        "total_products": total_products,
        "products_with_materials": products_with_materials,
        "total_materials": len(materials),
        "product_completion": list(product_completion.values()),
        "product_completion_matrix": product_completion_matrix,
        "material_types": all_material_types,
        "material_type_labels": material_type_labels,
        "team_contributions": team_contributions,
        "gap_analysis": gaps[:10],  # Top 10 gaps
        "recent_activity": {
            "materials_last_7_days": len([m for m in materials if m.created_at and (datetime.utcnow() - m.created_at).days <= 7]),
            "materials_last_30_days": len([m for m in materials if m.created_at and (datetime.utcnow() - m.created_at).days <= 30])
        }
    }

@router.get("/pmm")
async def get_pmm_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PMM Dashboard - Contributor workspace for uploading materials"""
    if current_user.role != "pmm" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Requires pmm role")
    
    # Get user's materials
    user_materials = db.query(Material).filter(Material.owner_id == current_user.id).all()
    
    # Get assigned products (for now, all products - can be enhanced with assignment table)
    all_products = db.query(Product).all()
    
    # Calculate user's contribution stats
    materials_by_type = {}
    for material in user_materials:
        mat_type = material.material_type or "other"
        materials_by_type[mat_type] = materials_by_type.get(mat_type, 0) + 1
    
    # Calculate completion for user's products
    user_product_completion = {}
    for product in all_products:
        # Match materials by product_name (string match)
        product_materials = [m for m in user_materials if m.product_name and m.product_name.lower() == product.name.lower()]
        if product_materials:
            user_product_completion[product.id] = {
                "product_id": product.id,
                "product_name": product.name,
                "materials_count": len(product_materials),
                "last_updated": max([m.updated_at or m.created_at for m in product_materials] if product_materials else [datetime.utcnow()])
            }
    
    # Get recent uploads
    recent_materials = sorted(
        user_materials,
        key=lambda m: m.created_at or datetime.min,
        reverse=True
    )[:5]
    
    # Calculate health score for user's materials
    total_materials = len(user_materials)
    recent_materials_count = len([m for m in user_materials if m.created_at and (datetime.utcnow() - m.created_at).days <= 90])
    health_score = int((recent_materials_count / total_materials * 100)) if total_materials > 0 else 0
    
    return {
        "user_stats": {
            "total_materials": total_materials,
            "materials_by_type": materials_by_type,
            "health_score": health_score,
            "products_contributed_to": len(user_product_completion)
        },
        "recent_uploads": [
            {
                "id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "product_name": m.product_name or "Unknown",
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "status": m.status or "draft"
            }
            for m in recent_materials
        ],
        "product_completion": list(user_product_completion.values()),
        "quick_actions": {
            "upload_material": True,
            "view_materials": True,
            "assignments_pending": len([p for p in all_products if p.id not in user_product_completion]) if all_products else 0
        }
    }

@router.get("/sales")
async def get_sales_dashboard(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Sales Dashboard - Discovery and sharing hub"""
    if current_user.role != "sales" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Requires sales role")
    
    # Parse date filters if provided
    date_filter_start = None
    date_filter_end = None
    if start_date and end_date:
        try:
            date_filter_start = datetime.strptime(start_date, "%Y-%m-%d")
            date_filter_end = datetime.strptime(end_date, "%Y-%m-%d")
            # Set end date to end of day
            date_filter_end = date_filter_end.replace(hour=23, minute=59, second=59)
            if date_filter_start > date_filter_end:
                raise HTTPException(status_code=400, detail="Start date must be before end date")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get published materials only
    published_materials = db.query(Material).filter(Material.status == "published").all()
    
    # Get materials by type for quick access
    materials_by_type = {}
    for material in published_materials:
        mat_type = material.material_type or "other"
        if mat_type not in materials_by_type:
            materials_by_type[mat_type] = []
        materials_by_type[mat_type].append({
            "id": material.id,
            "name": material.name,
            "product_name": material.product_name,
            "created_at": material.created_at.isoformat() if material.created_at else None
        })
    
    # Get user's usage history (if tracking exists) - filter by date if provided
    user_usage_query = db.query(MaterialUsage).filter(MaterialUsage.user_id == current_user.id)
    if date_filter_start and date_filter_end:
        user_usage_query = user_usage_query.filter(
            and_(
                MaterialUsage.viewed_at >= date_filter_start,
                MaterialUsage.viewed_at <= date_filter_end
            )
        )
    user_usage = user_usage_query.all()
    
    recently_viewed = []
    if user_usage:
        recent_usage = sorted(user_usage, key=lambda u: u.viewed_at or datetime.min, reverse=True)[:5]
        for usage in recent_usage:
            material = db.query(Material).filter(Material.id == usage.material_id).first()
            if material:
                recently_viewed.append({
                    "id": material.id,
                    "name": material.name,
                    "material_type": material.material_type,
                    "viewed_at": usage.viewed_at.isoformat() if usage.viewed_at else None
                })
    
    # Get popular materials (most used) - filter by date if provided
    usage_counts_query = db.query(
        MaterialUsage.material_id,
        func.count(MaterialUsage.id).label('usage_count')
    )
    if date_filter_start and date_filter_end:
        usage_counts_query = usage_counts_query.filter(
            and_(
                MaterialUsage.viewed_at >= date_filter_start,
                MaterialUsage.viewed_at <= date_filter_end
            )
        )
    usage_counts = usage_counts_query.group_by(MaterialUsage.material_id).order_by(func.count(MaterialUsage.id).desc()).limit(5).all()
    
    popular_materials = []
    for material_id, count in usage_counts:
        material = db.query(Material).filter(Material.id == material_id).first()
        if material and material.status == "published":
            popular_materials.append({
                "id": material.id,
                "name": material.name,
                "material_type": material.material_type,
                "usage_count": count
            })
    
    # Get personas and segments for filtering
    personas = db.query(Persona).all()
    segments = db.query(Segment).all()
    
    return {
        "available_materials": {
            "total": len(published_materials),
            "by_type": {k: len(v) for k, v in materials_by_type.items()}
        },
        "recently_viewed": recently_viewed,
        "popular_materials": popular_materials,
        "quick_filters": {
            "personas": [{"id": p.id, "name": p.name} for p in personas],
            "segments": [{"id": s.id, "name": s.name} for s in segments],
            "material_types": list(materials_by_type.keys())
        },
        "quick_actions": {
            "discover": True,
            "share": True,
            "collections": False  # Future feature
        }
    }
