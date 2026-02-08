"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Import all models to ensure relationships are configured
# Import models in correct order - AICorrection before User
from app.models.ai_correction import AICorrection  # noqa: F401
from app.models import Base, User, Material, Persona, Segment, ContentBlock

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
