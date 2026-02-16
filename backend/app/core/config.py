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
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/sales_enablement"
    
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
    OVH_AI_MODEL: str = Field(default="Mistral-Small-3.2-24B-Instruct-2506", description="AI model to use")
    OVH_AI_CONFIDENCE_THRESHOLD: float = Field(default=0.9, description="Confidence threshold for auto-apply (0.0-1.0)")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Create settings instance
_settings = Settings()

# Override with .env file values (prioritize .env over environment variables)
env_file_path = Path(".env")
if env_file_path.exists():
    with open(env_file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                # Force override with .env values for OVH_AI settings and other config
                if key.startswith("OVH_AI_"):
                    # Handle boolean values
                    if key == "OVH_AI_ENABLED":
                        setattr(_settings, key, value.lower() in ("true", "1", "yes"))
                    else:
                        setattr(_settings, key, value)
                elif key == "SECRET_KEY":
                    setattr(_settings, key, value)

settings = _settings
