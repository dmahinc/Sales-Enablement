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

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material_data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new material (metadata only, file upload separate)"""
    try:
        # Convert lists to JSON strings for storage
        material_dict = material_data.dict()
        material_dict['tags'] = str(material_dict.get('tags', [])) if material_dict.get('tags') else None
        material_dict['keywords'] = str(material_dict.get('keywords', [])) if material_dict.get('keywords') else None
        material_dict['use_cases'] = str(material_dict.get('use_cases', [])) if material_dict.get('use_cases') else None
        material_dict['pain_points'] = str(material_dict.get('pain_points', [])) if material_dict.get('pain_points') else None
        material_dict['owner_id'] = current_user.id
        
        material = Material(**material_dict)
        db.add(material)
        db.commit()
        db.refresh(material)
        return material
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
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    try:
        # Update only provided fields
        update_data = material_data.dict(exclude_unset=True)
        
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
    product_name: Optional[str] = Form(None),
    universe_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a new material file"""
    from app.services.storage import storage_service
    
    # Validate required fields using Pydantic
    from app.schemas.material import MaterialUpload
    try:
        upload_data = MaterialUpload(
            material_type=material_type,
            audience=audience,
            universe_name=universe_name,
            product_name=product_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    
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
        
        # Get folder path
        folder_path = storage_service.get_folder_path(
            material_type=material_type,
            audience=audience,
            product_name=product_name,
            universe_name=universe_name
        )
        
        # Save file
        relative_path = storage_service.save_file(
            file_content=file_content,
            file_name=file.filename,
            folder_path=folder_path
        )
        
        # Create material record using raw SQL for enum casting
        from sqlalchemy import text
        
        result = db.execute(
            text("""
                INSERT INTO materials 
                (name, material_type, audience, product_name, universe_name, file_path, file_name, file_format, file_size, owner_id, status, created_at, updated_at)
                VALUES 
                (:name, CAST(:material_type AS materialtype), CAST(:audience AS materialaudience), :product_name, :universe_name, :file_path, :file_name, :file_format, :file_size, :owner_id, CAST(:status AS materialstatus), NOW(), NOW())
                RETURNING id
            """),
            {
                "name": file.filename,
                "material_type": db_material_type,
                "audience": db_audience,
                "product_name": product_name,
                "universe_name": universe_name,
                "file_path": relative_path,
                "file_name": file.filename,
                "file_format": file.filename.split('.')[-1] if '.' in file.filename else None,
                "file_size": file_size,
                "owner_id": current_user.id,
                "status": "DRAFT"
            }
        )
        material_id = result.scalar()
        db.commit()
        
        # Fetch the created material
        material = db.query(Material).filter(Material.id == material_id).first()
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
    
    return FileResponse(
        path=str(file_path),
        filename=material.file_name or material.name,
        media_type='application/octet-stream'
    )
