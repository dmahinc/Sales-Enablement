"""
Custom exception classes and handlers for standardized error responses
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from datetime import datetime
from typing import Optional, List
from app.schemas.errors import ErrorResponse, ErrorDetail


class AppException(Exception):
    """Base exception for application-specific errors"""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        details: Optional[List[ErrorDetail]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or []
        super().__init__(self.message)


class NotFoundError(AppException):
    """Resource not found exception"""
    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND"
        )


class ValidationError(AppException):
    """Validation error exception"""
    def __init__(self, message: str, details: Optional[List[ErrorDetail]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details=details
        )


class UnauthorizedError(AppException):
    """Unauthorized access exception"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED"
        )


class ForbiddenError(AppException):
    """Forbidden access exception"""
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN"
        )


class ConflictError(AppException):
    """Resource conflict exception"""
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT"
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            error=exc.error_code or exc.__class__.__name__,
            message=exc.message,
            status_code=exc.status_code,
            details=exc.details,
            timestamp=datetime.utcnow(),
            path=str(request.url.path)
        ).model_dump(mode='json', exclude_none=True)
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions with standardized format"""
    error_response = ErrorResponse(
        success=False,
        error=exc.__class__.__name__,
        message=str(exc.detail) if exc.detail else "An error occurred",
        status_code=exc.status_code,
        timestamp=datetime.utcnow(),
        path=str(request.url.path)
    )
    # Convert to dict and ensure datetime is serialized as ISO string
    response_dict = error_response.model_dump(mode='json', exclude_none=True)
    if 'timestamp' in response_dict and response_dict['timestamp']:
        if isinstance(response_dict['timestamp'], datetime):
            response_dict['timestamp'] = response_dict['timestamp'].isoformat() + 'Z'
    return JSONResponse(
        status_code=exc.status_code,
        content=response_dict
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation errors with detailed field information"""
    details = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error.get("loc", []))
        details.append(
            ErrorDetail(
                field=field if field != "body" else None,
                message=error.get("msg", "Validation error"),
                code=error.get("type", "VALIDATION_ERROR")
            )
        )
    
    error_response = ErrorResponse(
        success=False,
        error="ValidationError",
        message="Request validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=details,
        timestamp=datetime.utcnow(),
        path=str(request.url.path)
    )
    # Convert to dict and ensure datetime is serialized as ISO string
    response_dict = error_response.model_dump(mode='json', exclude_none=True)
    if 'timestamp' in response_dict and response_dict['timestamp']:
        if isinstance(response_dict['timestamp'], datetime):
            response_dict['timestamp'] = response_dict['timestamp'].isoformat() + 'Z'
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_dict
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    error_response = ErrorResponse(
        success=False,
        error="InternalServerError",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        timestamp=datetime.utcnow(),
        path=str(request.url.path)
    )
    # Convert to dict and ensure datetime is serialized as ISO string
    response_dict = error_response.model_dump(mode='json', exclude_none=True)
    if 'timestamp' in response_dict and response_dict['timestamp']:
        if isinstance(response_dict['timestamp'], datetime):
            response_dict['timestamp'] = response_dict['timestamp'].isoformat() + 'Z'
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_dict
    )
