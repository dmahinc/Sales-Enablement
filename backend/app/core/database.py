"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Import all models to ensure relationships are configured
# Import models in correct order - AICorrection before User
# AICorrection model may not exist in all deployments
try:
    from app.models.ai_correction import AICorrection  # noqa: F401
except ImportError:
    pass
from app.models.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.material import Material  # noqa: F401
from app.models.shared_link import SharedLink  # noqa: F401
from app.models.persona import Persona  # noqa: F401
from app.models.segment import Segment  # noqa: F401
try:
    from app.models.content_block import ContentBlock  # noqa: F401
except ImportError:
    pass

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
