"""
Tracks API endpoints - Sales Enablement Tracks
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.track import Track, TrackMaterial, TrackProgress
from app.models.material import Material
from app.schemas.track import (
    TrackCreate, TrackUpdate, TrackResponse,
    TrackMaterialCreate, TrackMaterialResponse,
    TrackProgressResponse, TrackProgressUpdate
)
from datetime import datetime

router = APIRouter(prefix="/api/tracks", tags=["tracks"])


@router.get("", response_model=List[TrackResponse])
async def list_tracks(
    status_filter: Optional[str] = None,
    use_case: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all tracks with optional filters"""
    query = db.query(Track)
    
    if status_filter:
        query = query.filter(Track.status == status_filter)
    if use_case:
        query = query.filter(Track.use_case.ilike(f"%{use_case}%"))
    
    tracks = query.order_by(Track.created_at.desc()).offset(skip).limit(limit).all()
    
    # Load materials for each track
    result = []
    for track in tracks:
        track_dict = {
            "id": track.id,
            "name": track.name,
            "description": track.description,
            "use_case": track.use_case,
            "learning_objectives": track.learning_objectives,
            "target_audience": track.target_audience,
            "estimated_duration_minutes": track.estimated_duration_minutes,
            "status": track.status,
            "created_by_id": track.created_by_id,
            "created_at": track.created_at,
            "updated_at": track.updated_at,
            "materials": []
        }
        
        # Load materials in order
        track_materials = db.query(TrackMaterial).filter(
            TrackMaterial.track_id == track.id
        ).order_by(TrackMaterial.order).all()
        
        for tm in track_materials:
            material = db.query(Material).filter(Material.id == tm.material_id).first()
            track_dict["materials"].append({
                "id": tm.id,
                "material_id": tm.material_id,
                "order": tm.order,
                "step_description": tm.step_description,
                "is_required": tm.is_required,
                "material": {
                    "id": material.id,
                    "name": material.name,
                    "description": material.description,
                    "material_type": material.material_type,
                    "universe_name": material.universe_name,
                } if material else None
            })
        
        result.append(track_dict)
    
    return result


@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific track with all materials"""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )
    
    # Load materials in order
    track_materials = db.query(TrackMaterial).filter(
        TrackMaterial.track_id == track_id
    ).order_by(TrackMaterial.order).all()
    
    materials = []
    for tm in track_materials:
        material = db.query(Material).filter(Material.id == tm.material_id).first()
        materials.append({
            "id": tm.id,
            "material_id": tm.material_id,
            "order": tm.order,
            "step_description": tm.step_description,
            "is_required": tm.is_required,
            "material": {
                "id": material.id,
                "name": material.name,
                "description": material.description,
                "material_type": material.material_type,
                "universe_name": material.universe_name,
                "file_path": material.file_path,
            } if material else None
        })
    
    return {
        "id": track.id,
        "name": track.name,
        "description": track.description,
        "use_case": track.use_case,
        "learning_objectives": track.learning_objectives,
        "target_audience": track.target_audience,
        "estimated_duration_minutes": track.estimated_duration_minutes,
        "status": track.status,
        "created_by_id": track.created_by_id,
        "created_at": track.created_at,
        "updated_at": track.updated_at,
        "materials": materials
    }


@router.post("", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
async def create_track(
    track_data: TrackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new track"""
    try:
        # Create track
        track = Track(
            name=track_data.name,
            description=track_data.description,
            use_case=track_data.use_case,
            learning_objectives=track_data.learning_objectives,
            target_audience=track_data.target_audience,
            estimated_duration_minutes=track_data.estimated_duration_minutes,
            status=track_data.status,
            created_by_id=current_user.id
        )
        db.add(track)
        db.flush()  # Get track.id
        
        # Add materials in order
        if track_data.materials:
            for idx, mat_data in enumerate(track_data.materials, start=1):
                # Verify material exists
                material = db.query(Material).filter(Material.id == mat_data.material_id).first()
                if not material:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Material {mat_data.material_id} not found"
                    )
                
                track_material = TrackMaterial(
                    track_id=track.id,
                    material_id=mat_data.material_id,
                    order=mat_data.order if mat_data.order else idx,
                    step_description=mat_data.step_description,
                    is_required=mat_data.is_required
                )
                db.add(track_material)
        
        db.commit()
        db.refresh(track)
        
        return await get_track(track.id, db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create track: {str(e)}"
        )


@router.put("/{track_id}", response_model=TrackResponse)
async def update_track(
    track_id: int,
    track_data: TrackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a track"""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )
    
    try:
        # Update track fields
        update_data = track_data.dict(exclude_unset=True, exclude={"materials"})
        for key, value in update_data.items():
            setattr(track, key, value)
        
        # Update materials if provided
        if track_data.materials is not None:
            # Delete existing materials
            db.query(TrackMaterial).filter(TrackMaterial.track_id == track_id).delete()
            
            # Add new materials
            for idx, mat_data in enumerate(track_data.materials, start=1):
                material = db.query(Material).filter(Material.id == mat_data.material_id).first()
                if not material:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Material {mat_data.material_id} not found"
                    )
                
                track_material = TrackMaterial(
                    track_id=track.id,
                    material_id=mat_data.material_id,
                    order=mat_data.order if mat_data.order else idx,
                    step_description=mat_data.step_description,
                    is_required=mat_data.is_required
                )
                db.add(track_material)
        
        track.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(track)
        
        return await get_track(track.id, db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update track: {str(e)}"
        )


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a track"""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )
    
    try:
        db.delete(track)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete track: {str(e)}"
        )


@router.get("/{track_id}/progress", response_model=TrackProgressResponse)
async def get_track_progress(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's progress for a track"""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )
    
    progress = db.query(TrackProgress).filter(
        TrackProgress.track_id == track_id,
        TrackProgress.user_id == current_user.id
    ).first()
    
    # Get total materials count
    total_materials = db.query(TrackMaterial).filter(
        TrackMaterial.track_id == track_id
    ).count()
    
    if progress:
        completed_count = len(progress.completed_material_ids or [])
        progress_percentage = (completed_count / total_materials * 100) if total_materials > 0 else 0
        
        return {
            "track_id": progress.track_id,
            "user_id": progress.user_id,
            "completed_material_ids": progress.completed_material_ids or [],
            "started_at": progress.started_at,
            "completed_at": progress.completed_at,
            "last_accessed_at": progress.last_accessed_at,
            "progress_percentage": round(progress_percentage, 2)
        }
    else:
        # Return empty progress
        return {
            "track_id": track_id,
            "user_id": current_user.id,
            "completed_material_ids": [],
            "started_at": None,
            "completed_at": None,
            "last_accessed_at": None,
            "progress_percentage": 0.0
        }


@router.post("/{track_id}/progress", response_model=TrackProgressResponse)
async def update_track_progress(
    track_id: int,
    progress_data: TrackProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user's progress for a track"""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )
    
    # Verify material is in track
    track_material = db.query(TrackMaterial).filter(
        TrackMaterial.track_id == track_id,
        TrackMaterial.material_id == progress_data.material_id
    ).first()
    
    if not track_material:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material is not part of this track"
        )
    
    # Get or create progress
    progress = db.query(TrackProgress).filter(
        TrackProgress.track_id == track_id,
        TrackProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        progress = TrackProgress(
            track_id=track_id,
            user_id=current_user.id,
            completed_material_ids=[],
            started_at=datetime.utcnow()
        )
        db.add(progress)
    
    # Update completed materials
    completed_ids = progress.completed_material_ids or []
    if progress_data.completed:
        if progress_data.material_id not in completed_ids:
            completed_ids.append(progress_data.material_id)
    else:
        completed_ids = [id for id in completed_ids if id != progress_data.material_id]
    
    progress.completed_material_ids = completed_ids
    progress.last_accessed_at = datetime.utcnow()
    
    # Check if track is completed
    total_materials = db.query(TrackMaterial).filter(
        TrackMaterial.track_id == track_id,
        TrackMaterial.is_required == True
    ).count()
    
    if len(completed_ids) >= total_materials and total_materials > 0:
        progress.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(progress)
    
    # Calculate progress percentage
    progress_percentage = (len(completed_ids) / total_materials * 100) if total_materials > 0 else 0
    
    return {
        "track_id": progress.track_id,
        "user_id": progress.user_id,
        "completed_material_ids": completed_ids,
        "started_at": progress.started_at,
        "completed_at": progress.completed_at,
        "last_accessed_at": progress.last_accessed_at,
        "progress_percentage": round(progress_percentage, 2)
    }
