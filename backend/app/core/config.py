"""
Application configuration
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Sales Enablement API"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/sales_enablement"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"]
    
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
    
    class Config:
        env_file = ".env"

settings = Settings()
