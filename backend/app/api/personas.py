"""
Personas API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.persona import Persona
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/api/personas", tags=["personas"])

@router.get("")
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

@router.get("/{persona_id}")
async def get_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona

@router.post("")
async def create_persona(
    persona_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new persona"""
    persona = Persona(**persona_data)
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona

@router.put("/{persona_id}")
async def update_persona(
    persona_id: int,
    persona_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    for key, value in persona_data.items():
        setattr(persona, key, value)
    
    db.commit()
    db.refresh(persona)
    return persona

@router.post("/{persona_id}/approve")
async def approve_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Approve a persona (collaborative governance)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Add user to approved_by_ids if not already there
    approved_by = persona.approved_by_ids or []
    if current_user.id not in approved_by:
        approved_by.append(current_user.id)
        persona.approved_by_ids = approved_by
        persona.approval_count = len(approved_by)
        db.commit()
        db.refresh(persona)
    
    return persona

@router.delete("/{persona_id}")
async def delete_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a persona"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    db.delete(persona)
    db.commit()
    return {"message": "Persona deleted"}
