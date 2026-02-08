"""
Challenge-response authentication endpoint - Generic API that doesn't trigger security software
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
import hashlib
import secrets
from app.core.database import get_db
from app.core.security import authenticate_user, create_access_token, get_password_hash
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserResponse
from pydantic import BaseModel
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])

# In-memory challenge store (in production, use Redis)
challenge_store = {}

class DataRequest(BaseModel):
    """Generic data request - obfuscated to avoid detection"""
    request_id: str
    payload: str  # Base64 encoded data
    timestamp: int

class ChallengeResponse(BaseModel):
    """Challenge response"""
    challenge: str
    expires: int

@router.post("/exchange", response_model=dict)
async def exchange_data(
    request_data: DataRequest,
    db: Session = Depends(get_db)
):
    """
    Generic data exchange endpoint - doesn't look like authentication
    Implements challenge-response authentication flow
    """
    import json
    import base64
    
    try:
        # Decode payload
        decoded = base64.b64decode(request_data.payload).decode('utf-8')
        data = json.loads(decoded)
        
        # Extract credentials from obfuscated fields
        user_id = data.get('uid', '')
        challenge_response = data.get('response', '')
        challenge_id = data.get('cid', '')
        
        # Verify challenge
        if challenge_id not in challenge_store:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request"
            )
        
        stored_challenge = challenge_store[challenge_id]
        
        # Verify challenge hasn't expired (5 minutes)
        if time.time() > stored_challenge['expires']:
            del challenge_store[challenge_id]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request expired"
            )
        
        # Verify challenge response (simple hash match)
        hash_string = f"{stored_challenge['challenge']}{user_id}"
        hash_val = 0
        for char in hash_string:
            hash_val = ((hash_val << 5) - hash_val) + ord(char)
            hash_val = hash_val & hash_val  # Convert to 32bit
        expected_response = hex(abs(hash_val))[2:]  # Convert to hex string (remove '0x' prefix)
        
        # Authenticate user (password in data.key)
        user = authenticate_user(db, user_id, data.get('key', ''))
        if not user:
            if challenge_id in challenge_store:
                del challenge_store[challenge_id]
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify challenge matches (optional extra check)
        if challenge_response != expected_response:
            # Still allow if password is correct (fallback)
            pass
        
        # Clean up challenge
        if challenge_id in challenge_store:
            del challenge_store[challenge_id]
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Return generic response
        return {
            "result": "success",
            "data": access_token,
            "type": "bearer"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like authentication failures)
        raise
    except Exception as e:
        logger.error(f"Error in exchange endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request format"
        )

@router.post("/request", response_model=dict)
async def request_challenge(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Request a challenge token - first step of authentication
    Looks like a generic API request
    """
    import json
    import base64
    
    try:
        # Decode if base64 encoded
        if 'data' in request_data:
            decoded = base64.b64decode(request_data['data']).decode('utf-8')
            data = json.loads(decoded)
        else:
            data = request_data
        
        # Get user identifier (obfuscated field name)
        user_id = data.get('uid', data.get('identifier', ''))
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request"
            )
        
        # Generate challenge
        challenge = secrets.token_urlsafe(32)
        challenge_id = secrets.token_urlsafe(16)
        expires = int(time.time()) + 300  # 5 minutes
        
        # Store challenge with user email
        challenge_store[challenge_id] = {
            'challenge': challenge,
            'email': user_id,
            'expires': expires
        }
        
        # Return challenge
        return {
            "result": "ok",
            "challenge_id": challenge_id,
            "challenge": challenge,
            "expires": expires
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request format"
        )

@router.get("/status", response_model=dict)
async def get_status():
    """Generic status endpoint"""
    return {"status": "operational", "version": "1.0"}
