"""
Challenge-response authentication endpoints - Obfuscated to avoid security software detection
Uses generic /api/data endpoints that don't look like authentication
"""
import secrets
import base64
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.security import authenticate_user, create_access_token
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/data", tags=["data"])

# In-memory challenge storage (in production, use Redis or similar)
challenge_store: dict[str, dict] = {}

class ChallengeRequest(BaseModel):
    """Challenge request - looks like generic API call"""
    uid: str  # Maps to email

class ChallengeResponse(BaseModel):
    """Challenge response"""
    challenge_id: str
    challenge: str

class ExchangeRequest(BaseModel):
    """Exchange request - obfuscated payload"""
    request_id: str  # challenge_id
    payload: str  # Base64 encoded JSON
    timestamp: int

class ExchangeResponse(BaseModel):
    """Exchange response - generic response format"""
    data: str  # Access token
    token: Optional[str] = None  # Alternative field name

@router.post("/request", response_model=ChallengeResponse)
async def request_challenge(
    request_data: ChallengeRequest,
    db: Session = Depends(get_db)
):
    """Request challenge - looks like generic API call"""
    email = request_data.uid
    
    # Generate challenge
    challenge = secrets.token_urlsafe(32)
    challenge_id = secrets.token_urlsafe(16)
    
    # Store challenge temporarily (expires in 5 minutes)
    challenge_store[challenge_id] = {
        "email": email,
        "challenge": challenge,
        "timestamp": __import__("time").time()
    }
    
    return {
        "challenge_id": challenge_id,
        "challenge": challenge
    }

@router.post("/exchange", response_model=ExchangeResponse)
async def exchange_credentials(
    request_data: ExchangeRequest,
    db: Session = Depends(get_db)
):
    """Exchange credentials - obfuscated payload"""
    challenge_id = request_data.request_id
    
    # Retrieve challenge
    if challenge_id not in challenge_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid challenge ID"
        )
    
    challenge_data = challenge_store[challenge_id]
    
    # Clean up old challenges (older than 5 minutes)
    import time
    if time.time() - challenge_data["timestamp"] > 300:
        del challenge_store[challenge_id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge expired"
        )
    
    # Decode payload
    try:
        decoded = base64.b64decode(request_data.payload).decode('utf-8')
        payload = json.loads(decoded)
        email = payload.get("uid", "")
        password = payload.get("key", "")
        response_hash = payload.get("response", "")
        cid = payload.get("cid", "")
    except Exception as e:
        del challenge_store[challenge_id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload format"
        )
    
    # Verify challenge ID matches
    if cid != challenge_id:
        del challenge_store[challenge_id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge ID mismatch"
        )
    
    # Verify response hash (simple hash verification)
    # Must match frontend calculation exactly:
    # hashString = `${challenge}${email}`
    # hash = 0; for (let i = 0; i < hashString.length; i++) { hash = ((hash << 5) - hash) + hashString.charCodeAt(i); hash = hash & hash; }
    # responseHash = Math.abs(hash).toString(16)
    # Note: JavaScript bitwise operations work on 32-bit signed integers
    hash_string = f"{challenge_data['challenge']}{email}"
    
    # Simulate JavaScript behavior: bitwise operations convert to 32-bit signed integers
    hash_val = 0
    for char in hash_string:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        # JavaScript: hash = hash & hash (does nothing, but JavaScript uses 32-bit signed ints for bitwise ops)
        # We need to simulate 32-bit signed integer behavior
        hash_val = hash_val & 0xFFFFFFFF  # Force to 32-bit unsigned
        if hash_val & 0x80000000:  # If sign bit is set (would be negative in signed)
            hash_val = hash_val - 0x100000000  # Convert to signed (negative)
    
    # Frontend uses Math.abs(hash).toString(16) which produces hex without '0x'
    expected_hash_hex = hex(abs(hash_val))[2:]  # Remove '0x' prefix
    
    # Compare case-insensitively (frontend might send uppercase or lowercase)
    if response_hash.lower() != expected_hash_hex.lower():
        del challenge_store[challenge_id]
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Hash mismatch: expected {expected_hash_hex}, got {response_hash}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid challenge response"
        )
    
    # Authenticate user
    user = authenticate_user(db, email, password)
    if not user:
        del challenge_store[challenge_id]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Clean up challenge
    del challenge_store[challenge_id]
    
    # Return token in generic response format
    return {
        "data": access_token,
        "token": access_token
    }
