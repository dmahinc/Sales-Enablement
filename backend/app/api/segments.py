"""
Market Segments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.segment import Segment
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.segment import SegmentCreate, SegmentUpdate, SegmentResponse
from datetime import datetime

router = APIRouter(prefix="/api/segments", tags=["segments"])

@router.get("", response_model=List[SegmentResponse])
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

@router.get("/{segment_id}", response_model=SegmentResponse)
async def get_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found"
        )
    return segment

@router.post("", response_model=SegmentResponse, status_code=status.HTTP_201_CREATED)
async def create_segment(
    segment_data: SegmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new segment"""
    try:
        segment_dict = segment_data.dict()
        segment = Segment(**segment_dict)
        db.add(segment)
        db.commit()
        db.refresh(segment)
        return segment
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create segment: {str(e)}"
        )

@router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    segment_id: int,
    segment_data: SegmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found"
        )
    
    try:
        update_data = segment_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(segment, key, value)
        
        segment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(segment)
        return segment
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update segment: {str(e)}"
        )

@router.delete("/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a segment"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found"
        )
    
    try:
        db.delete(segment)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete segment: {str(e)}"
        )
