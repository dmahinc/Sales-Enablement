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

router = APIRouter(prefix="/api/materials", tags=["materials"])

def _check_existing_material(
    db: Session,
    product_name: str,
    material_type: str,
    exclude_material_id: Optional[int] = None
) -> Optional[Material]:
    """
    Check if a material of the same type already exists for the given product.
    Excludes 'other' type from duplicate checking.
    Returns the existing material if found, None otherwise.
    """
    # Don't check for duplicates if material_type is 'other'
    if material_type.lower() == 'other' or material_type.upper() == 'OTHER':
        return None
    
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
    
    # Query for existing materials with same product_name and material_type
    query = db.query(Material).filter(
        Material.product_name.ilike(f"%{product_name}%"),
        Material.status != "ARCHIVED"  # Don't consider archived materials
    )
    
    if exclude_material_id:
        query = query.filter(Material.id != exclude_material_id)
    
    existing_materials = query.all()
    
    # Check each existing material to see if it matches the type
    for existing in existing_materials:
        if not existing.material_type:
            continue
        
        # Normalize existing material type
        existing_type_normalized = existing.material_type.lower()
        if existing.material_type.upper() in db_to_frontend_mapping:
            existing_type_normalized = db_to_frontend_mapping[existing.material_type.upper()].lower()
        
        # If types match, return the existing material
        if existing_type_normalized == normalized_type:
            return existing
    
    return None

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
    return materials

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
    return material

@router.get("/check-duplicate")
async def check_duplicate_material(
    product_name: str,
    material_type: str,
    material_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if a material of the same type already exists for the given product.
    Returns information about existing material if found.
    """
    existing = _check_existing_material(db, product_name, material_type, material_id)
    
    if existing:
        return {
            "exists": True,
            "material": {
                "id": existing.id,
                "name": existing.name,
                "material_type": existing.material_type,
                "created_at": existing.created_at.isoformat() if existing.created_at else None,
                "updated_at": existing.updated_at.isoformat() if existing.updated_at else None,
            }
        }
    return {"exists": False}

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material_data: MaterialCreate,
    replace_existing: str = "false",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new material (metadata only, file upload separate)"""
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
        
        # Set names from product/universe if not provided
        final_product_name = material_dict.get('product_name') or (product.display_name or product.name)
        final_universe_name = material_dict.get('universe_name') or universe.name
        material_dict['product_name'] = final_product_name
        material_dict['universe_name'] = final_universe_name
        
        # Check for existing material of the same type (unless replacing)
        # Handle both bool and string "true"/"false" for replace_existing
        replace_existing_bool = replace_existing if isinstance(replace_existing, bool) else replace_existing.lower() == "true"
        if not replace_existing_bool:
            existing = _check_existing_material(db, final_product_name, material_dict.get('material_type'))
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"A {material_dict.get('material_type', 'material')} already exists for this product",
                        "existing_material": {
                            "id": existing.id,
                            "name": existing.name,
                            "material_type": existing.material_type,
                            "created_at": existing.created_at.isoformat() if existing.created_at else None,
                        }
                    }
                )
        else:
            # Archive existing materials of the same type
            existing = _check_existing_material(db, final_product_name, material_dict.get('material_type'))
            if existing:
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
        
        for key, value in update_data.items():
            setattr(material, key, value)
        
        material.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(material)
        return material
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
    replace_existing: str = Form("false"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a new material file"""
    from app.services.storage import storage_service
    from app.models.product import Universe, Product
    
    # Validate required fields
    if not universe_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="universe_id is required"
        )
    if not category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="category_id is required"
        )
    if not product_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_id is required"
        )
    
    # Look up universe and product
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {universe_id} not found"
        )
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with id {product_id} not found"
        )
    
    # Validate category belongs to universe
    from app.models.product import Category
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with id {category_id} not found"
        )
    if category.universe_id != universe_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category does not belong to selected universe"
        )
    
    # Ensure product belongs to selected universe
    if product.universe_id != universe_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product does not belong to selected universe"
        )
    
    # Ensure product belongs to selected category (if product has a category)
    if product.category_id and product.category_id != category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product does not belong to selected category"
        )
    
    # Use names from database if not provided
    final_universe_name = universe_name or universe.name
    final_product_name = product_name or product.display_name or product.name
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size (50MB limit)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum allowed size of 50MB"
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
        
        # Check for existing material of the same type (unless replacing)
        # Handle both bool and string "true"/"false" for replace_existing
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[UPLOAD] replace_existing parameter received: {replace_existing} (type: {type(replace_existing)})")
        replace_existing_bool = replace_existing if isinstance(replace_existing, bool) else str(replace_existing).lower() in ("true", "1", "yes")
        logger.info(f"[UPLOAD] replace_existing_bool: {replace_existing_bool}")
        if not replace_existing_bool:
            existing = _check_existing_material(db, final_product_name, material_type)
            if existing:
                logger.info(f"[UPLOAD] Duplicate found, returning 409")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"A {material_type} already exists for this product",
                        "existing_material": {
                            "id": existing.id,
                            "name": existing.name,
                            "material_type": existing.material_type,
                            "created_at": existing.created_at.isoformat() if existing.created_at else None,
                        }
                    }
                )
        else:
            # Archive existing materials of the same type
            logger.info(f"[UPLOAD] Replacing existing material - archiving old one")
            existing = _check_existing_material(db, final_product_name, material_type)
            if existing:
                logger.info(f"[UPLOAD] Found existing material to archive: {existing.id}")
                existing.status = MaterialStatus.ARCHIVED
                existing.updated_at = datetime.utcnow()
                db.add(existing)
                db.commit()  # Commit the archive before creating new material
                logger.info(f"[UPLOAD] Archived existing material: {existing.id}")
        
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
            status="DRAFT"
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        return material
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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
