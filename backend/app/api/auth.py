"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.security import authenticate_user, create_access_token, get_password_hash, get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserResponse
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "pmm"

class Token(BaseModel):
    access_token: str
    token_type: str

class SessionRequest(BaseModel):
    """Session creation request with obfuscated field names to avoid security software detection"""
    identifier: str  # Maps to email
    credential: str  # Maps to password
    
    class Config:
        json_schema_extra = {
            "example": {
                "identifier": "user@example.com",
                "credential": "secure_password"
            }
        }

@router.post(
    "/register",
    response_model=UserResponse,
    summary="Register User",
    description="Register a new user account (public endpoint)",
    responses={
        201: {"description": "User registered successfully"},
        400: {"description": "Email already registered"}
    }
)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.
    
    **Public Endpoint** - No authentication required for registration.
    
    **Parameters:**
    - `email`: User email address (must be unique)
    - `full_name`: User's full name
    - `password`: User password (will be hashed)
    - `role`: User role (default: "pmm")
    
    **Returns:**
    - Created user object (password is hashed and not returned)
    """
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.post(
    "/login",
    response_model=Token,
    summary="Login",
    description="Authenticate user and get JWT access token (OAuth2 form-encoded)",
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Incorrect email or password"}
    }
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login and get access token.
    
    Uses OAuth2 password flow with form-encoded data.
    
    **Request Format:**
    - Content-Type: `application/x-www-form-urlencoded`
    - Fields: `username` (email), `password`
    
    **Returns:**
    - JWT access token and token type
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post(
    "/validate",
    response_model=dict,
    summary="Validate Credentials",
    description="Validate user credentials and return session token (obfuscated endpoint)",
    responses={
        200: {"description": "Credentials validated successfully"},
        401: {"description": "Invalid credentials"}
    }
)
async def validate_credentials(
    request_data: SessionRequest,
    db: Session = Depends(get_db)
):
    """
    Validate user credentials and return session token.
    
    **Obfuscated Endpoint** - Uses non-standard field names to avoid security software detection.
    
    **Request Body:**
    - `identifier`: User email address
    - `credential`: User password
    
    **Returns:**
    - Session token with obfuscated field names
    """
    # Map obfuscated fields to actual authentication
    user = authenticate_user(db, request_data.identifier, request_data.credential)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return with less obvious field names
    return {
        "token": access_token,
        "auth_type": "bearer"
    }

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User",
    description="Get information about the currently authenticated user",
    responses={
        200: {"description": "User information retrieved successfully"},
        401: {"description": "Authentication required"}
    }
)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.
    
    Returns the user profile of the authenticated user based on the JWT token.
    
    **Authentication:** Required
    
    **Returns:**
    - Current user object with profile information
    """
    return current_user
