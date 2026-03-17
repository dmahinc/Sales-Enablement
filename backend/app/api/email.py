"""
Email API - SMTP status and test endpoints
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email", tags=["email"])


class EmailStatusResponse(BaseModel):
    enabled: bool
    configured: bool
    host: str
    port: int
    from_email: str
    message: str


class EmailTestRequest(BaseModel):
    to_email: EmailStr


class EmailTestResponse(BaseModel):
    success: bool
    message: str


@router.get("/status", response_model=EmailStatusResponse)
async def get_email_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get SMTP configuration status (admin/pmm/director only)."""
    if current_user.role not in ("admin", "pmm", "director"):
        raise HTTPException(status_code=403, detail="Admin access required")

    enabled = getattr(settings, "SMTP_ENABLED", False)
    host = getattr(settings, "SMTP_HOST", "") or ""
    port = getattr(settings, "SMTP_PORT", 587)
    user = getattr(settings, "SMTP_USER", "") or ""
    password = getattr(settings, "SMTP_PASSWORD", "") or ""
    from_email = getattr(settings, "SMTP_FROM_EMAIL", "") or ""

    configured = bool(host and user and password)

    if not enabled:
        message = "SMTP is disabled (SMTP_ENABLED=false). Set SMTP_ENABLED=true in backend/.env"
    elif not configured:
        message = "SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in backend/.env"
    else:
        message = "SMTP is configured and ready"

    return EmailStatusResponse(
        enabled=enabled,
        configured=configured,
        host=host or "(not set)",
        port=port,
        from_email=from_email or "(not set)",
        message=message,
    )


@router.post("/test", response_model=EmailTestResponse)
async def test_email(
    body: EmailTestRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a test email (admin/pmm/director only)."""
    if current_user.role not in ("admin", "pmm", "director"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.core.email import send_email_or_raise

    html = """
    <h2>Test Email - Sales Enablement Platform</h2>
    <p>This is a test email to verify SMTP configuration.</p>
    <p>If you received this, email notifications are working correctly.</p>
    """
    try:
        send_email_or_raise(
            to_email=body.to_email,
            subject="[Test] Sales Enablement - SMTP Configuration",
            html_body=html,
            text_body="Test email - SMTP is working.",
        )
        return EmailTestResponse(success=True, message=f"Test email sent to {body.to_email}")
    except Exception as e:
        return EmailTestResponse(success=False, message=f"SMTP error: {str(e)}")
