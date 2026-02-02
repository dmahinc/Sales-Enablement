"""
Personas API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.persona import Persona
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaResponse
from datetime import datetime

router = APIRouter(prefix="/api/personas", tags=["personas"])

@router.get("", response_model=List[PersonaResponse])
async def list_personas(
    segment_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all personas"""
    query = db.query(Persona)
    
    if segment_id:
        query = query.filter(Persona.segment_id == segment_id)
    
    personas = query.offset(skip).limit(limit).all()
    return personas

@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found"
        )
    return persona

@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    persona_data: PersonaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new persona"""
    try:
        persona_dict = persona_data.dict()
        persona = Persona(**persona_dict)
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return persona
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create persona: {str(e)}"
        )

@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: int,
    persona_data: PersonaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found"
        )
    
    try:
        update_data = persona_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(persona, key, value)
        
        persona.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(persona)
        return persona
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update persona: {str(e)}"
        )

@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found"
        )
    
    try:
        db.delete(persona)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete persona: {str(e)}"
        )
