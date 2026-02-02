"""
Market Segments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.segment import Segment
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/api/segments", tags=["segments"])

@router.get("")
async def list_segments(
    parent_segment_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all segments"""
    query = db.query(Segment)
    
    if parent_segment_id:
        query = query.filter(Segment.parent_segment_id == parent_segment_id)
    else:
        # Default: show top-level segments only
        query = query.filter(Segment.parent_segment_id == None)
    
    segments = query.offset(skip).limit(limit).all()
    return segments

@router.get("/{segment_id}")
async def get_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment

@router.get("/{segment_id}/personas")
async def get_segment_personas(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get personas for a segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment.personas

@router.post("")
async def create_segment(
    segment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new segment"""
    segment = Segment(**segment_data)
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment

@router.put("/{segment_id}")
async def update_segment(
    segment_id: int,
    segment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    for key, value in segment_data.items():
        setattr(segment, key, value)
    
    db.commit()
    db.refresh(segment)
    return segment

@router.post("/{segment_id}/approve")
async def approve_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Approve a segment (collaborative governance)"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    approved_by = segment.approved_by_ids or []
    if current_user.id not in approved_by:
        approved_by.append(current_user.id)
        segment.approved_by_ids = approved_by
        segment.approval_count = len(approved_by)
        db.commit()
        db.refresh(segment)
    
    return segment

@router.delete("/{segment_id}")
async def delete_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    db.delete(segment)
    db.commit()
    return {"message": "Segment deleted"}
