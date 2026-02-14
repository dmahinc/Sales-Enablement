"""
Shared Links API endpoints - Public and authenticated endpoints for sharing materials
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.material import Material
from app.models.shared_link import SharedLink
from app.models.usage import MaterialUsage, UsageAction
from app.schemas.shared_link import (
    SharedLinkCreate, SharedLinkResponse, SharedLinkPublicResponse, SharedLinkUpdate
)
from app.services.storage import storage_service

router = APIRouter(prefix="/api/shared-links", tags=["shared-links"])


def generate_unique_token() -> str:
    """Generate a unique token for shared links"""
    return secrets.token_urlsafe(48)  # 64 characters when base64 encoded


@router.post("", response_model=SharedLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_shared_link(
    link_data: SharedLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new shared link for a material (requires authentication)"""
    # Verify material exists and is published
    material = db.query(Material).filter(Material.id == link_data.material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    if material.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published materials can be shared"
        )
    
    # Generate unique token
    token = generate_unique_token()
    # Ensure token is unique (very unlikely collision, but check anyway)
    while db.query(SharedLink).filter(SharedLink.unique_token == token).first():
        token = generate_unique_token()
    
    # Calculate expiration date
    expires_at = datetime.utcnow() + timedelta(days=link_data.expires_in_days)
    
    # Create shared link
    shared_link = SharedLink(
        unique_token=token,
        material_id=link_data.material_id,
        shared_by_user_id=current_user.id,
        customer_email=link_data.customer_email,
        customer_name=link_data.customer_name,
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(shared_link)
    db.commit()
    db.refresh(shared_link)
    
    # Build share URL
    base_url = str(request.base_url).rstrip('/')
    share_url = f"{base_url}/share/{token}"
    
    # Return response with share URL
    return {
        "id": shared_link.id,
        "unique_token": shared_link.unique_token,
        "material_id": shared_link.material_id,
        "material_name": material.name,
        "shared_by_user_id": shared_link.shared_by_user_id,
        "shared_by_user_name": current_user.full_name or current_user.email,
        "customer_email": shared_link.customer_email,
        "customer_name": shared_link.customer_name,
        "expires_at": shared_link.expires_at,
        "is_active": shared_link.is_active,
        "access_count": shared_link.access_count,
        "last_accessed_at": shared_link.last_accessed_at,
        "created_at": shared_link.created_at,
        "share_url": share_url
    }


@router.get("/token/{token}", response_model=SharedLinkPublicResponse)
async def get_shared_link_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get shared link information by token (PUBLIC - no authentication required)
    This is the endpoint that validates shared links for external customers
    """
    shared_link = db.query(SharedLink).filter(SharedLink.unique_token == token).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found. This shared link is invalid, expired, or has been deactivated."
        )
    
    # Check if link is valid (active and not expired)
    if not shared_link.is_valid():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found. This shared link is invalid, expired, or has been deactivated."
        )
    
    # Get material
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Update access tracking
    shared_link.access_count += 1
    shared_link.last_accessed_at = datetime.utcnow()
    db.commit()
    
    return {
        "material_id": material.id,
        "material_name": material.name,
        "material_type": material.material_type,
        "material_description": material.description,
        "file_name": material.file_name,
        "file_format": material.file_format,
        "file_size": material.file_size,
        "expires_at": shared_link.expires_at,
        "is_valid": True
    }


@router.get("/token/{token}/download")
async def download_shared_material(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Download material file via shared link (PUBLIC - no authentication required)
    """
    shared_link = db.query(SharedLink).filter(SharedLink.unique_token == token).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found. This shared link is invalid, expired, or has been deactivated."
        )
    
    # Check if link is valid
    if not shared_link.is_valid():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found. This shared link is invalid, expired, or has been deactivated."
        )
    
    # Get material
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
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
    
    # Update access tracking
    shared_link.access_count += 1
    shared_link.last_accessed_at = datetime.utcnow()
    
    # Track download usage (if we have user info, otherwise track anonymously)
    try:
        usage_event = MaterialUsage(
            material_id=material.id,
            user_id=shared_link.shared_by_user_id or 0,  # Use 0 for anonymous
            action=UsageAction.DOWNLOAD.value,
            used_at=datetime.utcnow(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(usage_event)
        
        # Increment usage count
        material.usage_count = (material.usage_count or 0) + 1
        material.last_updated = datetime.utcnow()
    except Exception as e:
        # Log error but don't fail the download
        import logging
        logging.error(f"Failed to track usage: {str(e)}")
    
    db.commit()
    
    # Get file path and serve
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
    
    return FileResponse(
        path=str(file_path),
        filename=material.file_name,
        media_type=media_type
    )


@router.get("", response_model=List[SharedLinkResponse])
async def list_shared_links(
    material_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List shared links (requires authentication - only shows links created by current user)"""
    query = db.query(SharedLink).filter(SharedLink.shared_by_user_id == current_user.id)
    
    if material_id:
        query = query.filter(SharedLink.material_id == material_id)
    
    shared_links = query.order_by(SharedLink.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for link in shared_links:
        material = db.query(Material).filter(Material.id == link.material_id).first()
        result.append({
            "id": link.id,
            "unique_token": link.unique_token,
            "material_id": link.material_id,
            "material_name": material.name if material else "Unknown",
            "shared_by_user_id": link.shared_by_user_id,
            "shared_by_user_name": link.shared_by_user.full_name if link.shared_by_user else None,
            "customer_email": link.customer_email,
            "customer_name": link.customer_name,
            "expires_at": link.expires_at,
            "is_active": link.is_active,
            "access_count": link.access_count,
            "last_accessed_at": link.last_accessed_at,
            "created_at": link.created_at,
            "share_url": None  # Will be set by frontend
        })
    
    return result


@router.put("/{link_id}", response_model=SharedLinkResponse)
async def update_shared_link(
    link_id: int,
    link_data: SharedLinkUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a shared link (requires authentication - only creator can update)"""
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Only creator can update
    if shared_link.shared_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own shared links"
        )
    
    # Update fields
    if link_data.is_active is not None:
        shared_link.is_active = link_data.is_active
    if link_data.customer_email is not None:
        shared_link.customer_email = link_data.customer_email
    if link_data.customer_name is not None:
        shared_link.customer_name = link_data.customer_name
    
    db.commit()
    db.refresh(shared_link)
    
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    base_url = str(request.base_url).rstrip('/')
    share_url = f"{base_url}/share/{shared_link.unique_token}"
    
    return {
        "id": shared_link.id,
        "unique_token": shared_link.unique_token,
        "material_id": shared_link.material_id,
        "material_name": material.name if material else "Unknown",
        "shared_by_user_id": shared_link.shared_by_user_id,
        "shared_by_user_name": shared_link.shared_by_user.full_name if shared_link.shared_by_user else None,
        "customer_email": shared_link.customer_email,
        "customer_name": shared_link.customer_name,
        "expires_at": shared_link.expires_at,
        "is_active": shared_link.is_active,
        "access_count": shared_link.access_count,
        "last_accessed_at": shared_link.last_accessed_at,
        "created_at": shared_link.created_at,
        "share_url": share_url
    }


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shared_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete (deactivate) a shared link (requires authentication - only creator can delete)"""
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Only creator can delete
    if shared_link.shared_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own shared links"
        )
    
    # Deactivate instead of deleting (preserve history)
    shared_link.is_active = False
    db.commit()
    
    return None
