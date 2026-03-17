"""
Application configuration
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Union
import json
import os
from pathlib import Path

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Sales Enablement API"
    DEBUG: bool = True
    
    # Database - can be set via DATABASE_URL or individual POSTGRES_* vars
    POSTGRES_HOST: str = Field(default="localhost", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")
    POSTGRES_USER: str = Field(default="postgres", description="PostgreSQL user")
    POSTGRES_PASSWORD: str = Field(default="postgres", description="PostgreSQL password")
    POSTGRES_DB: str = Field(default="sales_enablement", description="PostgreSQL database name")
    DATABASE_URL: str = Field(default="", description="Full database URL (auto-constructed if not provided)")
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = Field(default="http://localhost:3003", description="CORS allowed origins (comma-separated string or JSON array)")
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Try to parse as JSON array first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
            # Parse as comma-separated string
            if ',' in v:
                return [origin.strip() for origin in v.split(',')]
            return [v]
        return v if isinstance(v, list) else ["*"]
    
    # File Storage
    STORAGE_TYPE: str = "local"  # local, sharepoint, drive
    STORAGE_PATH: str = "./storage"
    
    # Platform
    PLATFORM_URL: str = Field(default="http://localhost:3003", description="Frontend platform URL for email links")
    
    # Authentication
    SECRET_KEY: str = Field(..., description="Secret key for JWT tokens. MUST be set in environment.")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (default)
    
    # Email Configuration
    SMTP_ENABLED: bool = Field(default=False, description="Enable email notifications")
    SMTP_HOST: str = Field(default="smtp.ovh.net", description="SMTP server hostname")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USER: str = Field(default="", description="SMTP username")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password")
    SMTP_FROM_EMAIL: str = Field(default="noreply@ovhcloud.com", description="From email address")
    SMTP_FROM_NAME: str = Field(default="Products & Solutions Enablement", description="From name")
    SMTP_USE_TLS: bool = Field(default=True, description="Use TLS for SMTP")
    
    # OVHcloud AI Endpoints Configuration
    OVH_AI_ENABLED: bool = Field(default=False, description="Enable OVHcloud AI Endpoints integration")
    OVH_AI_ENDPOINT_URL: str = Field(default="", description="OVHcloud AI Endpoint URL")
    OVH_AI_API_KEY: str = Field(default="", description="OVHcloud AI API Key")
    OVH_AI_MODEL: str = Field(default="Meta-Llama-3_3-70B-Instruct", description="AI model to use")
    OVH_AI_CONFIDENCE_THRESHOLD: float = Field(default=0.9, description="Confidence threshold for auto-apply (0.0-1.0)")
    
    # Embedding / Semantic Search Configuration
    OVH_AI_EMBEDDING_URL: str = Field(default="", description="OVHcloud AI Embedding endpoint URL (OpenAI-compatible /v1/embeddings)")
    OVH_AI_EMBEDDING_MODEL: str = Field(default="", description="Embedding model name (e.g. multilingual-e5-large)")
    EMBEDDING_DIMENSIONS: int = Field(default=384, description="Embedding vector dimensions (384 for fastembed default, override for OVH model)")
    EMBEDDING_PROVIDER: str = Field(default="auto", description="Embedding provider: 'ovh', 'local', or 'auto' (tries OVH first, falls back to local)")
    
    class Config:
        env_file = "/app/.env"  # Use absolute path for container
        env_file_encoding = "utf-8"
        case_sensitive = False

# Create settings instance
_settings = Settings()

# Override with .env file values (prioritize .env over environment variables)
# Try multiple possible locations for .env file
env_file_path = None
possible_paths = [
    Path("/app/.env"),  # Absolute path in container (most reliable)
    Path(".env"),  # Current directory
    Path(__file__).parent.parent.parent / ".env",  # Relative to this file
]
for path in possible_paths:
    if path.exists():
        env_file_path = path
        break

if env_file_path and env_file_path.exists():
    with open(env_file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                # Force override with .env values for OVH_AI settings, SMTP settings, SECRET_KEY, and other config
                if key.startswith("OVH_AI_") or key.startswith("EMBEDDING_"):
                    if key == "OVH_AI_ENABLED":
                        setattr(_settings, key, value.lower() in ("true", "1", "yes"))
                    elif key == "EMBEDDING_DIMENSIONS":
                        try:
                            setattr(_settings, key, int(value))
                        except ValueError:
                            pass
                    else:
                        setattr(_settings, key, value)
                elif key.startswith("SMTP_"):
                    # Handle boolean values for SMTP_ENABLED
                    if key == "SMTP_ENABLED":
                        setattr(_settings, key, value.lower() in ("true", "1", "yes"))
                    elif key == "SMTP_PORT":
                        try:
                            setattr(_settings, key, int(value))
                        except ValueError:
                            pass  # Keep default if invalid
                    elif key == "SMTP_USE_TLS":
                        setattr(_settings, key, value.lower() in ("true", "1", "yes"))
                    else:
                        setattr(_settings, key, value)
                elif key == "SECRET_KEY" or key == "PLATFORM_URL":
                    setattr(_settings, key, value)

# Auto-construct DATABASE_URL from POSTGRES_* if not explicitly provided
if not _settings.DATABASE_URL or _settings.DATABASE_URL == "" or "localhost" in _settings.DATABASE_URL:
    _settings.DATABASE_URL = f"postgresql://{_settings.POSTGRES_USER}:{_settings.POSTGRES_PASSWORD}@{_settings.POSTGRES_HOST}:{_settings.POSTGRES_PORT}/{_settings.POSTGRES_DB}"

settings = _settings
