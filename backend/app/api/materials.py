"""
Materials API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response, Request
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.material import Material, MaterialType, MaterialAudience, MaterialStatus
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.schemas.error import ErrorResponse
from datetime import datetime, timedelta
from app.services.file_extraction import extract_text_from_file
from app.services.ai_service import generate_executive_summary
from app.core.config import settings
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Import storage_service from storage module
from app.services.storage import storage_service

router = APIRouter(prefix="/api/materials", tags=["materials"])

def _check_existing_material_by_name(
    db: Session,
    product_name: str,
    material_name: str,
    exclude_material_id: Optional[int] = None
) -> Optional[Material]:
    """
    Check if a material with the exact same name already exists for the given product.
    Returns the existing material if found, None otherwise.
    This is used to BLOCK uploads (exact duplicate).
    """
    query = db.query(Material).filter(
        Material.product_name.ilike(f"%{product_name}%"),
        Material.name == material_name,  # Exact name match
        Material.status != "ARCHIVED"  # Don't consider archived materials
    )
    
    if exclude_material_id:
        query = query.filter(Material.id != exclude_material_id)
    
    return query.first()


def _check_existing_material_by_type(
    db: Session,
    product_name: str,
    material_type: str,
    exclude_material_id: Optional[int] = None
) -> List[Material]:
    """
    Check if materials of the same type already exist for the given product.
    Excludes 'other' type from duplicate checking.
    Returns a list of existing materials (can be multiple versions).
    This is used to WARN users (same type, different name).
    """
    # Don't check for duplicates if material_type is 'other'
    if material_type.lower() == 'other' or material_type.upper() == 'OTHER':
        return []
    
    # Normalize material type for comparison
    # Map database enum values to frontend values
    db_to_frontend_mapping = {
        'PRODUCT_BRIEF': 'product_brief',
        'PRODUCT_SALES_ENABLEMENT_DECK': 'sales_enablement_deck',
        'PRODUCT_SALES_DECK': 'sales_deck',
        'PRODUCT_DATASHEET': 'datasheet',
        'PRODUCT_PORTFOLIO_PRESENTATION': 'product_portfolio',
        'PRODUCT_CATALOG': 'product_catalog',
    }
    
    # Normalize the input material_type
    normalized_type = material_type.lower()
    if material_type.upper() in db_to_frontend_mapping:
        normalized_type = db_to_frontend_mapping[material_type.upper()].lower()
    
    # Query for existing materials with same product_name
    query = db.query(Material).filter(
        Material.product_name.ilike(f"%{product_name}%"),
        Material.status != "ARCHIVED"  # Don't consider archived materials
    )
    
    if exclude_material_id:
        query = query.filter(Material.id != exclude_material_id)
    
    existing_materials = query.all()
    
    # Filter materials that match the type
    matching_materials = []
    for existing in existing_materials:
        if not existing.material_type:
            continue
        
        # Normalize existing material type
        existing_type_normalized = existing.material_type.lower()
        if existing.material_type.upper() in db_to_frontend_mapping:
            existing_type_normalized = db_to_frontend_mapping[existing.material_type.upper()].lower()
        
        # If types match, add to list
        if existing_type_normalized == normalized_type:
            matching_materials.append(existing)
    
    return matching_materials


def _check_existing_material(
    db: Session,
    product_name: str,
    material_type: str,
    exclude_material_id: Optional[int] = None
) -> Optional[Material]:
    """
    Legacy function for backward compatibility.
    Check if a material of the same type already exists for the given product.
    Returns the first existing material if found, None otherwise.
    """
    existing_materials = _check_existing_material_by_type(db, product_name, material_type, exclude_material_id)
    return existing_materials[0] if existing_materials else None

@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    material_type: Optional[str] = None,
    audience: Optional[str] = None,
    product_name: Optional[str] = None,
    universe_name: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all materials with optional filters"""
    query = db.query(Material)
    
    if material_type:
        query = query.filter(Material.material_type == material_type)
    if audience:
        query = query.filter(Material.audience == audience)
    if product_name:
        query = query.filter(Material.product_name.ilike(f"%{product_name}%"))
    if universe_name:
        query = query.filter(Material.universe_name.ilike(f"%{universe_name}%"))
    if status:
        query = query.filter(Material.status == status)
    
    materials = query.offset(skip).limit(limit).all()
    
    # Add PMM information to each material
    result = []
    for material in materials:
        material_dict = MaterialResponse.model_validate(material).model_dump()
        if material.pmm_in_charge_id:
            pmm_user = db.query(User).filter(User.id == material.pmm_in_charge_id).first()
            if pmm_user:
                material_dict['pmm_in_charge_name'] = pmm_user.full_name
                material_dict['pmm_in_charge_email'] = pmm_user.email
        result.append(material_dict)
    
    return result

@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Add PMM information
    material_dict = MaterialResponse.model_validate(material).model_dump()
    if material.pmm_in_charge_id:
        pmm_user = db.query(User).filter(User.id == material.pmm_in_charge_id).first()
        if pmm_user:
            material_dict['pmm_in_charge_name'] = pmm_user.full_name
            material_dict['pmm_in_charge_email'] = pmm_user.email
    
    return material_dict

@router.get("/check-duplicate")
async def check_duplicate_material(
    product_name: str,
    material_type: str,
    material_name: Optional[str] = None,
    material_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check for duplicate materials.
    - Returns blocking=True if exact name match found (should block upload)
    - Returns warning=True if same type but different name (should warn but allow)
    """
    result = {
        "blocking": False,
        "warning": False,
        "existing_material": None,
        "existing_materials": []
    }
    
    # Check for exact name match (blocking)
    if material_name:
        existing_by_name = _check_existing_material_by_name(db, product_name, material_name, material_id)
        if existing_by_name:
            result["blocking"] = True
            result["existing_material"] = {
                "id": existing_by_name.id,
                "name": existing_by_name.name,
                "material_type": existing_by_name.material_type,
                "created_at": existing_by_name.created_at.isoformat() if existing_by_name.created_at else None,
                "updated_at": existing_by_name.updated_at.isoformat() if existing_by_name.updated_at else None,
            }
            return result
    
    # Check for same type (warning)
    existing_by_type = _check_existing_material_by_type(db, product_name, material_type, material_id)
    if existing_by_type:
        result["warning"] = True
        result["existing_materials"] = [
            {
                "id": m.id,
                "name": m.name,
                "material_type": m.material_type,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            }
            for m in existing_by_type
        ]
    
    # Backward compatibility: set "exists" field
    result["exists"] = result["blocking"] or result["warning"]
    if result["exists"] and not result["existing_material"] and result["existing_materials"]:
        result["existing_material"] = result["existing_materials"][0]
    
    return result

@router.post(
    "",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Material",
    description="Create a new material with metadata. File upload is handled separately via the upload endpoint.",
    responses={
        201: {"description": "Material created successfully"},
        400: {"description": "Invalid input data or validation error"},
        401: {"description": "Authentication required"},
        409: {"description": "Material with same name already exists"}
    }
)
async def create_material(
    material_data: MaterialCreate,
    replace_existing: str = "false",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new material with metadata.
    
    Creates a material record in the database. This endpoint only handles metadata;
    file upload must be done separately using the `/api/materials/upload` endpoint.
    
    **Requirements:**
    - User must be authenticated
    - Material name must be unique (unless `replace_existing=true`)
    
    **Parameters:**
    - `material_data`: Material metadata (name, description, type, product hierarchy, etc.)
    - `replace_existing`: If "true", replaces existing material with same name
    
    **Product Hierarchy:**
    - Can optionally associate material with universe, category, and product
    - All hierarchy IDs must exist and be valid
    
    **Returns:**
    - Created material object with assigned ID
    """
    try:
        from app.models.product import Universe, Category, Product
        
        # Validate required fields
        if not material_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="universe_id is required"
            )
        if not material_data.category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="category_id is required"
            )
        if not material_data.product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="product_id is required"
            )
        
        # Look up universe, category, and product names from IDs
        universe = db.query(Universe).filter(Universe.id == material_data.universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {material_data.universe_id} not found"
            )
        
        category = db.query(Category).filter(Category.id == material_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {material_data.category_id} not found"
            )
        
        product = db.query(Product).filter(Product.id == material_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {material_data.product_id} not found"
            )
        
        # Validate category belongs to universe
        if category.universe_id != material_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
        
        # Ensure product belongs to selected universe
        if product.universe_id != material_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
        
        # Ensure product belongs to selected category (if product has a category)
        if product.category_id and product.category_id != material_data.category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
        
        # Convert lists to JSON strings for storage
        material_dict = material_data.dict()
        material_dict['tags'] = str(material_dict.get('tags', [])) if material_dict.get('tags') else None
        material_dict['keywords'] = str(material_dict.get('keywords', [])) if material_dict.get('keywords') else None
        material_dict['use_cases'] = str(material_dict.get('use_cases', [])) if material_dict.get('use_cases') else None
        material_dict['pain_points'] = str(material_dict.get('pain_points', [])) if material_dict.get('pain_points') else None
        material_dict['owner_id'] = current_user.id
        
        # Set PMM in charge: if current user is PMM, use them; otherwise use provided pmm_in_charge_id or leave null
        if current_user.role == "pmm":
            material_dict['pmm_in_charge_id'] = current_user.id
        elif 'pmm_in_charge_id' not in material_dict or not material_dict.get('pmm_in_charge_id'):
            # If not PMM and no PMM specified, leave null (can be set later)
            material_dict['pmm_in_charge_id'] = None
        
        # Set names from product/universe if not provided
        final_product_name = material_dict.get('product_name') or (product.display_name or product.name)
        final_universe_name = material_dict.get('universe_name') or universe.name
        material_dict['product_name'] = final_product_name
        material_dict['universe_name'] = final_universe_name
        
        # Check for existing material of the same type (unless replacing)
        # Check for exact name match (BLOCK - exact duplicate)
        material_name = material_dict.get('name', '')
        if material_name:
            existing_by_name = _check_existing_material_by_name(db, final_product_name, material_name)
            if existing_by_name:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"A material with the name '{material_name}' already exists for this product",
                        "blocking": True,
                        "existing_material": {
                            "id": existing_by_name.id,
                            "name": existing_by_name.name,
                            "material_type": existing_by_name.material_type,
                            "created_at": existing_by_name.created_at.isoformat() if existing_by_name.created_at else None,
                        }
                    }
                )
        
        # Check for same type (warn but allow - multiple versions allowed)
        material_type = material_dict.get('material_type')
        existing_by_type = _check_existing_material_by_type(db, final_product_name, material_type) if material_type else []
        
        # Handle both bool and string "true"/"false" for replace_existing
        replace_existing_bool = replace_existing if isinstance(replace_existing, bool) else replace_existing.lower() == "true"
        if replace_existing_bool and existing_by_type:
            # Archive existing materials of the same type
            for existing in existing_by_type:
                existing.status = MaterialStatus.ARCHIVED
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            db.commit()  # Commit the archive before creating new material
        
        # Remove IDs as they're not stored in Material model (for now)
        material_dict.pop('universe_id', None)
        material_dict.pop('category_id', None)
        material_dict.pop('product_id', None)
        
        material = Material(**material_dict)
        db.add(material)
        db.commit()
        db.refresh(material)
        
        # Return material with warning if same type exists (but different name)
        if existing_by_type:
            warning_message = f"A {material_type} already exists for this product ({', '.join([m.name for m in existing_by_type])}). You can upload multiple versions as long as the filename is different."
            from app.schemas.material import MaterialResponse
            material_dict_response = MaterialResponse.model_validate(material).model_dump()
            material_dict_response["warning"] = warning_message
            material_dict_response["existing_materials"] = [
                {
                    "id": m.id,
                    "name": m.name,
                    "material_type": m.material_type,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in existing_by_type
            ]
            return material_dict_response
        
        return material
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create material: {str(e)}"
        )

@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    material_data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a material"""
    from app.models.product import Universe, Category, Product
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    try:
        # Update only provided fields
        update_data = material_data.dict(exclude_unset=True)
        
        # If IDs are provided, look up names
        if 'universe_id' in update_data and update_data['universe_id']:
            universe = db.query(Universe).filter(Universe.id == update_data['universe_id']).first()
            if not universe:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Universe with id {update_data['universe_id']} not found"
                )
            update_data['universe_name'] = universe.name
        
        if 'product_id' in update_data and update_data['product_id']:
            product = db.query(Product).filter(Product.id == update_data['product_id']).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with id {update_data['product_id']} not found"
                )
            update_data['product_name'] = product.display_name or product.name
            
            # If universe_id not provided but product_id is, use product's universe
            if 'universe_id' not in update_data:
                universe = db.query(Universe).filter(Universe.id == product.universe_id).first()
                if universe:
                    update_data['universe_name'] = universe.name
        
        # Validate PMM in charge if provided
        if 'pmm_in_charge_id' in update_data and update_data['pmm_in_charge_id']:
            pmm_user = db.query(User).filter(
                User.id == update_data['pmm_in_charge_id'],
                User.role == 'pmm'
            ).first()
            if not pmm_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with id {update_data['pmm_in_charge_id']} is not a PMM"
                )
        
        # Remove IDs as they're not stored in Material model
        update_data.pop('universe_id', None)
        update_data.pop('category_id', None)
        update_data.pop('product_id', None)
        
        # Map frontend enum values to database enum names
        material_type_mapping = {
            'product_brief': 'PRODUCT_BRIEF',
            'sales_enablement_deck': 'PRODUCT_SALES_ENABLEMENT_DECK',
            'product_portfolio': 'PRODUCT_PORTFOLIO_PRESENTATION',
            'sales_deck': 'PRODUCT_SALES_DECK',
            'datasheet': 'PRODUCT_DATASHEET',
            'product_catalog': 'PRODUCT_CATALOG',
        }
        
        audience_mapping = {
            'internal': 'INTERNAL',
            'customer_facing': 'CUSTOMER_FACING',
            'shared_asset': 'BOTH',
        }
        
        status_mapping = {
            'draft': 'DRAFT',
            'review': 'REVIEW',
            'published': 'PUBLISHED',
            'archived': 'ARCHIVED',
        }
        
        # Convert enum values if present
        if 'material_type' in update_data and update_data['material_type']:
            update_data['material_type'] = material_type_mapping.get(
                update_data['material_type'], 
                update_data['material_type']
            )
        
        if 'audience' in update_data and update_data['audience']:
            update_data['audience'] = audience_mapping.get(
                update_data['audience'],
                update_data['audience']
            )
        
        if 'status' in update_data and update_data['status']:
            update_data['status'] = status_mapping.get(
                update_data['status'],
                update_data['status']
            )
        
        # Handle list fields - convert to JSON strings
        if 'tags' in update_data and update_data['tags'] is not None:
            update_data['tags'] = str(update_data['tags']) if isinstance(update_data['tags'], list) else update_data['tags']
        if 'keywords' in update_data and update_data['keywords'] is not None:
            update_data['keywords'] = str(update_data['keywords']) if isinstance(update_data['keywords'], list) else update_data['keywords']
        if 'use_cases' in update_data and update_data['use_cases'] is not None:
            update_data['use_cases'] = str(update_data['use_cases']) if isinstance(update_data['use_cases'], list) else update_data['use_cases']
        if 'pain_points' in update_data and update_data['pain_points'] is not None:
            update_data['pain_points'] = str(update_data['pain_points']) if isinstance(update_data['pain_points'], list) else update_data['pain_points']
        
        # Handle freshness_date - parse and set last_updated
        if 'freshness_date' in update_data and update_data['freshness_date']:
            try:
                # Parse YYYY-MM-DD format
                freshness_date = datetime.strptime(update_data['freshness_date'], "%Y-%m-%d")
                # Set time to end of day (23:59:59) to ensure it's treated as the full day
                freshness_date = freshness_date.replace(hour=23, minute=59, second=59)
                update_data['last_updated'] = freshness_date
            except ValueError:
                # If parsing fails, ignore freshness_date
                pass
            # Remove freshness_date from update_data as it's not a model field
            update_data.pop('freshness_date', None)
        
        for key, value in update_data.items():
            setattr(material, key, value)
        
        material.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(material)
        
        # Add PMM information to response
        material_dict = MaterialResponse.model_validate(material).model_dump()
        if material.pmm_in_charge_id:
            pmm_user = db.query(User).filter(User.id == material.pmm_in_charge_id).first()
            if pmm_user:
                material_dict['pmm_in_charge_name'] = pmm_user.full_name
                material_dict['pmm_in_charge_email'] = pmm_user.email
        
        return material_dict
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update material: {str(e)}"
        )

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    try:
        # Delete file if exists
        if material.file_path:
            from app.services.storage import storage_service
            try:
                storage_service.delete_file(material.file_path)
            except Exception:
                pass  # Continue even if file deletion fails
        
        db.delete(material)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete material: {str(e)}"
        )

@router.post("/upload", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_material_file(
    file: UploadFile = File(...),
    material_type: str = Form(...),
    audience: str = Form(...),
    universe_id: Optional[int] = Form(None),
    category_id: Optional[int] = Form(None),
    product_id: Optional[int] = Form(None),
    product_name: Optional[str] = Form(None),
    universe_name: Optional[str] = Form(None),
    other_type_description: Optional[str] = Form(None),
    freshness_date: Optional[str] = Form(None),
    pmm_in_charge_id: Optional[int] = Form(None),
    replace_existing: str = Form("false"),
    send_notification: Optional[str] = Form("false"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a new material file"""
    from app.services.storage import storage_service
    from app.models.product import Universe, Product
    
    # Handle optional universe/category/product (for track creation flow)
    universe = None
    category = None
    product = None
    final_universe_name = universe_name or "Uncategorized"
    final_product_name = product_name or "Uncategorized"
    
    if universe_id:
        universe = db.query(Universe).filter(Universe.id == universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {universe_id} not found"
            )
        final_universe_name = universe_name or universe.name
    
    if category_id:
        from app.models.product import Category
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {category_id} not found"
            )
        if universe_id and category.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {product_id} not found"
            )
        final_product_name = product_name or product.display_name or product.name
        
        # Validate product belongs to selected universe if universe_id is provided
        if universe_id and product.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
        
        # Validate product belongs to selected category if both are provided
        if category_id and product.category_id and product.category_id != category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size (60GB limit)
        from app.core.constants import MAX_FILE_SIZE
        if file_size > MAX_FILE_SIZE:
            max_size_gb = MAX_FILE_SIZE / (1024 * 1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {max_size_gb:.0f}GB"
            )
        
        # Validate file type
        allowed_extensions = ['.pdf', '.pptx', '.ppt', '.docx', '.doc']
        file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Map frontend values to database enum names
        material_type_mapping = {
            'product_brief': 'PRODUCT_BRIEF',
            'sales_enablement_deck': 'PRODUCT_SALES_ENABLEMENT_DECK',
            'product_portfolio': 'PRODUCT_PORTFOLIO_PRESENTATION',
            'sales_deck': 'PRODUCT_SALES_DECK',
            'datasheet': 'PRODUCT_DATASHEET',
            'product_catalog': 'PRODUCT_CATALOG',
            'other': 'other',  # Store as-is for "other" type
        }
        
        audience_mapping = {
            'internal': 'INTERNAL',
            'customer_facing': 'CUSTOMER_FACING',
            'shared_asset': 'BOTH',
        }
        
        db_material_type = material_type_mapping.get(material_type)
        db_audience = audience_mapping.get(audience)
        
        if not db_material_type or not db_audience:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid material_type or audience"
            )
        
        # Get other_type_description if material_type is "other"
        final_other_type_description = None
        if material_type == 'other':
            if not other_type_description:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="other_type_description is required when material_type is 'other'"
                )
            final_other_type_description = other_type_description
        
        # Check for existing materials
        # 1. Check for exact name match (BLOCK - exact duplicate)
        # 2. Check for same type (WARN - but allow multiple versions)
        import logging
        logger = logging.getLogger(__name__)
        
        # Check for exact name match (this should block)
        existing_by_name = _check_existing_material_by_name(db, final_product_name, file.filename)
        if existing_by_name:
            logger.info(f"[UPLOAD] Exact duplicate name found: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": f"A material with the name '{file.filename}' already exists for this product",
                    "blocking": True,
                    "existing_material": {
                        "id": existing_by_name.id,
                        "name": existing_by_name.name,
                        "material_type": existing_by_name.material_type,
                        "created_at": existing_by_name.created_at.isoformat() if existing_by_name.created_at else None,
                    }
                }
            )
        
        # Check for same type (warn but allow)
        existing_by_type = _check_existing_material_by_type(db, final_product_name, material_type)
        warning_message = None
        if existing_by_type:
            logger.info(f"[UPLOAD] Found {len(existing_by_type)} existing material(s) of type {material_type}")
            existing_names = [m.name for m in existing_by_type]
            warning_message = f"A {material_type} already exists for this product ({', '.join(existing_names)}). You can upload multiple versions as long as the filename is different."
        
        # Handle replace_existing flag (for backward compatibility)
        replace_existing_bool = replace_existing if isinstance(replace_existing, bool) else str(replace_existing).lower() in ("true", "1", "yes")
        if replace_existing_bool and existing_by_type:
            # Archive existing materials of the same type
            logger.info(f"[UPLOAD] Replacing existing material - archiving old ones")
            for existing in existing_by_type:
                logger.info(f"[UPLOAD] Archiving existing material: {existing.id}")
                existing.status = MaterialStatus.ARCHIVED
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            db.commit()  # Commit the archive before creating new material
            logger.info(f"[UPLOAD] Archived {len(existing_by_type)} existing material(s)")
        
        # Get folder path
        folder_path = storage_service.get_folder_path(
            material_type=material_type,
            audience=audience,
            product_name=final_product_name,
            universe_name=final_universe_name
        )
        
        # Save file
        relative_path = storage_service.save_file(
            file_content=file_content,
            file_name=file.filename,
            folder_path=folder_path
        )
        
        # Parse freshness_date if provided, otherwise use current date
        last_updated_date = datetime.utcnow()
        if freshness_date:
            try:
                # Parse YYYY-MM-DD format
                last_updated_date = datetime.strptime(freshness_date, "%Y-%m-%d")
                # Set time to end of day (23:59:59) to ensure it's treated as the full day
                last_updated_date = last_updated_date.replace(hour=23, minute=59, second=59)
            except ValueError:
                # If parsing fails, use current date
                pass
        
        # Determine PMM in charge: use provided pmm_in_charge_id, or if current user is PMM, use them; otherwise leave null
        final_pmm_in_charge_id = None
        if pmm_in_charge_id:
            # Validate that the user is a PMM
            pmm_user = db.query(User).filter(User.id == pmm_in_charge_id, User.role == 'pmm').first()
            if not pmm_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with id {pmm_in_charge_id} is not a PMM"
                )
            final_pmm_in_charge_id = pmm_in_charge_id
        elif current_user.role == "pmm":
            final_pmm_in_charge_id = current_user.id
        
        # Create material record (columns are String type, not enum, so no casting needed)
        material = Material(
            name=file.filename,
            material_type=db_material_type,
            other_type_description=final_other_type_description,
            audience=db_audience,
            product_name=final_product_name,
            universe_name=final_universe_name,
            file_path=relative_path,
            file_name=file.filename,
            file_format=file.filename.split('.')[-1] if '.' in file.filename else None,
            file_size=file_size,
            owner_id=current_user.id,
            pmm_in_charge_id=final_pmm_in_charge_id,
            status="DRAFT",
            last_updated=last_updated_date
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
        # Convert to response model to ensure proper serialization
        from app.schemas.material import MaterialResponse
        material_dict = MaterialResponse.model_validate(material).model_dump(mode='json')
        
        # Add PMM information if available
        if material.pmm_in_charge_id:
            pmm_user = db.query(User).filter(User.id == material.pmm_in_charge_id).first()
            if pmm_user:
                material_dict['pmm_in_charge_name'] = pmm_user.full_name
                material_dict['pmm_in_charge_email'] = pmm_user.email
        
        # Ensure datetime fields are ISO strings (model_dump(mode='json') should handle this, but double-check)
        for date_field in ['created_at', 'updated_at', 'last_updated']:
            if date_field in material_dict and material_dict[date_field]:
                if isinstance(material_dict[date_field], datetime):
                    material_dict[date_field] = material_dict[date_field].isoformat() + 'Z'
        
        # Add warning if applicable
        if warning_message:
            material_dict["warning"] = warning_message
            material_dict["existing_materials"] = [
                {
                    "id": m.id,
                    "name": m.name,
                    "material_type": m.material_type,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in existing_by_type
            ]
        
        # Create notification if requested (only PMM/Director can send)
        send_notification_bool = send_notification and str(send_notification).lower() in ("true", "1", "yes")
        if send_notification_bool and current_user.role in ['pmm', 'director', 'admin']:
            try:
                from app.models.notification import Notification, notification_recipients
                
                # Format material type for display
                material_type_display = material.material_type.replace('_', ' ').title()
                if material.other_type_description:
                    material_type_display = material.other_type_description
                
                notification = Notification(
                    title=f"New Material: {material.name}",
                    message=f"A new {material_type_display} has been uploaded for {material.product_name}.",
                    notification_type="material",
                    target_id=material.id,
                    link_path=f"/materials",
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
                # Log error but don't fail the upload
                import logging
                logging.error(f"Failed to create notification: {str(e)}")
                db.rollback()
        
        return material_dict
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error uploading file {file.filename if 'file' in locals() else 'unknown'}: {str(e)}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.get("/{material_id}/download")
async def download_material_file(
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download a material file and track usage"""
    from fastapi.responses import FileResponse
    from app.services.storage import storage_service
    from app.models.usage import MaterialUsage, UsageAction
    from pathlib import Path
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    if not material.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not available for this material"
        )
    
    # Track usage
    try:
        usage_event = MaterialUsage(
            material_id=material_id,
            user_id=current_user.id,
            action=UsageAction.DOWNLOAD.value,
            used_at=datetime.utcnow(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(usage_event)
        
        # Increment usage count
        material.usage_count = (material.usage_count or 0) + 1
        material.last_updated = datetime.utcnow()
        
        db.commit()
    except Exception as e:
        # Log error but don't fail the download
        import logging
        logging.error(f"Failed to track usage: {str(e)}")
        db.rollback()
    
    file_path = storage_service.get_file_path(material.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Determine media type based on file format
    file_format = material.file_format or (material.file_name.split('.')[-1] if '.' in material.file_name else '')
    media_type_map = {
        'pdf': 'application/pdf',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
    }
    media_type = media_type_map.get(file_format.lower(), 'application/octet-stream')
    
    # Use original file_name to preserve extension, or construct from name + format
    if material.file_name:
        filename = material.file_name
    elif material.file_format:
        # Construct filename with proper extension
        base_name = material.name.rsplit('.', 1)[0] if '.' in material.name else material.name
        filename = f"{base_name}.{material.file_format}"
    else:
        filename = material.name
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type
    )


@router.get("/{material_id}/executive-summary")
async def get_executive_summary(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get or generate executive summary for a material using OVHcloud AI"""
    import logging
    import sys
    logger = logging.getLogger(__name__)
    
    # Force immediate logging to stdout
    print(f"[STEP 1/4] Executive summary request received for material {material_id}", flush=True)
    logger.info(f"[STEP 1/4] Executive summary request received for material {material_id}")
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        print(f"[ERROR] Material {material_id} not found", flush=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Check if material has a file
    if not material.file_path:
        print(f"[ERROR] Material {material_id} has no file_path", flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material does not have an associated file"
        )
    
    # Check if summary already exists in database
    if material.executive_summary:
        print(f"[CACHE HIT] Returning cached executive summary for material {material_id}", flush=True)
        logger.info(f"[CACHE HIT] Returning cached executive summary for material {material_id}")
        return {
            "material_id": material_id,
            "summary": material.executive_summary,
            "generated_at": material.executive_summary_generated_at.isoformat() if material.executive_summary_generated_at else None,
            "cached": True
        }
    
    # Summary doesn't exist, generate it
    print(f"[CACHE MISS] No cached summary found. Generating new summary for material {material_id}", flush=True)
    logger.info(f"[CACHE MISS] No cached summary found. Generating new summary for material {material_id}")
    
    try:
        print(f"[STEP 2/4] Starting text extraction for material {material_id}", flush=True)
        logger.info(f"[STEP 2/4] Starting text extraction for material {material_id}")
        
        # Get file path
        file_path = storage_service.get_file_path(material.file_path)
        if not file_path.exists():
            print(f"[ERROR] File not found: {file_path}", flush=True)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on server"
            )
        
        print(f"[STEP 2/4] File found: {file_path}", flush=True)
        logger.info(f"[STEP 2/4] File found: {file_path}")
        
        # Extract text from file
        file_format = material.file_format or (material.file_name.split('.')[-1] if material.file_name else '')
        print(f"[STEP 2/4] Extracting text from {file_format} file...", flush=True)
        logger.info(f"[STEP 2/4] Extracting text from {file_format} file: {file_path}")
        document_text = await extract_text_from_file(file_path, file_format)
        
        if not document_text:
            print(f"[ERROR] Failed to extract text from material {material_id}", flush=True)
            logger.error(f"[ERROR] Failed to extract text from material {material_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from document. The file format may not be supported for text extraction."
            )
        
        print(f"[STEP 3/4] Extracted {len(document_text)} characters. Calling AI service...", flush=True)
        logger.info(f"[STEP 3/4] Extracted {len(document_text)} characters from document. Calling AI service...")
        
        # Generate executive summary using AI
        print(f"[STEP 3/4] Sending request to AI endpoint...", flush=True)
        logger.info(f"[STEP 3/4] Sending request to AI endpoint: {settings.OVH_AI_ENDPOINT_URL}")
        summary = await generate_executive_summary(document_text, material.name)
        
        if summary:
            print(f"[STEP 4/4] Successfully generated summary ({len(summary)} characters)", flush=True)
            logger.info(f"[STEP 4/4] Successfully generated summary for material {material_id} ({len(summary)} characters)")
        else:
            print(f"[ERROR] AI service returned no summary", flush=True)
            logger.warning(f"[ERROR] AI service returned no summary for material {material_id}")
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is not available or failed to generate summary. Please check AI configuration."
            )
        
        # Save summary to database
        print(f"[STEP 4/4] Saving summary to database for material {material_id}", flush=True)
        logger.info(f"[STEP 4/4] Saving summary to database for material {material_id}")
        material.executive_summary = summary
        material.executive_summary_generated_at = datetime.utcnow()
        db.commit()
        db.refresh(material)
        
        print(f"[SUCCESS] Summary saved and returned for material {material_id}", flush=True)
        logger.info(f"[SUCCESS] Summary saved and returned for material {material_id}")
        
        return {
            "material_id": material_id,
            "summary": summary,
            "generated_at": material.executive_summary_generated_at.isoformat(),
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Exception: {str(e)}", flush=True)
        logger.error(f"[ERROR] Exception generating executive summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate executive summary: {str(e)}"
        )


@router.post("/batch/upload", status_code=status.HTTP_200_OK)
async def batch_upload_materials(
    files: List[UploadFile] = File(...),
    suggestions_json: str = Form(...),
    auto_apply_threshold: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Batch upload multiple materials with their metadata.
    
    Accepts multiple files and a JSON string containing suggestions/metadata for each file.
    Processes each file individually and returns a summary of successes and failures.
    """
    import json
    
    try:
        # Parse suggestions JSON
        try:
            suggestions = json.loads(suggestions_json)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid suggestions_json format: {str(e)}"
            )
        
        # Validate that we have matching files and suggestions
        if len(files) != len(suggestions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mismatch: {len(files)} files but {len(suggestions)} suggestions"
            )
        
        results = {
            "success_count": 0,
            "failure_count": 0,
            "successes": [],
            "failures": []
        }
        
        # Process each file individually
        for i, (file, suggestion) in enumerate(zip(files, suggestions)):
            try:
                # Validate suggestion has required fields
                required_fields = ['universe_id', 'category_id', 'product_id', 'material_type', 'audience']
                missing_fields = [field for field in required_fields if suggestion.get(field) is None or suggestion.get(field) == '']
                
                if missing_fields:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Missing required fields: {', '.join(missing_fields)}"
                    })
                    continue
                
                # Create FormData-like structure for single file upload
                # We'll call the existing upload logic by creating a new request context
                # For now, let's replicate the upload logic here
                from app.models.product import Universe, Category, Product
                
                # Validate universe, category, product exist
                universe = db.query(Universe).filter(Universe.id == suggestion['universe_id']).first()
                if not universe:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Universe with id {suggestion['universe_id']} not found"
                    })
                    continue
                
                category = db.query(Category).filter(Category.id == suggestion['category_id']).first()
                if not category:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Category with id {suggestion['category_id']} not found"
                    })
                    continue
                
                product = db.query(Product).filter(Product.id == suggestion['product_id']).first()
                if not product:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Product with id {suggestion['product_id']} not found"
                    })
                    continue
                
                # Validate category belongs to universe
                if category.universe_id != universe.id:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Category {category.id} does not belong to universe {universe.id}"
                    })
                    continue
                
                # Validate product belongs to category
                if product.category_id != category.id:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Product {product.id} does not belong to category {category.id}"
                    })
                    continue
                
                # Read file content
                file_content = await file.read()
                file_size = len(file_content)
                
                # Validate file size (60GB limit)
                from app.core.constants import MAX_FILE_SIZE
                if file_size > MAX_FILE_SIZE:
                    max_size_gb = MAX_FILE_SIZE / (1024 * 1024 * 1024)
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"File size exceeds maximum allowed size of {max_size_gb:.0f}GB"
                    })
                    continue
                
                # Validate file type
                allowed_extensions = ['.pdf', '.pptx', '.ppt', '.docx', '.doc']
                file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
                if file_ext not in allowed_extensions:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
                    })
                    continue
                
                # Map frontend values to database enum names
                material_type_mapping = {
                    'product_brief': 'PRODUCT_BRIEF',
                    'sales_enablement_deck': 'PRODUCT_SALES_ENABLEMENT_DECK',
                    'product_portfolio': 'PRODUCT_PORTFOLIO_PRESENTATION',
                    'sales_deck': 'PRODUCT_SALES_DECK',
                    'datasheet': 'PRODUCT_DATASHEET',
                    'product_catalog': 'PRODUCT_CATALOG',
                    'other': 'other',
                }
                
                audience_mapping = {
                    'internal': 'INTERNAL',
                    'customer_facing': 'CUSTOMER_FACING',
                    'shared_asset': 'BOTH',
                }
                
                material_type = suggestion.get('material_type', 'product_brief')
                audience = suggestion.get('audience', 'internal')
                
                db_material_type = material_type_mapping.get(material_type)
                db_audience = audience_mapping.get(audience)
                
                if not db_material_type or not db_audience:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"Invalid material_type '{material_type}' or audience '{audience}'"
                    })
                    continue
                
                # Get other_type_description if material_type is "other"
                final_other_type_description = None
                if material_type == 'other':
                    final_other_type_description = suggestion.get('other_type_description')
                    if not final_other_type_description:
                        results["failure_count"] += 1
                        results["failures"].append({
                            "filename": file.filename,
                            "error": "other_type_description is required when material_type is 'other'"
                        })
                        continue
                
                # Get product and universe names
                final_product_name = suggestion.get('product_name') or product.display_name or product.name
                final_universe_name = suggestion.get('universe_name') or universe.name or universe.display_name
                
                # Check for existing materials
                existing_by_name = _check_existing_material_by_name(db, final_product_name, file.filename)
                if existing_by_name:
                    results["failure_count"] += 1
                    results["failures"].append({
                        "filename": file.filename,
                        "error": f"A material with the name '{file.filename}' already exists for this product",
                        "blocking": True,
                        "existing_material_id": existing_by_name.id
                    })
                    continue
                
                # Get folder path
                folder_path = storage_service.get_folder_path(
                    material_type=material_type,
                    audience=audience,
                    product_name=final_product_name,
                    universe_name=final_universe_name
                )
                
                # Save file
                relative_path = storage_service.save_file(
                    file_content=file_content,
                    file_name=file.filename,
                    folder_path=folder_path
                )
                
                # Parse freshness_date if provided
                freshness_date = suggestion.get('freshness_date')
                last_updated_date = datetime.utcnow()
                if freshness_date:
                    try:
                        last_updated_date = datetime.strptime(freshness_date, "%Y-%m-%d")
                        last_updated_date = last_updated_date.replace(hour=23, minute=59, second=59)
                    except ValueError:
                        pass
                
                # Determine PMM in charge: use provided pmm_in_charge_id, or if current user is PMM, use them; otherwise leave null
                final_pmm_in_charge_id = None
                pmm_in_charge_id_from_suggestion = suggestion.get('pmm_in_charge_id')
                if pmm_in_charge_id_from_suggestion:
                    # Validate that the user is a PMM
                    pmm_user = db.query(User).filter(User.id == pmm_in_charge_id_from_suggestion, User.role == 'pmm').first()
                    if pmm_user:
                        final_pmm_in_charge_id = pmm_in_charge_id_from_suggestion
                elif current_user.role == "pmm":
                    final_pmm_in_charge_id = current_user.id
                
                # Create material record
                material = Material(
                    name=file.filename,
                    material_type=db_material_type,
                    other_type_description=final_other_type_description,
                    audience=db_audience,
                    product_name=final_product_name,
                    universe_name=final_universe_name,
                    file_path=relative_path,
                    file_name=file.filename,
                    file_format=file.filename.split('.')[-1] if '.' in file.filename else None,
                    file_size=file_size,
                    owner_id=current_user.id,
                    pmm_in_charge_id=final_pmm_in_charge_id,
                    status="DRAFT",
                    last_updated=last_updated_date
                )
                db.add(material)
                db.commit()
                db.refresh(material)
                
                results["success_count"] += 1
                results["successes"].append({
                    "filename": file.filename,
                    "material_id": material.id,
                    "material_name": material.name
                })
                
            except HTTPException:
                # Re-raise HTTP exceptions
                raise
            except HTTPException as he:
                # Re-raise HTTP exceptions to be handled by outer try/except
                db.rollback()
                logger.error(f"HTTPException uploading file {file.filename}: {he.detail}")
                results["failure_count"] += 1
                error_detail = he.detail
                if isinstance(error_detail, dict):
                    error_detail = error_detail.get('message', str(error_detail))
                results["failures"].append({
                    "filename": file.filename,
                    "error": str(error_detail)
                })
            except Exception as e:
                db.rollback()
                logger.error(f"Error uploading file {file.filename}: {str(e)}", exc_info=True)
                results["failure_count"] += 1
                results["failures"].append({
                    "filename": file.filename,
                    "error": f"Failed to upload: {str(e)}"
                })
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch upload: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process batch upload: {str(e)}"
        )
