"""
Unit tests for security functions.
"""
import pytest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token
)


def test_password_hashing():
    """Test that passwords are hashed correctly."""
    password = "test_password_123"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert len(hashed) > 0
    assert hashed.startswith("$2b$")  # bcrypt hash format


def test_password_verification_success():
    """Test password verification with correct password."""
    password = "test_password_123"
    hashed = get_password_hash(password)
    
    assert verify_password(password, hashed) is True


def test_password_verification_failure():
    """Test password verification with incorrect password."""
    password = "test_password_123"
    wrong_password = "wrong_password"
    hashed = get_password_hash(password)
    
    assert verify_password(wrong_password, hashed) is False


def test_password_verification_different_hashes():
    """Test that same password produces different hashes (due to salt)."""
    password = "test_password_123"
    hashed1 = get_password_hash(password)
    hashed2 = get_password_hash(password)
    
    # Hashes should be different (due to random salt)
    assert hashed1 != hashed2
    
    # But both should verify correctly
    assert verify_password(password, hashed1) is True
    assert verify_password(password, hashed2) is True


def test_create_access_token():
    """Test JWT token creation."""
    data = {"sub": "test@ovhcloud.com"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


def test_verify_token_success():
    """Test token verification with valid token."""
    data = {"sub": "test@ovhcloud.com"}
    token = create_access_token(data)
    
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == "test@ovhcloud.com"


def test_verify_token_invalid():
    """Test token verification with invalid token."""
    invalid_token = "invalid.token.here"
    
    payload = verify_token(invalid_token)
    assert payload is None
