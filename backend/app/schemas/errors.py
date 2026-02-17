"""
Standardized error response schemas
"""
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime


class ErrorDetail(BaseModel):
    """Detailed error information"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standardized error response format"""
    success: bool = False
    error: str
    message: str
    status_code: int
    details: Optional[List[ErrorDetail]] = None
    timestamp: datetime = None
    path: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "ValidationError",
                "message": "Invalid input data",
                "status_code": 400,
                "details": [
                    {
                        "field": "email",
                        "message": "Invalid email format",
                        "code": "INVALID_EMAIL"
                    }
                ],
                "timestamp": "2026-02-16T22:00:00Z",
                "path": "/api/users"
            }
        }


class SuccessResponse(BaseModel):
    """Standardized success response format"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation completed successfully",
                "data": {}
            }
        }
