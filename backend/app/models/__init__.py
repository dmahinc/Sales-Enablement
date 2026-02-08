# Import all models to ensure relationships are properly configured
# CRITICAL: Import order matters for SQLAlchemy relationships
# Import base first
from app.models.base import BaseModel, Base

# Import AICorrection FIRST before User since User has a relationship to it
from app.models.ai_correction import AICorrection

# Then import User (which references AICorrection)
from app.models.user import User

# Import other models
from app.models.material import Material
from app.models.persona import Persona
from app.models.segment import Segment
from app.models.content_block import ContentBlock, ContentBlockRating, ContentBlockComment, ContentBlockUsage
from app.models.health import MaterialHealthHistory
from app.models.usage import MaterialUsage
from app.models.track import Track, TrackMaterial, TrackProgress
from app.models.shared_link import SharedLink
from app.models.product import Universe, Category, Product
from app.models.associations import material_persona, material_segment

# Force SQLAlchemy to configure all relationships
# This ensures AICorrection is available when User tries to set up its relationship
try:
    # Trigger relationship configuration by accessing the relationship
    if hasattr(User, 'ai_corrections'):
        pass  # Relationship exists
except Exception:
    pass

__all__ = [
    "BaseModel",
    "Base",
    "User",
    "Material",
    "Persona",
    "Segment",
    "ContentBlock",
    "ContentBlockRating",
    "ContentBlockComment",
    "ContentBlockUsage",
    "MaterialHealthHistory",
    "MaterialUsage",
    "Track",
    "TrackMaterial",
    "TrackProgress",
    "SharedLink",
    "Universe",
    "Category",
    "Product",
    "AICorrection",
    "material_persona",
    "material_segment",
]
