"""
Materials API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.material import Material, MaterialType, MaterialAudience, MaterialStatus
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/api/materials", tags=["materials"])

@router.get("")
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

@router.get("/{material_id}")
async def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.post("")
async def create_material(
    material_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new material (metadata only, file upload separate)"""
    material = Material(**material_data)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.put("/{material_id}")
async def update_material(
    material_id: int,
    material_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    for key, value in material_data.items():
        setattr(material, key, value)
    
    db.commit()
    db.refresh(material)
    return material

@router.delete("/{material_id}")
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a material"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}

@router.post("/upload")
async def upload_material_file(
    file: UploadFile = File(...),
    material_type: Optional[str] = Form(None),
    audience: Optional[str] = Form(None),
    product_name: Optional[str] = Form(None),
    universe_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a new material file"""
    from app.services.storage import storage_service
    
    # Validate required fields
    if not material_type:
        raise HTTPException(status_code=400, detail="material_type is required")
    if not audience:
        raise HTTPException(status_code=400, detail="audience is required")
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size (50MB limit)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"File size exceeds maximum allowed size of 50MB")
        
        # Validate enum values and map to database enum names
        from app.models.material import MaterialType, MaterialAudience
        
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
            'shared_asset': 'BOTH',  # Assuming shared_asset maps to BOTH
        }
        
        # Validate input values
        try:
            material_type_enum = MaterialType(material_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid material_type: {material_type}. Must be one of: {[e.value for e in MaterialType]}")
        
        try:
            audience_enum = MaterialAudience(audience)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid audience: {audience}. Must be one of: {[e.value for e in MaterialAudience]}")
        
        # Get database enum names
        db_material_type = material_type_mapping.get(material_type)
        db_audience = audience_mapping.get(audience)
        
        if not db_material_type:
            raise HTTPException(status_code=400, detail=f"Unsupported material_type: {material_type}")
        if not db_audience:
            raise HTTPException(status_code=400, detail=f"Unsupported audience: {audience}")
        
        # Get folder path (use original values for folder structure)
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
        
        # Create material record - use database enum names
        # Insert using raw SQL to properly cast enum values
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
        import traceback
        error_detail = str(e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {error_detail}")

@router.post("/{material_id}/upload")
async def upload_material_file_update(
    material_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update file for existing material"""
    from app.services.storage import storage_service
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Delete old file if exists
    if material.file_path and storage_service.file_exists(material.file_path):
        storage_service.delete_file(material.file_path)
    
    # Get folder path
    folder_path = storage_service.get_folder_path(
        material_type=material.material_type,
        audience=material.audience,
        product_name=material.product_name,
        universe_name=material.universe_name
    )
    
    # Read and save new file
    file_content = await file.read()
    relative_path = storage_service.save_file(
        file_content=file_content,
        file_name=file.filename,
        folder_path=folder_path
    )
    
    # Update material
    material.file_path = relative_path
    material.file_name = file.filename
    material.file_format = file.filename.split('.')[-1] if '.' in file.filename else None
    material.file_size = len(file_content)
    
    db.commit()
    db.refresh(material)
    
    return material

@router.get("/{material_id}/download")
async def download_material_file(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download a material file"""
    from fastapi.responses import FileResponse
    from app.services.storage import storage_service
    
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    file_path = storage_service.get_file_path(material.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=material.file_name,
        media_type='application/octet-stream'
    )

@router.get("/{material_id}/health")
async def get_material_health(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get material health metrics"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {
        "material_id": material.id,
        "health_score": material.health_score,
        "freshness": material.last_updated,
        "completeness": material.completeness_score,
        "usage": material.usage_count
    }
