"""
Sales Enablement Application - Main FastAPI Application
"""
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

# Import models early to ensure SQLAlchemy relationships are configured correctly
# This must happen before any routes that use models are imported
from app.models.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.material import Material  # noqa: F401
# AICorrection model may not exist in all deployments
try:
    from app.models.ai_correction import AICorrection  # noqa: F401
except ImportError:
    pass

app = FastAPI(
    title="Products & Solutions Enablement API",
    description="API for managing products and solutions enablement materials, tracks, and content",
    version="1.0.0",
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# CORS middleware for frontend integration - must be added before routes
# Ensure CORS_ORIGINS is a list
cors_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["http://localhost:3003"]
# When allow_credentials=True, cannot use ["*"] - must specify exact origins
# Remove wildcard if present and ensure we have specific origins
if "*" in cors_origins:
    cors_origins.remove("*")
if not cors_origins or len(cors_origins) == 0:
    # Fallback to default origins if none specified
    cors_origins = [
        "https://91.134.72.199:3443",  # Frontend HTTPS
        "https://91.134.72.199:8443",  # Backend HTTPS
        "http://91.134.72.199:3003",   # Frontend HTTP (redirects)
        "http://localhost:3003",
        "http://localhost:3000",
        "http://localhost:5173"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,  # Required for cookies/auth tokens
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security: Add middleware to prevent credentials in URLs
@app.middleware("http")
async def security_middleware(request, call_next):
    # Block any GET requests to login endpoint (credentials should never be in URL)
    if request.method == "GET" and "/api/auth/login" in str(request.url):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            detail="Login endpoint only accepts POST requests. Credentials must be sent in request body, not URL."
        )
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {
        "message": "Products & Solutions Enablement API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import routers
# Import routers - handle missing modules gracefully
from app.api import materials, personas, segments, auth, health, discovery, analytics, tracks, users, shared_links, session

# Challenge-response authentication endpoints
from app.api import challenge as challenge_router

# Optional routers that may not exist in all deployments
try:
    from app.api import challenge
except ImportError:
    challenge = None
try:
    from app.api import products
except ImportError:
    products = None

# Always try to import products router (it should exist now)
from app.api import products
try:
    from app.api import dashboard
except ImportError:
    dashboard = None
try:
    from app.api import batch_upload
except ImportError:
    batch_upload = None

# Register routers
app.include_router(auth.router)
app.include_router(session.router)  # Obfuscated authentication endpoint outside /auth
app.include_router(challenge_router.router)  # Challenge-response authentication endpoints (/api/data/*)
app.include_router(materials.router)
if batch_upload:
    app.include_router(batch_upload.router)  # Batch upload with AI suggestions
app.include_router(personas.router)
app.include_router(segments.router)
try:
    app.include_router(products.router)
except (ImportError, AttributeError):
    pass  # Products router is optional
app.include_router(health.router)
app.include_router(discovery.router)
app.include_router(analytics.router)
app.include_router(tracks.router)
app.include_router(users.router)
app.include_router(shared_links.router)
if dashboard:
    app.include_router(dashboard.router)