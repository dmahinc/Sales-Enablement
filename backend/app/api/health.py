"""
Material Health Dashboard API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import statistics
from app.models.material import Material, MaterialStatus
from app.models.health import MaterialHealthHistory
from app.models.product import Product, Universe, Category
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/api/health", tags=["health"])

# Essential material types for completeness calculation
MATERIAL_TYPES = [
    "PRODUCT_BRIEF",
    "PRODUCT_SALES_ENABLEMENT_DECK", 
    "PRODUCT_SALES_DECK",
    "PRODUCT_DATASHEET"
]

# Map database material_type values to frontend format
MATERIAL_TYPE_MAP = {
    "product_brief": "PRODUCT_BRIEF",
    "sales_enablement_deck": "PRODUCT_SALES_ENABLEMENT_DECK",
    "product_sales_enablement_deck": "PRODUCT_SALES_ENABLEMENT_DECK",
    "sales_deck": "PRODUCT_SALES_DECK",
    "product_sales_deck": "PRODUCT_SALES_DECK",
    "datasheet": "PRODUCT_DATASHEET",
    "product_datasheet": "PRODUCT_DATASHEET",
}

def calculate_freshness_score(material: Material) -> int:
    """Calculate freshness score (0-100) based on material age"""
    if not material.last_updated:
        return 0
    
    days_old = (datetime.utcnow() - material.last_updated).days
    if days_old > 180:  # 6 months
        return max(0, int(100 - (days_old - 180) * 0.5))
    elif days_old > 90:  # 3 months
        return max(50, int(100 - (days_old - 90)))
    else:
        return 100

def calculate_health_score(material: Material) -> int:
    """Calculate material health score (0-100)"""
    freshness_score = calculate_freshness_score(material)
    completeness_score = material.completeness_score or 0
    usage_score = min(100, (material.usage_count or 0) * 2)  # Cap at 100
    
    # Weighted average
    overall_score = int(
        (freshness_score * 0.3) +
        (completeness_score * 0.4) +
        (usage_score * 0.3)
    )
    
    return max(0, min(100, overall_score))

def calculate_quartiles(values: List[float]) -> Dict[str, float]:
    """Calculate quartiles (Q1, Q2/Median, Q3)"""
    if not values:
        return {"q1": 0, "q2": 0, "q3": 0}
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    
    # Q2 (Median)
    q2 = statistics.median(sorted_values)
    
    # Q1 and Q3
    mid = n // 2
    if n % 2 == 0:
        q1 = statistics.median(sorted_values[:mid])
        q3 = statistics.median(sorted_values[mid:])
    else:
        q1 = statistics.median(sorted_values[:mid])
        q3 = statistics.median(sorted_values[mid+1:])
    
    return {"q1": round(q1, 2), "q2": round(q2, 2), "q3": round(q3, 2)}

@router.get("/dashboard")
async def get_health_dashboard(
    skip: int = 0,
    limit: int = 100,
    min_health_score: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get health dashboard data with detailed metrics"""
    # Get all materials (not paginated for accurate metrics)
    all_materials = db.query(Material).all()
    
    # Calculate health scores and individual metrics
    freshness_scores = []
    non_archived_freshness_scores = []  # For freshness metrics (exclude archived)
    completeness_scores = []
    usage_scores = []
    age_distribution = {
        "fresh": 0,  # 0-30 days
        "recent": 0,  # 31-90 days
        "aging": 0,  # 91-180 days
        "stale": 0,  # 181-365 days
        "very_stale": 0,  # >365 days
        "no_date": 0
    }
    
    health_data = []
    for material in all_materials:
        freshness_score = calculate_freshness_score(material)
        completeness_score = material.completeness_score or 0
        usage_count = material.usage_count or 0
        usage_score = min(100, usage_count * 2)
        health_score = calculate_health_score(material)
        
        freshness_scores.append(freshness_score)
        completeness_scores.append(completeness_score)
        usage_scores.append(usage_score)
        
        # Age distribution (exclude archived materials)
        is_archived = material.status == MaterialStatus.ARCHIVED or str(material.status).lower() == "archived"
        if not is_archived:
            non_archived_freshness_scores.append(freshness_score)
            if material.last_updated:
                days_old = (datetime.utcnow() - material.last_updated).days
                if days_old <= 30:
                    age_distribution["fresh"] += 1
                elif days_old <= 90:
                    age_distribution["recent"] += 1
                elif days_old <= 180:
                    age_distribution["aging"] += 1
                elif days_old <= 365:
                    age_distribution["stale"] += 1
                else:
                    age_distribution["very_stale"] += 1
            else:
                age_distribution["no_date"] += 1
        
        health_data.append({
            "material_id": material.id,
            "name": material.name,
            "material_type": material.material_type,
            "product_name": material.product_name,
            "health_score": health_score,
            "freshness_score": freshness_score,
            "completeness_score": completeness_score,
            "usage_score": usage_score,
            "freshness": material.last_updated.isoformat() if material.last_updated else None,
            "completeness": completeness_score,
            "usage": usage_count,
            "status": material.status
        })
    
    # Filter by min health score if provided
    if min_health_score is not None:
        health_data = [h for h in health_data if h["health_score"] < min_health_score]
    
    # Paginate results
    paginated_data = health_data[skip:skip+limit]
    
    # Calculate quartiles (exclude archived materials from freshness quartiles)
    completeness_quartiles = calculate_quartiles(completeness_scores)
    usage_quartiles = calculate_quartiles(usage_scores)
    freshness_quartiles = calculate_quartiles(non_archived_freshness_scores)
    
    # Aggregate statistics
    total_materials = len(all_materials)
    avg_health_score = sum(h["health_score"] for h in health_data) / total_materials if total_materials > 0 else 0
    # Calculate average freshness excluding archived materials
    avg_freshness = sum(non_archived_freshness_scores) / len(non_archived_freshness_scores) if non_archived_freshness_scores else 0
    avg_completeness = sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0
    avg_usage = sum(usage_scores) / len(usage_scores) if usage_scores else 0
    low_health_count = len([h for h in health_data if h["health_score"] < 70])
    
    return {
        "materials": paginated_data,
        "statistics": {
            "total_materials": total_materials,
            "average_health_score": round(avg_health_score, 2),
            "low_health_count": low_health_count,
            "low_health_percentage": round((low_health_count / total_materials * 100) if total_materials > 0 else 0, 2)
        },
        "freshness_metrics": {
            "average_score": round(avg_freshness, 2),
            "age_distribution": age_distribution,
            "quartiles": freshness_quartiles
        },
        "completeness_metrics": {
            "average_score": round(avg_completeness, 2),
            "quartiles": completeness_quartiles
        },
        "usage_metrics": {
            "average_score": round(avg_usage, 2),
            "quartiles": usage_quartiles
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
    freshness_score = calculate_freshness_score(material)
    
    # Get health history
    history = db.query(MaterialHealthHistory).filter(
        MaterialHealthHistory.material_id == material_id
    ).order_by(MaterialHealthHistory.created_at.desc()).limit(10).all()
    
    return {
        "material_id": material.id,
        "name": material.name,
        "health_score": health_score,
        "freshness_score": freshness_score,
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
    freshness_score = calculate_freshness_score(material)
    
    # Create health history record
    health_record = MaterialHealthHistory(
        material_id=material_id,
        freshness_score=freshness_score,
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

@router.get("/completeness-matrix")
async def get_completeness_matrix(
    universe_id: Optional[int] = None,
    category_id: Optional[int] = None,
    only_published: bool = False,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get product-material type completeness matrix"""
    
    # Query products with filters
    products_query = db.query(Product)
    
    if universe_id:
        products_query = products_query.filter(Product.universe_id == universe_id)
    
    if category_id:
        products_query = products_query.filter(Product.category_id == category_id)
    
    if not include_inactive:
        products_query = products_query.filter(Product.is_active == True)
    
    products = products_query.all()
    
    # Query materials
    materials_query = db.query(Material)
    if only_published:
        materials_query = materials_query.filter(Material.status == MaterialStatus.PUBLISHED)
    
    all_materials = materials_query.all()
    
    # Build a map of product_name -> material types
    # Also create a reverse lookup: product -> all possible names (name, display_name)
    product_materials: Dict[str, Dict[str, List[Material]]] = {}
    product_name_mapping: Dict[int, List[str]] = {}  # product_id -> [name, display_name]
    
    # Pre-build product name mapping and create a set of all product names for quick lookup
    all_product_names = set()
    for product in products:
        names = [product.name]
        all_product_names.add(product.name)
        if product.display_name and product.display_name != product.name:
            names.append(product.display_name)
            all_product_names.add(product.display_name)
        product_name_mapping[product.id] = names
    
    # Also track materials by universe_name for materials without product_name
    materials_by_universe: Dict[str, List[Material]] = {}
    
    for material in all_materials:
        if material.product_name:
            product_name = material.product_name.strip()
            if product_name not in product_materials:
                product_materials[product_name] = {}
            
            # Normalize material type
            material_type_db = (material.material_type or "").strip()
            # Check if already in frontend format (uppercase)
            if material_type_db in MATERIAL_TYPES:
                material_type_frontend = material_type_db
            else:
                # Try mapping from database format
                material_type_db_lower = material_type_db.lower()
                material_type_frontend = MATERIAL_TYPE_MAP.get(material_type_db_lower)
            
            if material_type_frontend and material_type_frontend in MATERIAL_TYPES:
                if material_type_frontend not in product_materials[product_name]:
                    product_materials[product_name][material_type_frontend] = []
                product_materials[product_name][material_type_frontend].append(material)
        
        # Also track materials by universe_name (for materials without product_name or with unmatched product_name)
        if material.universe_name:
            universe_name = material.universe_name.strip()
            if universe_name not in materials_by_universe:
                materials_by_universe[universe_name] = []
            materials_by_universe[universe_name].append(material)
    
    # Build matrix rows
    matrix = []
    total_filled = 0
    total_possible = len(products) * len(MATERIAL_TYPES)
    
    universe_stats: Dict[int, Dict] = {}
    category_stats: Dict[int, Dict] = {}
    
    # Track freshness scores and age distribution per universe
    universe_freshness_scores: Dict[int, List[int]] = {}
    universe_age_distribution: Dict[int, Dict[str, int]] = {}
    
    for product in products:
        # Get universe and category info
        universe = db.query(Universe).filter(Universe.id == product.universe_id).first()
        category = None
        if product.category_id:
            category = db.query(Category).filter(Category.id == product.category_id).first()
        
        # Check which material types exist for this product
        # Try matching by both product.name and product.display_name
        product_name = product.name
        product_display_name = product.display_name
        
        # Get materials matching either name or display_name
        materials_for_product = product_materials.get(product_name, {})
        if product_display_name != product_name:
            # Also check display_name
            display_name_materials = product_materials.get(product_display_name, {})
            # Merge materials from display_name into materials_for_product
            for mat_type, materials_list in display_name_materials.items():
                if mat_type not in materials_for_product:
                    materials_for_product[mat_type] = []
                materials_for_product[mat_type].extend(materials_list)
        
        material_types_status = {}
        product_filled = 0
        
        for mat_type in MATERIAL_TYPES:
            materials = materials_for_product.get(mat_type, [])
            has_material = len(materials) > 0
            
            if has_material:
                product_filled += 1
                total_filled += 1
                latest_material = max(materials, key=lambda m: m.last_updated or datetime.min)
                material_types_status[mat_type] = {
                    "has_material": True,
                    "material_count": len(materials),
                    "latest_material_date": latest_material.last_updated.isoformat() if latest_material.last_updated else None
                }
            else:
                material_types_status[mat_type] = {
                    "has_material": False,
                    "material_count": 0,
                    "latest_material_date": None
                }
        
        # Count "other" materials (materials for this product that don't match the 4 essential types)
        # Also track their age distribution
        # Match by both product.name and product.display_name
        other_materials_count = 0
        other_materials_list = []
        product_names_to_match = [product_name]
        if product_display_name != product_name:
            product_names_to_match.append(product_display_name)
        
        for material in all_materials:
            if not material.product_name:
                continue
            
            material_product_name = material.product_name.strip()
            # Check if material matches this product by name or display_name
            if material_product_name not in product_names_to_match:
                continue
            
            # Normalize material type
            material_type_db = (material.material_type or "").strip()
            # Check if already in frontend format (uppercase)
            if material_type_db in MATERIAL_TYPES:
                material_type_frontend = material_type_db
            else:
                # Try mapping from database format
                material_type_db_lower = material_type_db.lower()
                material_type_frontend = MATERIAL_TYPE_MAP.get(material_type_db_lower)
            
            # Count materials that don't match the 4 essential types
            if not material_type_frontend or material_type_frontend not in MATERIAL_TYPES:
                other_materials_count += 1
                other_materials_list.append(material)
        
        # Calculate product completeness
        product_completeness = (product_filled / len(MATERIAL_TYPES)) * 100 if MATERIAL_TYPES else 0
        
        matrix.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_display_name": product.display_name,
            "universe_id": product.universe_id,
            "universe_name": universe.display_name if universe else universe.name if universe else "Unknown",
            "category_id": product.category_id,
            "category_name": category.display_name if category else category.name if category else None,
            "material_types": material_types_status,
            "other_materials_count": other_materials_count,
            "product_completeness": round(product_completeness, 2)
        })
        
        # Aggregate by universe
        if product.universe_id not in universe_stats:
            universe_stats[product.universe_id] = {
                "universe_id": product.universe_id,
                "universe_name": universe.display_name if universe else universe.name if universe else "Unknown",
                "total_products": 0,
                "filled_combinations": 0,
                "total_combinations": 0
            }
            universe_freshness_scores[product.universe_id] = []
            universe_age_distribution[product.universe_id] = {
                "fresh": 0,
                "recent": 0,
                "aging": 0,
                "stale": 0,
                "very_stale": 0,
                "no_date": 0
            }
        universe_stats[product.universe_id]["total_products"] += 1
        universe_stats[product.universe_id]["filled_combinations"] += product_filled
        universe_stats[product.universe_id]["total_combinations"] += len(MATERIAL_TYPES)
        
        # Calculate freshness for materials in this product
        # Get all materials for this product and calculate their freshness scores
        # Exclude draft and archived materials from age distribution
        product_materials_list = materials_for_product.values()
        for materials_list in product_materials_list:
            for material in materials_list:
                # Skip draft and archived materials for age distribution
                if material.status == MaterialStatus.DRAFT or material.status == MaterialStatus.ARCHIVED:
                    continue
                    
                freshness_score = calculate_freshness_score(material)
                universe_freshness_scores[product.universe_id].append(freshness_score)
                
                # Track age distribution (excluding drafts)
                if material.last_updated:
                    days_old = (datetime.utcnow() - material.last_updated).days
                    if days_old <= 30:
                        universe_age_distribution[product.universe_id]["fresh"] += 1
                    elif days_old <= 90:
                        universe_age_distribution[product.universe_id]["recent"] += 1
                    elif days_old <= 180:
                        universe_age_distribution[product.universe_id]["aging"] += 1
                    elif days_old <= 365:
                        universe_age_distribution[product.universe_id]["stale"] += 1
                    else:
                        universe_age_distribution[product.universe_id]["very_stale"] += 1
                else:
                    universe_age_distribution[product.universe_id]["no_date"] += 1
        
        # Also include "other" materials in freshness and age distribution (excluding drafts and archived)
        for material in other_materials_list:
            # Skip draft and archived materials for age distribution
            if material.status == MaterialStatus.DRAFT or material.status == MaterialStatus.ARCHIVED:
                continue
                
            freshness_score = calculate_freshness_score(material)
            universe_freshness_scores[product.universe_id].append(freshness_score)
            
            # Track age distribution for "other" materials (excluding drafts)
            if material.last_updated:
                days_old = (datetime.utcnow() - material.last_updated).days
                if days_old <= 30:
                    universe_age_distribution[product.universe_id]["fresh"] += 1
                elif days_old <= 90:
                    universe_age_distribution[product.universe_id]["recent"] += 1
                elif days_old <= 180:
                    universe_age_distribution[product.universe_id]["aging"] += 1
                elif days_old <= 365:
                    universe_age_distribution[product.universe_id]["stale"] += 1
                else:
                    universe_age_distribution[product.universe_id]["very_stale"] += 1
            else:
                universe_age_distribution[product.universe_id]["no_date"] += 1
        
        # Aggregate by category
        if product.category_id:
            if product.category_id not in category_stats:
                category_stats[product.category_id] = {
                    "category_id": product.category_id,
                    "category_name": category.display_name if category else category.name if category else "Unknown",
                    "universe_id": product.universe_id,
                    "total_products": 0,
                    "filled_combinations": 0,
                    "total_combinations": 0
                }
            category_stats[product.category_id]["total_products"] += 1
            category_stats[product.category_id]["filled_combinations"] += product_filled
            category_stats[product.category_id]["total_combinations"] += len(MATERIAL_TYPES)
    
    # Calculate overall score
    overall_score = (total_filled / total_possible * 100) if total_possible > 0 else 0
    
    # Also process materials that have universe_name but no matching product
    # These should still be counted in freshness and age distribution
    for universe_name, materials in materials_by_universe.items():
        # Find universe by name
        universe = db.query(Universe).filter(
            (Universe.name == universe_name) | 
            (Universe.display_name == universe_name)
        ).first()
        
        if not universe:
            continue
        
        universe_id = universe.id
        
        # Initialize if universe not already in stats (might have no products)
        if universe_id not in universe_stats:
            universe_stats[universe_id] = {
                "universe_id": universe_id,
                "universe_name": universe.display_name if universe else universe.name if universe else universe_name,
                "total_products": 0,
                "filled_combinations": 0,
                "total_combinations": 0
            }
        if universe_id not in universe_freshness_scores:
            universe_freshness_scores[universe_id] = []
        if universe_id not in universe_age_distribution:
            universe_age_distribution[universe_id] = {
                "fresh": 0,
                "recent": 0,
                "aging": 0,
                "stale": 0,
                "very_stale": 0,
                "no_date": 0
            }
        
        # Process materials that don't match any product
        for material in materials:
            # Skip if this material already matched a product
            if material.product_name and material.product_name.strip() in all_product_names:
                continue
            
            # Normalize material type
            material_type_db = (material.material_type or "").strip()
            # Check if already in frontend format (uppercase)
            if material_type_db in MATERIAL_TYPES:
                material_type_frontend = material_type_db
            else:
                # Try mapping from database format
                material_type_db_lower = material_type_db.lower()
                material_type_frontend = MATERIAL_TYPE_MAP.get(material_type_db_lower)
            
            # Only count essential types for completeness, but count all for freshness/age
            if material_type_frontend and material_type_frontend in MATERIAL_TYPES:
                # This material could contribute to completeness if we had a product for it
                # But since we don't, we'll only count it for freshness/age distribution
                pass
            
            # Always count for freshness and age distribution (excluding drafts and archived)
            # Skip draft and archived materials for age distribution
            if material.status == MaterialStatus.DRAFT or material.status == MaterialStatus.ARCHIVED:
                continue
                
            freshness_score = calculate_freshness_score(material)
            universe_freshness_scores[universe_id].append(freshness_score)
            
            # Track age distribution (excluding drafts)
            if material.last_updated:
                days_old = (datetime.utcnow() - material.last_updated).days
                if days_old <= 30:
                    universe_age_distribution[universe_id]["fresh"] += 1
                elif days_old <= 90:
                    universe_age_distribution[universe_id]["recent"] += 1
                elif days_old <= 180:
                    universe_age_distribution[universe_id]["aging"] += 1
                elif days_old <= 365:
                    universe_age_distribution[universe_id]["stale"] += 1
                else:
                    universe_age_distribution[universe_id]["very_stale"] += 1
            else:
                universe_age_distribution[universe_id]["no_date"] += 1
    
    # Calculate scores for universes and categories
    by_universe = []
    for universe_id, stats in universe_stats.items():
        completeness_score = (stats["filled_combinations"] / stats["total_combinations"] * 100) if stats["total_combinations"] > 0 else 0
        
        # Calculate average freshness score for this universe
        freshness_scores = universe_freshness_scores.get(universe_id, [])
        freshness_score = sum(freshness_scores) / len(freshness_scores) if freshness_scores else 0
        
        # Get age distribution for this universe
        age_dist = universe_age_distribution.get(universe_id, {
            "fresh": 0,
            "recent": 0,
            "aging": 0,
            "stale": 0,
            "very_stale": 0,
            "no_date": 0
        })
        
        # Calculate total materials count (sum of all age distribution categories)
        total_materials_count = sum(age_dist.values())
        
        by_universe.append({
            "universe_id": stats["universe_id"],
            "universe_name": stats["universe_name"],
            "score": round(completeness_score, 2),
            "freshness_score": round(freshness_score, 2),
            "age_distribution": age_dist,
            "total_materials": total_materials_count,
            "total_products": stats["total_products"],
            "filled_combinations": stats["filled_combinations"],
            "total_combinations": stats["total_combinations"]
        })
    
    by_category = []
    for category_id, stats in category_stats.items():
        score = (stats["filled_combinations"] / stats["total_combinations"] * 100) if stats["total_combinations"] > 0 else 0
        by_category.append({
            "category_id": stats["category_id"],
            "category_name": stats["category_name"],
            "universe_id": stats["universe_id"],
            "score": round(score, 2),
            "total_products": stats["total_products"],
            "filled_combinations": stats["filled_combinations"],
            "total_combinations": stats["total_combinations"]
        })
    
    return {
        "overall_score": round(overall_score, 2),
        "total_products": len(products),
        "total_material_types": len(MATERIAL_TYPES),
        "total_combinations": total_possible,
        "filled_combinations": total_filled,
        "by_universe": by_universe,
        "by_category": by_category,
        "matrix": matrix
    }
