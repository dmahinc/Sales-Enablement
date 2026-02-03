# Import all models to ensure relationships are properly configured
from app.models.base import BaseModel, Base
from app.models.user import User
from app.models.material import Material
from app.models.persona import Persona
from app.models.segment import Segment
from app.models.content_block import ContentBlock, ContentBlockRating, ContentBlockComment, ContentBlockUsage
from app.models.health import MaterialHealthHistory
from app.models.usage import MaterialUsage
from app.models.track import Track, TrackMaterial, TrackProgress
from app.models.shared_link import SharedLink
from app.models.associations import material_persona, material_segment

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
    "material_persona",
    "material_segment",
]
