"""
Sales Enablement Application - Main FastAPI Application
"""
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)

# Import models early to ensure SQLAlchemy relationships are configured correctly
# This must happen before any routes that use models are imported
from app.models.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.material import Material  # noqa: F401
from app.models.product_release import ProductRelease  # noqa: F401
from app.models.marketing_update import MarketingUpdate  # noqa: F401
from app.models.notification import Notification  # noqa: F401
# AICorrection model may not exist in all deployments
try:
    from app.models.ai_correction import AICorrection  # noqa: F401
except ImportError:
    pass

app = FastAPI(
    title="Products & Solutions Enablement API",
    description="""
    API for managing products and solutions enablement materials, tracks, and content.
    
    ## Features
    
    * **Materials Management**: Upload, organize, and manage sales enablement materials
    * **Product Hierarchy**: Organize materials by universe, category, and product
    * **User Management**: Role-based access control (Admin, PMM, Sales, Director)
    * **Sharing**: Share materials with customers via secure links
    * **Analytics**: Track material usage and engagement metrics
    * **AI Integration**: Generate executive summaries using OVHcloud AI
    
    ## Authentication
    
    The API uses JWT-based authentication with a custom challenge-response mechanism.
    Most endpoints require authentication except for public shared link endpoints.
    
    ## Error Responses
    
    All errors follow a standardized format:
    ```json
    {
        "success": false,
        "error": "ErrorType",
        "message": "Human-readable error message",
        "status_code": 400,
        "details": [],
        "timestamp": "2026-02-16T22:00:00Z",
        "path": "/api/endpoint"
    }
    ```
    """,
    version="1.0.0",
    contact={
        "name": "OVHcloud Products & Solutions Enablement",
        "email": "support@ovhcloud.com"
    },
    license_info={
        "name": "Proprietary",
    },
    tags_metadata=[
        {
            "name": "auth",
            "description": "Authentication endpoints for user login and token management",
        },
        {
            "name": "materials",
            "description": "Operations related to sales enablement materials (CRUD, upload, download)",
        },
        {
            "name": "shared-links",
            "description": "Public and authenticated endpoints for sharing materials with customers",
        },
        {
            "name": "users",
            "description": "User management endpoints (admin only)",
        },
        {
            "name": "products",
            "description": "Product hierarchy management (universes, categories, products)",
        },
        {
            "name": "analytics",
            "description": "Usage analytics and statistics",
        },
        {
            "name": "tracks",
            "description": "Learning track management",
        },
        {
            "name": "health",
            "description": "Health check and system status endpoints",
        },
    ],
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# Register exception handlers for standardized error responses
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

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

@app.get(
    "/",
    tags=["health"],
    summary="API Root",
    description="Get API information and status",
    response_description="API metadata"
)
async def root():
    """
    Root endpoint that returns basic API information.
    
    Returns:
        dict: API name, version, and status
    """
    return {
        "message": "Products & Solutions Enablement API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get(
    "/health",
    tags=["health"],
    summary="Health Check",
    description="Check if the API is running and healthy",
    response_description="Health status"
)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        dict: Health status indicator
    """
    return {"status": "healthy"}

# Import routers
# Import routers - handle missing modules gracefully
from app.api import materials, personas, segments, auth, health, discovery, analytics, tracks, users, shared_links, session, product_releases, marketing_updates, notifications

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
app.include_router(product_releases.router)
app.include_router(marketing_updates.router)
app.include_router(notifications.router)
if dashboard:
    app.include_router(dashboard.router)