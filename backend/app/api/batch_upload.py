"""
Batch material upload API endpoints with AI suggestions
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.schemas.material import MaterialResponse
from app.services.ai_suggestion import ai_suggestion_service
from app.services.storage import storage_service
from app.models.product import Universe, Category, Product
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/materials/batch", tags=["materials"])


class FileSuggestion(BaseModel):
    """AI suggestion for a file"""
    filename: str
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    universe_name: Optional[str] = None
    category_name: Optional[str] = None
    product_name: Optional[str] = None
    confidence: float = 0.0
    reasoning: str = ""
    material_type: Optional[str] = None
    audience: Optional[str] = None


class BatchUploadRequest(BaseModel):
    """Request for batch upload with suggestions"""
    files: List[FileSuggestion]
    auto_apply_threshold: float = 0.9


class BatchUploadResponse(BaseModel):
    """Response from batch upload"""
    success_count: int
    failure_count: int
    results: List[dict]


@router.post("/analyze", response_model=List[FileSuggestion])
async def analyze_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze multiple files and return AI suggestions for product hierarchy
    Available only for Director and PMM roles
    """
    # Check role
    if current_user.role not in ['director', 'pmm'] and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Batch upload is only available for Directors and PMMs"
        )
    
    suggestions = []
    
    for file in files:
        try:
            # Read file content
            file_content = await file.read()
            
            # Get AI suggestions
            suggestion_data = await ai_suggestion_service.suggest_product_hierarchy(
                file_content=file_content,
                filename=file.filename,
                user_id=current_user.id
            )
            
            # Try to infer material type and audience from filename/content
            material_type, audience = _infer_material_type(file.filename, suggestion_data.get("reasoning", ""))
            
            suggestions.append(FileSuggestion(
                filename=file.filename,
                universe_id=suggestion_data.get("universe_id"),
                category_id=suggestion_data.get("category_id"),
                product_id=suggestion_data.get("product_id"),
                universe_name=suggestion_data.get("universe_name"),
                category_name=suggestion_data.get("category_name"),
                product_name=suggestion_data.get("product_name"),
                confidence=suggestion_data.get("confidence", 0.0),
                reasoning=suggestion_data.get("reasoning", ""),
                material_type=material_type,
                audience=audience
            ))
        except Exception as e:
            # Add error suggestion
            suggestions.append(FileSuggestion(
                filename=file.filename,
                reasoning=f"Error analyzing file: {str(e)}",
                confidence=0.0
            ))
    
    return suggestions


@router.post("/upload", response_model=BatchUploadResponse)
async def batch_upload_files(
    files: List[UploadFile] = File(...),
    suggestions_json: str = Form(...),  # JSON string of FileSuggestion list
    auto_apply_threshold: float = Form(0.9),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload multiple files with AI suggestions
    Files with confidence >= auto_apply_threshold are automatically applied
    Available only for Director and PMM roles
    """
    import json
    
    # Check role
    if current_user.role not in ['director', 'pmm'] and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Batch upload is only available for Directors and PMMs"
        )
    
    # Parse suggestions
    try:
        suggestions_data = json.loads(suggestions_json)
        suggestions = {s["filename"]: s for s in suggestions_data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid suggestions format: {str(e)}"
        )
    
    results = []
    success_count = 0
    failure_count = 0
    
    for file in files:
        file_result = {
            "filename": file.filename,
            "success": False,
            "error": None,
            "material_id": None
        }
        
        try:
            suggestion = suggestions.get(file.filename, {})
            
            # Validate required fields
            universe_id = suggestion.get("universe_id")
            category_id = suggestion.get("category_id")
            product_id = suggestion.get("product_id")
            material_type = suggestion.get("material_type", "product_brief")
            audience = suggestion.get("audience", "internal")
            confidence = suggestion.get("confidence", 0.0)
            
            # Check if required fields are present
            if not universe_id or not category_id or not product_id:
                file_result["error"] = "Missing required hierarchy information"
                results.append(file_result)
                failure_count += 1
                continue
            
            # Validate hierarchy exists
            universe = db.query(Universe).filter(Universe.id == universe_id).first()
            category = db.query(Category).filter(Category.id == category_id).first()
            product = db.query(Product).filter(Product.id == product_id).first()
            
            if not universe or not category or not product:
                file_result["error"] = "Invalid hierarchy IDs"
                results.append(file_result)
                failure_count += 1
                continue
            
            # Validate relationships
            if category.universe_id != universe_id:
                file_result["error"] = "Category does not belong to universe"
                results.append(file_result)
                failure_count += 1
                continue
            
            if product.universe_id != universe_id:
                file_result["error"] = "Product does not belong to universe"
                results.append(file_result)
                failure_count += 1
                continue
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Validate file size (50MB limit)
            max_size = 50 * 1024 * 1024
            if file_size > max_size:
                file_result["error"] = f"File size exceeds {max_size / 1024 / 1024}MB limit"
                results.append(file_result)
                failure_count += 1
                continue
            
            # Validate file type
            allowed_extensions = ['.pdf', '.pptx', '.ppt', '.docx', '.doc']
            file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            if file_ext not in allowed_extensions:
                file_result["error"] = f"File type {file_ext} not allowed"
                results.append(file_result)
                failure_count += 1
                continue
            
            # Map material type and audience
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
            
            db_material_type = material_type_mapping.get(material_type, 'PRODUCT_BRIEF')
            db_audience = audience_mapping.get(audience, 'INTERNAL')
            
            # Get folder path and save file
            folder_path = storage_service.get_folder_path(
                material_type=material_type,
                audience=audience,
                product_name=product.display_name or product.name,
                universe_name=universe.name
            )
            
            relative_path = storage_service.save_file(
                file_content=file_content,
                file_name=file.filename,
                folder_path=folder_path
            )
            
            # Create material record
            material = Material(
                name=file.filename,
                material_type=db_material_type,
                audience=db_audience,
                product_name=product.display_name or product.name,
                universe_name=universe.name,
                file_path=relative_path,
                file_name=file.filename,
                file_format=file.filename.split('.')[-1] if '.' in file.filename else None,
                file_size=file_size,
                owner_id=current_user.id,
                status="DRAFT"
            )
            
            db.add(material)
            
            # Track AI correction if user modified the suggestion
            ai_universe_id = suggestion.get("universe_id")
            ai_category_id = suggestion.get("category_id")
            ai_product_id = suggestion.get("product_id")
            
            # Check if user corrected the AI suggestion
            if (ai_universe_id != universe_id or 
                ai_category_id != category_id or 
                ai_product_id != product_id):
                try:
                    from app.models.ai_correction import AICorrection
                    import hashlib
                    
                    # Calculate file hash for deduplication
                    file_hash = hashlib.sha256(file_content).hexdigest()
                    
                    correction = AICorrection(
                        filename=file.filename,
                        file_hash=file_hash,
                        ai_universe_id=ai_universe_id,
                        ai_category_id=ai_category_id,
                        ai_product_id=ai_product_id,
                        ai_confidence=suggestion.get("confidence", 0.0),
                        ai_reasoning=suggestion.get("reasoning", ""),
                        corrected_universe_id=universe_id,
                        corrected_category_id=category_id,
                        corrected_product_id=product_id,
                        user_id=current_user.id
                    )
                    db.add(correction)
                except Exception as e:
                    # Don't fail upload if correction tracking fails
                    import logging
                    logging.error(f"Failed to track AI correction: {str(e)}")
            
            db.commit()
            db.refresh(material)
            
            file_result["success"] = True
            file_result["material_id"] = material.id
            success_count += 1
            
        except Exception as e:
            db.rollback()
            file_result["error"] = str(e)
            failure_count += 1
        
        results.append(file_result)
    
    return BatchUploadResponse(
        success_count=success_count,
        failure_count=failure_count,
        results=results
    )


def _infer_material_type(filename: str, reasoning: str = "") -> tuple:
    """Infer material type and audience from filename and reasoning"""
    filename_lower = filename.lower()
    reasoning_lower = reasoning.lower()
    combined = filename_lower + " " + reasoning_lower
    
    # Material type inference
    material_type = "product_brief"  # default
    
    if any(kw in combined for kw in ["datasheet", "data sheet", "spec"]):
        material_type = "datasheet"
    elif any(kw in combined for kw in ["sales deck", "salesdeck", "pitch"]):
        material_type = "sales_deck"
    elif any(kw in combined for kw in ["enablement", "enablement deck"]):
        material_type = "sales_enablement_deck"
    elif any(kw in combined for kw in ["portfolio", "overview"]):
        material_type = "product_portfolio"
    elif any(kw in combined for kw in ["catalog", "catalogue"]):
        material_type = "product_catalog"
    
    # Audience inference
    audience = "internal"  # default
    
    if any(kw in combined for kw in ["customer", "client", "external", "public"]):
        audience = "customer_facing"
    elif any(kw in combined for kw in ["shared", "both", "all"]):
        audience = "shared_asset"
    
    return material_type, audience
