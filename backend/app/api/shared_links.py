"""
Shared Links API endpoints - Public and authenticated endpoints for sharing materials
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
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
    SharedLinkCreate, SharedLinkResponse, SharedLinkPublicResponse, SharedLinkUpdate, TimelineEvent,
    SharedLinkStats, MaterialShareStats, CustomerShareStats
)
from app.services.storage import storage_service

router = APIRouter(prefix="/api/shared-links", tags=["shared-links"])


def generate_unique_token() -> str:
    """Generate a unique token for shared links"""
    return secrets.token_urlsafe(48)  # 64 characters when base64 encoded


@router.post(
    "",
    response_model=SharedLinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Shared Link",
    description="Create a new shareable link for a published material",
    responses={
        201: {"description": "Shared link created successfully"},
        400: {"description": "Material is not published or invalid request"},
        404: {"description": "Material not found"},
        401: {"description": "Authentication required"}
    }
)
async def create_shared_link(
    link_data: SharedLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new shared link for a material.
    
    This endpoint generates a unique token and creates a shareable link that can be
    sent to customers. The link allows them to view and download the material without
    requiring authentication.
    
    **Requirements:**
    - User must be authenticated
    - Material must exist and be published
    - Material must have a file attached
    
    **Parameters:**
    - `material_id`: ID of the material to share
    - `customer_email`: (Optional) Email address of the customer
    - `customer_name`: (Optional) Name of the customer
    - `expires_in_days`: Number of days until link expires (1-365, default: 90)
    
    **Returns:**
    - Shared link object with unique token and share URL
    """
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
    
    # Build share URL - use PLATFORM_URL from settings (frontend URL) instead of backend URL
    from app.core.config import settings
    platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
    share_url = f"{platform_url.rstrip('/')}/share/{token}"
    
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
        "download_count": shared_link.download_count,
        "last_downloaded_at": shared_link.last_downloaded_at,
        "created_at": shared_link.created_at,
        "updated_at": shared_link.updated_at,
        "share_url": share_url
    }


@router.get(
    "/token/{token}",
    response_model=SharedLinkPublicResponse,
    summary="Get Shared Link by Token",
    description="Retrieve shared link information using the token (PUBLIC endpoint)",
    responses={
        200: {"description": "Shared link information retrieved successfully"},
        404: {"description": "Link not found, expired, or deactivated"}
    }
)
async def get_shared_link_by_token(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get shared link information by token.
    
    **PUBLIC ENDPOINT** - No authentication required. This endpoint is used by
    external customers to access shared materials.
    
    **Parameters:**
    - `token`: Unique token from the shareable link
    
    **Validation:**
    - Link must exist
    - Link must be active (`is_active = True`)
    - Link must not be expired (`expires_at > now`)
    - Material must exist
    
    **Tracking:**
    - Increments `access_count` on each access
    - Records `last_accessed_at` timestamp
    - Creates a MaterialUsage VIEW event for analytics
    
    **Returns:**
    - Shared link information including material details
    - Does not include sensitive information (user IDs, etc.)
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
    
    # Track view event in MaterialUsage for timeline (individual view events)
    try:
        usage_event = MaterialUsage(
            material_id=material.id,
            user_id=shared_link.shared_by_user_id or 0,  # Use creator's ID or 0 for anonymous
            action=UsageAction.VIEW.value,
            used_at=datetime.utcnow(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(usage_event)
    except Exception as e:
        import logging
        logging.error(f"Failed to track view usage: {str(e)}")
    
    db.commit()
    
    # Build share URL for response
    from app.core.config import settings
    platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
    share_url = f"{platform_url.rstrip('/')}/share/{shared_link.unique_token}"
    
    return {
        "id": shared_link.id,
        "unique_token": shared_link.unique_token,
        "material_id": material.id,
        "material_name": material.name,
        "material_type": material.material_type,
        "material_description": material.description,
        "file_name": material.file_name,
        "file_format": material.file_format,
        "file_size": material.file_size,
        "expires_at": shared_link.expires_at,
        "is_active": shared_link.is_active,
        "access_count": shared_link.access_count,
        "download_count": shared_link.download_count,
        "created_at": shared_link.created_at,
        "share_url": share_url
    }


@router.get(
    "/token/{token}/download",
    summary="Download Material via Shared Link",
    description="Download the material file using a shared link token (PUBLIC endpoint)",
    responses={
        200: {"description": "File download"},
        404: {"description": "Link not found, expired, or file not available"}
    }
)
async def download_shared_material(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Download material file via shared link.
    
    **PUBLIC ENDPOINT** - No authentication required. This endpoint allows
    external customers to download materials shared with them.
    
    **Parameters:**
    - `token`: Unique token from the shareable link
    
    **Validation:**
    - Link must exist and be valid (active and not expired)
    - Material must exist
    - Material must have a file attached
    
    **Tracking:**
    - Increments `download_count` on each download
    - Records `last_downloaded_at` timestamp
    - Increments `access_count`
    - Creates a MaterialUsage DOWNLOAD event for analytics
    - Updates material `usage_count`
    
    **Returns:**
    - File download with appropriate Content-Type header
    - Filename in Content-Disposition header
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
    
    # Ensure filename is properly formatted (FastAPI FileResponse handles encoding)
    filename = material.file_name or f"material_{material.id}.{file_format}"
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type
    )


@router.get("/timeline", response_model=List[TimelineEvent])
async def get_timeline(
    limit: int = 20,
    customer_email: Optional[str] = None,
    material_id: Optional[int] = None,
    event_type: Optional[str] = None,  # "shared", "viewed", "downloaded"
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get customer engagement timeline events
    Uses MaterialUsage events for individual view/download tracking
    Falls back to SharedLink tracking for aggregate data
    """
    from sqlalchemy import and_, or_
    
    # Parse date filters
    start_datetime = None
    end_datetime = None
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
        except ValueError:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
    
    # Get shared links - directors, admins, and PMMs see all links, sales see only their own
    if current_user.role in ["director", "admin", "pmm"]:
        shared_links_query = db.query(SharedLink)
    else:
        shared_links_query = db.query(SharedLink).filter(SharedLink.shared_by_user_id == current_user.id)
    
    if customer_email:
        shared_links_query = shared_links_query.filter(SharedLink.customer_email == customer_email)
    if material_id:
        shared_links_query = shared_links_query.filter(SharedLink.material_id == material_id)
    
    shared_links = shared_links_query.all()
    
    if not shared_links:
        return []
    
    shared_material_ids = list(set([link.material_id for link in shared_links]))
    link_by_id = {link.id: link for link in shared_links}
    
    # Build material_id -> list of SharedLinks mapping
    material_to_links = {}
    for link in shared_links:
        if link.material_id not in material_to_links:
            material_to_links[link.material_id] = []
        material_to_links[link.material_id].append(link)
    
    # Pre-fetch materials
    materials = db.query(Material).filter(Material.id.in_(shared_material_ids)).all()
    material_by_id = {m.id: m for m in materials}
    
    events = []
    
    # Add "shared" events
    if not event_type or event_type == "shared":
        for link in shared_links:
            if start_datetime and link.created_at < start_datetime:
                continue
            if end_datetime and link.created_at > end_datetime:
                continue
            
            material = material_by_id.get(link.material_id)
            if material:
                events.append({
                    "event_type": "shared",
                    "timestamp": link.created_at,
                    "material_id": link.material_id,
                    "material_name": material.name,
                    "product_name": material.product_name,
                    "material_type": material.material_type,
                    "other_type_description": material.other_type_description,
                    "customer_email": link.customer_email,
                    "customer_name": link.customer_name,
                    "shared_link_id": link.id
                })
    
    # Add "viewed" and "downloaded" events
    # PRIMARY SOURCE: SharedLink tracking (last_accessed_at, last_downloaded_at)
    # SECONDARY SOURCE: MaterialUsage events (for granular individual events if they exist)
    if not event_type or event_type in ["viewed", "downloaded"]:
        # PRIMARY: Use SharedLink tracking - this is the most reliable source
        for link in shared_links:
            if customer_email and link.customer_email != customer_email:
                continue
            
            material = material_by_id.get(link.material_id)
            if not material:
                continue
            
            # Add "viewed" events from last_accessed_at
            if (not event_type or event_type == "viewed") and link.last_accessed_at:
                if (not start_datetime or link.last_accessed_at >= start_datetime) and \
                   (not end_datetime or link.last_accessed_at <= end_datetime):
                    events.append({
                        "event_type": "viewed",
                        "timestamp": link.last_accessed_at,
                        "material_id": link.material_id,
                        "material_name": material.name,
                        "customer_email": link.customer_email,
                        "customer_name": link.customer_name,
                        "shared_link_id": link.id
                    })
            
            # Add "downloaded" events from last_downloaded_at
            if (not event_type or event_type == "downloaded") and link.last_downloaded_at:
                if (not start_datetime or link.last_downloaded_at >= start_datetime) and \
                   (not end_datetime or link.last_downloaded_at <= end_datetime):
                    events.append({
                        "event_type": "downloaded",
                        "timestamp": link.last_downloaded_at,
                        "material_id": link.material_id,
                        "material_name": material.name,
                        "product_name": material.product_name,
                        "material_type": material.material_type,
                        "other_type_description": material.other_type_description,
                        "customer_email": link.customer_email,
                        "customer_name": link.customer_name,
                        "shared_link_id": link.id
                    })
        
        # SECONDARY: Add MaterialUsage events as supplement (if they exist and aren't duplicates)
        # MaterialUsage events are sparse, so this is just a supplement
        action_filter = []
        if not event_type or event_type == "viewed":
            action_filter.append(UsageAction.VIEW.value)
        if not event_type or event_type == "downloaded":
            action_filter.append(UsageAction.DOWNLOAD.value)
        
        if action_filter and shared_material_ids:
            # Query MaterialUsage events
            usage_query = db.query(MaterialUsage).filter(
                MaterialUsage.action.in_(action_filter),
                MaterialUsage.material_id.in_(shared_material_ids)
            )
            
            # For directors/admins/PMMs: see all MaterialUsage events
            # For sales: only see events from their own shared links or anonymous (user_id=0)
            if current_user.role not in ["director", "admin", "pmm"]:
                # Get all user_ids from shared links (creators)
                shared_link_user_ids = list(set([link.shared_by_user_id for link in shared_links if link.shared_by_user_id]))
                
                # Filter by user_id: must match one of the shared link creators OR be 0
                if shared_link_user_ids:
                    usage_query = usage_query.filter(
                        or_(
                            MaterialUsage.user_id.in_(shared_link_user_ids),
                            MaterialUsage.user_id == 0
                        )
                    )
                else:
                    usage_query = usage_query.filter(MaterialUsage.user_id == 0)
            
            if material_id:
                usage_query = usage_query.filter(MaterialUsage.material_id == material_id)
            if start_datetime:
                usage_query = usage_query.filter(MaterialUsage.used_at >= start_datetime)
            if end_datetime:
                usage_query = usage_query.filter(MaterialUsage.used_at <= end_datetime)
            
            usage_events = usage_query.order_by(MaterialUsage.used_at.desc()).all()
            
            # Track existing events to avoid duplicates
            existing_event_keys = set()
            for e in events:
                if e.get("event_type") in ["viewed", "downloaded"]:
                    existing_event_keys.add((
                        e.get("material_id"),
                        e.get("customer_email") or "",
                        e.get("timestamp").isoformat() if hasattr(e.get("timestamp"), 'isoformat') else str(e.get("timestamp")),
                        e.get("event_type")
                    ))
            
            # Add MaterialUsage events that don't duplicate SharedLink events
            for usage in usage_events:
                matching_links = material_to_links.get(usage.material_id, [])
                if not matching_links:
                    continue
                
                material = material_by_id.get(usage.material_id)
                if not material:
                    continue
                
                for link in matching_links:
                    if customer_email and link.customer_email != customer_email:
                        continue
                    
                    # Match if user_id matches shared_by_user_id, or if user_id is 0 (anonymous)
                    # Directors/admins/PMMs can see all events, so skip this check for them
                    if current_user.role not in ["director", "admin", "pmm"]:
                        if usage.user_id != 0 and link.shared_by_user_id != usage.user_id:
                            continue
                    
                    # Check if this event already exists from SharedLink tracking
                    event_key = (
                        usage.material_id,
                        link.customer_email or "",
                        usage.used_at.isoformat(),
                        "viewed" if usage.action == UsageAction.VIEW.value else "downloaded"
                    )
                    
                    if event_key in existing_event_keys:
                        continue  # Skip duplicate
                    
                    existing_event_keys.add(event_key)
                    
                    events.append({
                        "event_type": "viewed" if usage.action == UsageAction.VIEW.value else "downloaded",
                        "timestamp": usage.used_at,
                        "material_id": usage.material_id,
                        "material_name": material.name,
                        "product_name": material.product_name,
                        "material_type": material.material_type,
                        "other_type_description": material.other_type_description,
                        "customer_email": link.customer_email,
                        "customer_name": link.customer_name,
                        "shared_link_id": link.id
                    })
    
    # Sort all events by timestamp (most recent first)
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Apply limit only at the end
    return events[:limit]


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
    # Build share URL - use PLATFORM_URL from settings (frontend URL) instead of backend URL
    from app.core.config import settings
    platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
    share_url = f"{platform_url.rstrip('/')}/share/{shared_link.unique_token}"
    
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


@router.post(
    "/{link_id}/send-email",
    status_code=status.HTTP_200_OK,
    summary="Send Email Notification",
    description="Send an email notification with the shared link to a customer",
    responses={
        200: {"description": "Email sent successfully"},
        400: {"description": "No email address provided"},
        403: {"description": "You can only send emails for your own shared links"},
        404: {"description": "Shared link or material not found"},
        500: {"description": "Failed to send email (check SMTP configuration)"},
        503: {"description": "Email service not available"}
    }
)
async def send_shared_link_email(
    link_id: int,
    customer_email: Optional[str] = Query(None, description="Email address to send to (optional, uses link's email if not provided)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send email notification for a shared link.
    
    Sends an email to the customer with the shareable link and material information.
    The email includes a formatted HTML template with the material name, share URL,
    and expiration information.
    
    **Requirements:**
    - User must be authenticated
    - User must be the creator of the shared link
    - SMTP must be configured and enabled in settings
    - Email address must be provided (either as parameter or in the link)
    
    **Parameters:**
    - `link_id`: ID of the shared link
    - `customer_email`: (Optional) Email address to send to. If not provided, uses the email from the link.
    
    **Email Configuration:**
    - Requires `SMTP_ENABLED=true` in backend `.env`
    - Requires valid SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
    - Email is sent asynchronously and does not block the response
    
    **Returns:**
    - Success message with the email address used
    """
    shared_link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
    
    if not shared_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found"
        )
    
    # Only creator can send email
    if shared_link.shared_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send emails for your own shared links"
        )
    
    # Use provided email or the one from the link
    email_to_send = customer_email or shared_link.customer_email
    
    if not email_to_send:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email address provided"
        )
    
    # Get material
    material = db.query(Material).filter(Material.id == shared_link.material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Build share URL - use PLATFORM_URL from settings (frontend URL) instead of backend URL
    from app.core.config import settings
    platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
    share_url = f"{platform_url.rstrip('/')}/share/{shared_link.unique_token}"
    
    # Calculate days until expiration
    expires_in_days = (shared_link.expires_at - datetime.utcnow()).days
    
    # Send email
    try:
        from app.core.email import send_share_link_notification
        from app.core.config import settings
        
        shared_by_name = current_user.full_name or current_user.email
        platform_url = getattr(settings, 'PLATFORM_URL', 'http://localhost:3003')
        
        email_sent = send_share_link_notification(
            customer_email=email_to_send,
            customer_name=shared_link.customer_name or "",
            material_name=material.name,
            share_url=share_url,
            shared_by_name=shared_by_name,
            platform_url=platform_url
        )
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please check SMTP configuration."
            )
        
        return {"message": "Email sent successfully", "email": email_to_send}
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not available"
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending email: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )


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


@router.get("/stats/overview", response_model=SharedLinkStats)
async def get_shared_links_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overview statistics for shared links"""
    from sqlalchemy import func, and_, or_
    
    # Base query - directors, admins, and PMMs see all links, sales see only their own
    if current_user.role in ["director", "admin", "pmm"]:
        base_query = db.query(SharedLink)
    else:
        base_query = db.query(SharedLink).filter(SharedLink.shared_by_user_id == current_user.id)
    
    # Total shares
    total_shares = base_query.count()
    
    # Active shares (not expired and is_active)
    now = datetime.utcnow()
    active_shares = base_query.filter(
        and_(
            SharedLink.is_active == True,
            SharedLink.expires_at > now
        )
    ).count()
    
    # Expired shares
    expired_shares = base_query.filter(
        or_(
            SharedLink.is_active == False,
            SharedLink.expires_at <= now
        )
    ).count()
    
    # Total accesses
    if current_user.role in ["director", "admin", "pmm"]:
        total_accesses = db.query(func.sum(SharedLink.access_count)).scalar() or 0
    else:
        total_accesses = db.query(func.sum(SharedLink.access_count)).filter(
            SharedLink.shared_by_user_id == current_user.id
        ).scalar() or 0
    
    # Total downloads
    if current_user.role in ["director", "admin", "pmm"]:
        total_downloads = db.query(func.sum(SharedLink.download_count)).scalar() or 0
    else:
        total_downloads = db.query(func.sum(SharedLink.download_count)).filter(
            SharedLink.shared_by_user_id == current_user.id
        ).scalar() or 0
    
    # Unique customers
    if current_user.role in ["director", "admin", "pmm"]:
        unique_customers = db.query(func.count(func.distinct(SharedLink.customer_email))).filter(
            SharedLink.customer_email.isnot(None)
        ).scalar() or 0
    else:
        unique_customers = db.query(func.count(func.distinct(SharedLink.customer_email))).filter(
            and_(
                SharedLink.shared_by_user_id == current_user.id,
                SharedLink.customer_email.isnot(None)
            )
        ).scalar() or 0
    
    return {
        "total_shares": total_shares,
        "active_shares": active_shares,
        "expired_shares": expired_shares,
        "total_accesses": int(total_accesses),
        "total_downloads": int(total_downloads),
        "unique_customers": unique_customers
    }


@router.get("/stats/materials", response_model=List[MaterialShareStats])
async def get_material_stats(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for most shared materials"""
    from sqlalchemy import func, and_, or_
    
    # Base query - directors, admins, and PMMs see all links, sales see only their own
    if current_user.role in ["director", "admin", "pmm"]:
        base_query = db.query(SharedLink)
    else:
        base_query = db.query(SharedLink).filter(SharedLink.shared_by_user_id == current_user.id)
    
    # Group by material and get stats
    material_stats = base_query.with_entities(
        SharedLink.material_id,
        func.count(SharedLink.id).label('total_shares'),
        func.count(func.distinct(SharedLink.customer_email)).label('unique_customers'),
        func.sum(SharedLink.access_count).label('total_accesses'),
        func.sum(SharedLink.download_count).label('total_downloads'),
        func.max(SharedLink.created_at).label('last_shared_at')
    ).group_by(SharedLink.material_id).order_by(func.count(SharedLink.id).desc()).limit(limit).all()
    
    result = []
    for stat in material_stats:
        material = db.query(Material).filter(Material.id == stat.material_id).first()
        if material:
            result.append({
                "material_id": stat.material_id,
                "material_name": material.name,
                "total_shares": stat.total_shares,
                "unique_customers": stat.unique_customers or 0,
                "total_accesses": int(stat.total_accesses or 0),
                "total_downloads": int(stat.total_downloads or 0),
                "last_shared_at": stat.last_shared_at
            })
    
    return result


@router.get("/stats/customers", response_model=List[CustomerShareStats])
async def get_customer_stats(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for customers who have received shared links"""
    from sqlalchemy import func, and_, distinct
    
    # Base query - directors, admins, and PMMs see all links, sales see only their own
    if current_user.role in ["director", "admin", "pmm"]:
        base_query = db.query(SharedLink).filter(SharedLink.customer_email.isnot(None))
    else:
        base_query = db.query(SharedLink).filter(
            and_(
                SharedLink.shared_by_user_id == current_user.id,
                SharedLink.customer_email.isnot(None)
            )
        )
    
    # Group by customer email and get stats
    customer_stats = base_query.with_entities(
        SharedLink.customer_email,
        func.max(SharedLink.customer_name).label('customer_name'),
        func.count(distinct(SharedLink.material_id)).label('total_documents_shared'),
        func.sum(SharedLink.access_count).label('total_accesses'),
        func.sum(SharedLink.download_count).label('total_downloads'),
        func.max(SharedLink.created_at).label('last_shared_at'),
        func.max(SharedLink.last_accessed_at).label('last_accessed_at'),
        func.max(SharedLink.last_downloaded_at).label('last_downloaded_at')
    ).group_by(SharedLink.customer_email).order_by(func.count(distinct(SharedLink.material_id)).desc()).limit(limit).all()
    
    result = []
    for stat in customer_stats:
        if stat.customer_email:  # Ensure email is not None
            result.append({
                "customer_email": stat.customer_email,
                "customer_name": stat.customer_name,
                "total_documents_shared": stat.total_documents_shared or 0,
                "total_accesses": int(stat.total_accesses or 0),
                "total_downloads": int(stat.total_downloads or 0),
                "last_shared_at": stat.last_shared_at,
                "last_accessed_at": stat.last_accessed_at,
                "last_downloaded_at": stat.last_downloaded_at
            })
    
    return result
