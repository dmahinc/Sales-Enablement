"""
Association tables for many-to-many relationships
"""
from sqlalchemy import Table, Column, Integer, ForeignKey
from app.models.base import BaseModel

# Material-Persona association
material_persona = Table(
    "material_persona",
    BaseModel.metadata,
    Column("material_id", Integer, ForeignKey("materials.id"), primary_key=True),
    Column("persona_id", Integer, ForeignKey("personas.id"), primary_key=True)
)

# Material-Segment association
material_segment = Table(
    "material_segment",
    BaseModel.metadata,
    Column("material_id", Integer, ForeignKey("materials.id"), primary_key=True),
    Column("segment_id", Integer, ForeignKey("segments.id"), primary_key=True)
)
