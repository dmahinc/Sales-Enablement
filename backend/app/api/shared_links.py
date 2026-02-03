"""
Shared Links API endpoints - Document sharing with customers
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.material import Material
from app.models.shared_link import SharedLink
from app.schemas.shared_link import (
    SharedLinkCreate, SharedLinkResponse, SharedLinkUpdate,
    SharedLinkStats, MaterialShareStats, CustomerShareStats
)
from app.services.storage import storage_service
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shared-links", tags=["shared-links"])


def get_share_url(token: str) -> str:
    """Generate the full URL for accessing a shared link"""
    platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
    return f"{platform_url}/share/{token}"


@router.post("", response_model=SharedLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_shared_link(
    link_data: SharedLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new shareable link for a document"""
    # Verify material exists and is published
    material = db.query(Material).filter(Material.id == link_data.material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Only allow sharing published materials
    if material.status.value != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published materials can be shared"
        )
    
    # Generate unique token
    token = SharedLink.generate_token()
    
    # Ensure token is unique
    while db.query(SharedLink).filter(SharedLink.unique_token == token).first():
        token = SharedLink.generate_token()
    
    # Calculate expiration
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
    
    # Build response with share URL and material name
    response_dict = {
        **{c.name: getattr(shared_link, c.name) for c in shared_link.__table__.columns},
        'share_url': get_share_url(token),
        'material_name': material.name
    }
    response_data = SharedLinkResponse(**response_dict)
    
    return response_data


@router.get("", response_model=List[SharedLinkResponse])
async def list_shared_links(
    material_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List shared links with optional filters"""
    query = db.query(SharedLink)
    
    if material_id:
        query = query.filter(SharedLink.material_id == material_id)
    
    if customer_email:
        query = query.filter(SharedLink.customer_email == customer_email)
    
    # Users can only see their own shares unless admin
    if current_user.role != "admin" and not current_user.is_superuser:
        query = query.filter(SharedLink.shared_by_user_id == current_user.id)
    
    shared_links = query.order_by(SharedLink.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add share URLs and material names
    result = []
    for link in shared_links:
        # Get material name
        material = db.query(Material).filter(Material.id == link.material_id).first()
        material_name = material.name if material else None
        
        link_dict = {
            **{c.name: getattr(link, c.name) for c in link.__table__.columns},
            'share_url': get_share_url(link.unique_token),
            'material_name': material_name
        }
        link_data = SharedLinkResponse(**link_dict)
        result.append(link_data)
    
    return result


@router.get("/{link_id}", response_model=SharedLinkResponse)
async def get_shared_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific shared link"""
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Check permissions
    if (current_user.role != "admin" and not current_user.is_superuser and 
        shared_link.shared_by_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this shared link"
        )
    
    # Get material name
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    material_name = material.name if material else None
    
    response_dict = {
        **{c.name: getattr(shared_link, c.name) for c in shared_link.__table__.columns},
        'share_url': get_share_url(shared_link.unique_token),
        'material_name': material_name
    }
    response_data = SharedLinkResponse(**response_dict)
    
    return response_data


@router.get("/token/{token}", response_model=SharedLinkResponse)
async def get_shared_link_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Get shared link by token (public endpoint for accessing shared documents)"""
    shared_link = db.query(SharedLink).filter(SharedLink.unique_token == token).first()
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Check if link is valid
    if not shared_link.is_valid():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This shared link has expired or been deactivated"
        )
    
    # Record access
    shared_link.record_access()
    db.commit()
    
    # Get material name
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    material_name = material.name if material else None
    
    response_dict = {
        **{c.name: getattr(shared_link, c.name) for c in shared_link.__table__.columns},
        'share_url': get_share_url(token),
        'material_name': material_name
    }
    response_data = SharedLinkResponse(**response_dict)
    
    return response_data


@router.get("/token/{token}/download")
async def download_shared_document(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Download a document via shared link (public endpoint, no authentication required)"""
    # Verify token and get shared link
    shared_link = db.query(SharedLink).filter(SharedLink.unique_token == token).first()
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Check if link is valid
    if not shared_link.is_valid():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This shared link has expired or been deactivated"
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
    
    # Record access (already done when viewing, but record download specifically)
    shared_link.record_access()
    db.commit()
    
    # Get file path
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


@router.put("/{link_id}", response_model=SharedLinkResponse)
async def update_shared_link(
    link_id: int,
    link_data: SharedLinkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a shared link"""
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Check permissions
    if (current_user.role != "admin" and not current_user.is_superuser and 
        shared_link.shared_by_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this shared link"
        )
    
    # Update fields
    update_data = link_data.dict(exclude_unset=True)
    
    if "expires_in_days" in update_data:
        shared_link.expires_at = datetime.utcnow() + timedelta(days=update_data.pop("expires_in_days"))
    
    for key, value in update_data.items():
        if hasattr(shared_link, key):
            setattr(shared_link, key, value)
    
    db.commit()
    db.refresh(shared_link)
    
    # Get material name
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    material_name = material.name if material else None
    
    response_dict = {
        **{c.name: getattr(shared_link, c.name) for c in shared_link.__table__.columns},
        'share_url': get_share_url(shared_link.unique_token),
        'material_name': material_name
    }
    response_data = SharedLinkResponse(**response_dict)
    
    return response_data


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shared_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete (deactivate) a shared link"""
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Check permissions
    if (current_user.role != "admin" and not current_user.is_superuser and 
        shared_link.shared_by_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this shared link"
        )
    
    # Deactivate instead of deleting (for audit trail)
    shared_link.is_active = False
    db.commit()


@router.get("/stats/overview", response_model=SharedLinkStats)
async def get_sharing_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overall sharing statistics"""
    query = db.query(SharedLink)
    
    # Users can only see their own stats unless admin
    if current_user.role != "admin" and not current_user.is_superuser:
        query = query.filter(SharedLink.shared_by_user_id == current_user.id)
    
    total_shares = query.count()
    active_shares = query.filter(SharedLink.is_active == True).filter(SharedLink.expires_at > datetime.utcnow()).count()
    expired_shares = query.filter(SharedLink.expires_at <= datetime.utcnow()).count()
    total_accesses = db.query(func.sum(SharedLink.access_count)).scalar() or 0
    
    # Count unique customers
    unique_customers_query = query.filter(SharedLink.customer_email.isnot(None))
    if current_user.role != "admin" and not current_user.is_superuser:
        unique_customers_query = unique_customers_query.filter(SharedLink.shared_by_user_id == current_user.id)
    unique_customers = unique_customers_query.with_entities(func.count(distinct(SharedLink.customer_email))).scalar() or 0
    
    return SharedLinkStats(
        total_shares=total_shares,
        active_shares=active_shares,
        expired_shares=expired_shares,
        total_accesses=total_accesses,
        unique_customers=unique_customers
    )


@router.get("/stats/materials", response_model=List[MaterialShareStats])
async def get_material_sharing_stats(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get sharing statistics by material"""
    query = db.query(
        Material.id,
        Material.name,
        func.count(SharedLink.id).label('total_shares'),
        func.count(distinct(SharedLink.customer_email)).label('unique_customers'),
        func.sum(SharedLink.access_count).label('total_accesses'),
        func.max(SharedLink.created_at).label('last_shared_at')
    ).join(SharedLink, Material.id == SharedLink.material_id)
    
    # Users can only see their own stats unless admin
    if current_user.role != "admin" and not current_user.is_superuser:
        query = query.filter(SharedLink.shared_by_user_id == current_user.id)
    
    results = query.group_by(Material.id, Material.name).order_by(func.count(SharedLink.id).desc()).offset(skip).limit(limit).all()
    
    return [
        MaterialShareStats(
            material_id=r.id,
            material_name=r.name,
            total_shares=r.total_shares or 0,
            unique_customers=r.unique_customers or 0,
            total_accesses=r.total_accesses or 0,
            last_shared_at=r.last_shared_at
        )
        for r in results
    ]


@router.get("/stats/customers", response_model=List[CustomerShareStats])
async def get_customer_sharing_stats(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get sharing statistics by customer"""
    query = db.query(
        SharedLink.customer_email,
        func.max(SharedLink.customer_name).label('customer_name'),
        func.count(distinct(SharedLink.material_id)).label('total_documents'),
        func.sum(SharedLink.access_count).label('total_accesses'),
        func.max(SharedLink.created_at).label('last_shared_at'),
        func.max(SharedLink.last_accessed_at).label('last_accessed_at')
    ).filter(SharedLink.customer_email.isnot(None))
    
    # Users can only see their own stats unless admin
    if current_user.role != "admin" and not current_user.is_superuser:
        query = query.filter(SharedLink.shared_by_user_id == current_user.id)
    
    results = query.group_by(SharedLink.customer_email).order_by(func.count(distinct(SharedLink.material_id)).desc()).offset(skip).limit(limit).all()
    
    return [
        CustomerShareStats(
            customer_email=r.customer_email,
            customer_name=r.customer_name,
            total_documents_shared=r.total_documents or 0,
            total_accesses=r.total_accesses or 0,
            last_shared_at=r.last_shared_at,
            last_accessed_at=r.last_accessed_at
        )
        for r in results
    ]
