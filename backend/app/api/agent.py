"""
Agentic AI assistant API endpoints.

Provides a conversational agent that can perform platform actions on behalf of users
via natural language, with a confirmation step for write operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.agent_service import (
    process_message,
    confirm_action,
    cancel_action,
    clear_session,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(..., min_length=1, max_length=100)


class PendingActionResponse(BaseModel):
    action_id: str
    tool_name: str
    description: str
    parameters: Dict[str, Any]


class AgentChatResponse(BaseModel):
    message: str
    pending_action: Optional[PendingActionResponse] = None
    session_id: str


class AgentConfirmRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    action_id: str = Field(..., min_length=1, max_length=100)


class AgentConfirmResponse(BaseModel):
    message: str
    session_id: str


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    body: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI agent. Returns a response and optionally a pending action for confirmation."""
    result = await process_message(
        session_id=body.session_id,
        user_message=body.message,
        user=current_user,
        db=db,
    )
    return AgentChatResponse(**result)


@router.post("/confirm", response_model=AgentConfirmResponse)
async def agent_confirm(
    body: AgentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Confirm and execute a pending action."""
    result = await confirm_action(
        session_id=body.session_id,
        action_id=body.action_id,
        user=current_user,
        db=db,
    )
    return AgentConfirmResponse(**result)


@router.post("/cancel", response_model=AgentConfirmResponse)
async def agent_cancel(
    body: AgentConfirmRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a pending action."""
    result = await cancel_action(
        session_id=body.session_id,
        action_id=body.action_id,
        user=current_user,
    )
    return AgentConfirmResponse(**result)


@router.delete("/session")
async def agent_clear_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Clear conversation history for a session."""
    clear_session(session_id)
    return {"message": "Session cleared", "session_id": session_id}
