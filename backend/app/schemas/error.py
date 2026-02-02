"""
Standard error response schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class ErrorDetail(BaseModel):
    """Error detail model"""
    detail: str
    code: Optional[str] = None
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: ErrorDetail
    timestamp: Optional[str] = None
    path: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "detail": "Resource not found",
                    "code": "NOT_FOUND",
                    "field": None
                },
                "timestamp": "2026-02-02T10:00:00Z",
                "path": "/api/materials/999"
            }
        }


class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    error: ErrorDetail
    validation_errors: Optional[Dict[str, Any]] = None
