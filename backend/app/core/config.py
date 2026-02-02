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
    
    # Authentication
    SECRET_KEY: str = Field(..., description="Secret key for JWT tokens. MUST be set in environment.")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (default)
    
    class Config:
        env_file = ".env"

settings = Settings()
