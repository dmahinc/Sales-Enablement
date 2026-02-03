"""
Sales Enablement Application - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="Products & Solutions Enablement API",
    description="API for managing products and solutions enablement materials, tracks, and content",
    version="1.0.0",
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# CORS middleware for frontend integration - must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
from app.api import materials, personas, segments, auth, health, discovery, analytics, tracks, users, shared_links

# Register routers
app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(personas.router)
app.include_router(segments.router)
app.include_router(health.router)
app.include_router(discovery.router)
app.include_router(analytics.router)
app.include_router(tracks.router)
app.include_router(users.router)
app.include_router(shared_links.router)
