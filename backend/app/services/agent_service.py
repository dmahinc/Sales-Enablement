"""
Agentic AI assistant service.

Manages conversation sessions, orchestrates the AI tool-calling loop, and handles
the confirmation flow for write operations.
"""
import json
import logging
import re
import uuid
import time
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.user import User
from app.models.material import Material
from app.services.ai_service import chat_completion_with_tools
from app.services.agent_tools import (
    get_tools_for_role,
    is_readonly_tool,
    execute_tool,
    build_human_description,
)

logger = logging.getLogger(__name__)

SESSION_TTL_SECONDS = 3600  # 1 hour
MAX_SESSIONS = 500

SYSTEM_PROMPT_TEMPLATE = """You are an AI assistant embedded in the OVHcloud Product Enablement & Customer Engagement Platform. You help users perform actions through natural language.

Current user: {user_name} (role: {user_role}, email: {user_email})

## Your Capabilities
You have extensive access to the platform through tools: search materials, check engagement/downloads, view analytics, manage requests, share content, and more.

## Guidelines
- Be concise and helpful. Use short sentences.
- When searching, use the search_materials tool rather than guessing.
- **IMPORTANT**: When the user mentions a material name (even if they give an exact filename), ALWAYS search for it first using search_materials. The search is flexible and matches words regardless of order, spacing, or capitalization.
- When the user refers to a customer or material by name, search first to find the correct ID.
- **SHARING**: When sharing a material, use the EXACT customer email the user specified (e.g. damien.mahinc@gmail.com). Never use the current user's own email — that is the sales person, not the recipient.
- **SENDING MESSAGES**: When the user asks to tell/notify someone, call send_message_to_customer with customer_email (e.g. laetitia.fauquembergue@gmail.com) or customer_name (e.g. "Laetitia Arlogis") — NOT customer_id, as IDs can be wrong. If you have the email from get_conversations, use customer_email. The user will confirm before sending.
- **ENGAGEMENT TRACKING**: check_customer_engagement is ONLY for questions like "Did X view/download the document?" — NOT for sending messages. Use it when the user asks about views, downloads, or engagement. Do NOT use it when the user wants to send a message to someone.
- Always confirm the details before performing write actions — the system will ask the user to confirm.
- For read-only operations (search, list, check engagement, stats), execute them directly and summarize the results.
- Format results clearly. Use bullet points for lists.
- If a tool call fails, explain the error and suggest alternatives.
- Never invent data — only return what the tools provide.
- If a search returns no results, try searching with different keyword combinations or partial words before giving up.
- If you're unsure which material or customer the user means, ask for clarification.

## Role-Specific Context
{role_context}
"""

ROLE_CONTEXTS = {
    "sales": """As a Sales assistant, you can:
- Search and explore materials (datasheets, sales decks, product briefs, etc.)
- Get executive summaries of materials
- Check customer engagement: see if a customer viewed or downloaded a shared material (use check_customer_engagement — only for engagement questions, NOT for sending messages)
- View sharing statistics and usage analytics
- Request new materials from the PMM team
- Share materials with your customers via secure links
- Send messages to your customers: use list_my_customers then send_message_to_customer (with customer_name like "Laetitia Arlogis" when applicable)
- View your material requests, shared materials, and notifications
- Browse enablement tracks, product releases, and marketing updates
- Get a dashboard summary of your key metrics
- Search materials by use case or pain point
- List products in the OVHcloud portfolio""",

    "pmm": """As a PMM (Product Marketing Manager) assistant, you can:
- Search and manage materials, get executive summaries
- Check customer engagement on shared materials
- View sharing stats and usage analytics
- View and manage material requests from the sales team
- Acknowledge, deliver, close, or reopen requests
- List PMM users for request assignment
- Check material health and freshness
- View notifications, product releases, and marketing updates
- Get a dashboard summary""",

    "director": """As a Director assistant, you have all PMM capabilities plus:
- Share materials with customers
- Full oversight of all material requests
- Assign requests to any PMM user""",

    "admin": """As an Admin assistant, you have full access to all platform capabilities.""",

    "customer": """As a Customer assistant, you can:
- Browse shared materials, product releases, and marketing updates
- Get executive summaries of materials
- List your sales contacts (OVHcloud team members who shared materials with you)
- Send messages to your sales contacts (e.g. to thank them for a document)
- View notifications and your dashboard
When the customer asks to thank someone or send a message, use list_my_sales_contacts to find the right contact, then send_message_to_sales_contact to send the message. Always call the send tool — never respond 'Done' without actually sending. The user will be asked to confirm before the message is sent.""",
}


@dataclass
class PendingAction:
    action_id: str
    tool_name: str
    tool_call_id: str
    parameters: Dict[str, Any]
    description: str
    ai_messages_snapshot: List[Dict[str, Any]]


@dataclass
class AgentSession:
    session_id: str
    user_id: int
    messages: List[Dict[str, Any]] = field(default_factory=list)
    pending_action: Optional[PendingAction] = None
    last_active: float = field(default_factory=time.time)


_sessions: Dict[str, AgentSession] = {}


def _cleanup_expired():
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s.last_active > SESSION_TTL_SECONDS]
    for sid in expired:
        del _sessions[sid]
    if len(_sessions) > MAX_SESSIONS:
        sorted_sessions = sorted(_sessions.items(), key=lambda x: x[1].last_active)
        for sid, _ in sorted_sessions[: len(_sessions) - MAX_SESSIONS]:
            del _sessions[sid]


def _detect_send_message_intent(text: str, role: Optional[str]) -> Optional[Dict[str, Any]]:
    """Detect 'dis à X que Y' / 'tell X that Y' and return tool params, or None."""
    t = (text or "").strip()
    if len(t) < 10:
        return None
    role = (role or "sales").lower()
    if role not in ("sales", "director", "pmm", "admin", "user"):
        return None
    # Normalize: collapse multiple spaces, handle various "a" accents
    t_norm = re.sub(r"\s+", " ", t)
    patterns = [
        r"^(?:dis|dit)\s+[aàáâä]\s+(.+?)\s+que\s+(.+)$",  # dis/dit à X que Y
        r"^(?:dis|dit)\s+[aàáâä]\s+(.+?)\s*[:\-]\s*(.+)$",  # dis à X : Y
        r"^(?:écris|écrire)\s+[aàáâä]\s+(.+?)\s+que\s+(.+)$",  # écris à X que Y
        r"^(?:écris|écrire)\s+[aàáâä]\s+(.+?)\s*[:\-]\s*(.+)$",  # écris à X : Y
        r"^(?:préviens|prévenir)\s+(.+?)\s+que\s+(.+)$",  # préviens X que Y
        r"^tell\s+(.+?)\s+that\s+(.+)$",  # tell X that Y
        r"^(?:envoie|envoyer)\s+(?:un\s+)?message\s+[aàáâä]\s+(.+?)\s*[:\-]\s*(.+)$",  # envoie message à X : Y
    ]
    for pat in patterns:
        m = re.match(pat, t_norm, re.IGNORECASE | re.DOTALL)
        if m:
            recipient = m.group(1).strip()
            msg = m.group(2).strip()
            if recipient and msg:
                return {
                    "tool_name": "send_message_to_customer",
                    "params": {"customer_name": recipient, "message": msg},
                }
    return None


def _detect_share_material_intent(
    text: str, role: Optional[str], user: User, db: Session
) -> Optional[Dict[str, Any]]:
    """Detect 'envoie à X le/la Y' (share material) and return tool params if material and customer found."""
    t = (text or "").strip()
    if len(t) < 15:
        return None
    role = (role or "sales").lower()
    if role not in ("sales", "director", "admin"):
        return None
    t_norm = re.sub(r"\s+", " ", t)
    # envoie à X le Y / envoie à X la Y / envoie à X le Y de la Z
    m = re.match(
        r"^(?:envoie|envoyer)\s+[aàáâä]\s+(.+?)\s+(?:le|la)\s+(.+)$",
        t_norm,
        re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return None
    recipient_raw = m.group(1).strip()
    material_desc = m.group(2).strip()
    if not recipient_raw or not material_desc:
        return None
    # Find customer by name (from user's assigned/created customers)
    customers = db.query(User).filter(
        and_(
            User.role == "customer",
            or_(
                User.assigned_sales_id == user.id,
                User.created_by_id == user.id,
            ),
        )
    ).all()
    parts = [p.strip().lower() for p in recipient_raw.split() if p.strip()]
    customer = None
    for c in customers:
        fn = (c.full_name or "").lower()
        if all(p in fn for p in parts):
            customer = c
            break
    if not customer:
        return None
    # Search material by keywords (normalize: "Sales Deck de la Data Platform" -> "Sales Deck Data Platform")
    mat_keywords = re.sub(r"\b(?:de|du|la|le|des|les)\b", "", material_desc, flags=re.IGNORECASE)
    mat_keywords = " ".join(mat_keywords.split())
    if not mat_keywords:
        mat_keywords = material_desc
    words = [w for w in mat_keywords.split() if len(w) > 2]
    if not words:
        return None
    like_conds = [
        or_(
            Material.name.ilike(f"%{w}%"),
            Material.file_name.ilike(f"%{w}%"),
            Material.product_name.ilike(f"%{w}%"),
        )
        for w in words
    ]
    mat = db.query(Material).filter(
        Material.status.in_(["published", "PUBLISHED"]),
        and_(*like_conds),
    ).order_by(desc(Material.created_at)).first()
    if not mat and len(words) > 2:
        # Fallback: try with fewer words (e.g. "Sales Deck" if "Data Platform" typo)
        like_conds = [
            or_(
                Material.name.ilike(f"%{w}%"),
                Material.file_name.ilike(f"%{w}%"),
                Material.product_name.ilike(f"%{w}%"),
            )
            for w in words[:2]
        ]
        mat = db.query(Material).filter(
            Material.status.in_(["published", "PUBLISHED"]),
            and_(*like_conds),
        ).order_by(desc(Material.created_at)).first()
    if not mat:
        return None
    return {
        "tool_name": "share_material_with_customer",
        "params": {
            "material_id": mat.id,
            "customer_email": customer.email,
            "customer_name": customer.full_name,
        },
    }


def get_or_create_session(session_id: str, user_id: int) -> AgentSession:
    _cleanup_expired()
    session = _sessions.get(session_id)
    if session and session.user_id == user_id:
        session.last_active = time.time()
        return session
    session = AgentSession(session_id=session_id, user_id=user_id)
    _sessions[session_id] = session
    return session


def clear_session(session_id: str):
    _sessions.pop(session_id, None)


def _build_system_prompt(user: User) -> str:
    role = user.role or "sales"
    return SYSTEM_PROMPT_TEMPLATE.format(
        user_name=user.full_name or user.email,
        user_role=role,
        user_email=user.email,
        role_context=ROLE_CONTEXTS.get(role, ROLE_CONTEXTS.get("sales", "You have basic access.")),
    )


async def process_message(
    session_id: str,
    user_message: str,
    user: User,
    db: Session,
) -> Dict[str, Any]:
    """
    Process a user message through the agentic loop.

    Returns dict with keys: message, pending_action (optional), session_id
    """
    session = get_or_create_session(session_id, user.id)

    if session.pending_action:
        return {
            "message": (
                "You have a pending action awaiting confirmation. "
                "Please confirm or cancel it before sending a new request."
            ),
            "pending_action": {
                "action_id": session.pending_action.action_id,
                "tool_name": session.pending_action.tool_name,
                "description": session.pending_action.description,
                "parameters": session.pending_action.parameters,
            },
            "session_id": session_id,
        }

    session.messages.append({"role": "user", "content": user_message})

    # Rule-based intent: "dis à X que Y" / "tell X that Y" -> send_message (bypasses unreliable AI)
    send_intent = _detect_send_message_intent(user_message, user.role)
    if send_intent:
        tool_name = send_intent["tool_name"]
        params = send_intent["params"]
        desc = build_human_description(tool_name, params, user, db)
        session.pending_action = PendingAction(
            action_id=str(uuid.uuid4()),
            tool_name=tool_name,
            tool_call_id="rule-based",
            parameters=params,
            description=desc,
            ai_messages_snapshot=list(session.messages),
        )
        return {
            "message": f"Je vais envoyer ce message à {params.get('customer_name', params.get('sales_contact_id', '?'))} : « {params.get('message', '')[:60]}{'…' if len(params.get('message', '')) > 60 else ''} ». Confirmez pour envoyer.",
            "pending_action": {
                "action_id": session.pending_action.action_id,
                "tool_name": tool_name,
                "description": desc,
                "parameters": params,
            },
            "session_id": session_id,
        }

    # Rule-based intent: "envoie à X le/la Y" -> share_material (bypasses AI)
    try:
        share_intent = _detect_share_material_intent(user_message, user.role, user, db)
    except Exception as e:
        logger.warning("Share intent detection failed: %s", e)
        share_intent = None
    if share_intent:
        tool_name = share_intent["tool_name"]
        params = share_intent["params"]
        desc = build_human_description(tool_name, params, user, db)
        session.pending_action = PendingAction(
            action_id=str(uuid.uuid4()),
            tool_name=tool_name,
            tool_call_id="rule-based",
            parameters=params,
            description=desc,
            ai_messages_snapshot=list(session.messages),
        )
        return {
            "message": f"Je vais partager le document avec {params.get('customer_name', params.get('customer_email', '?'))}. Confirmez pour envoyer le lien.",
            "pending_action": {
                "action_id": session.pending_action.action_id,
                "tool_name": tool_name,
                "description": desc,
                "parameters": params,
            },
            "session_id": session_id,
        }

    # Keep history bounded (last 30 messages)
    if len(session.messages) > 30:
        session.messages = session.messages[-30:]

    system_prompt = _build_system_prompt(user)
    tools = get_tools_for_role(user.role or "sales")

    ai_response = await chat_completion_with_tools(
        messages=session.messages,
        system_prompt=system_prompt,
        tools=tools,
        max_tokens=1024,
        temperature=0.3,
    )

    if ai_response is None:
        fallback = "I'm sorry, the AI service is currently unavailable. Please try again later."
        session.messages.append({"role": "assistant", "content": fallback})
        return {"message": fallback, "pending_action": None, "session_id": session_id}

    tool_calls = ai_response.get("tool_calls")
    text_content = ai_response.get("content") or ""

    if not tool_calls:
        session.messages.append({"role": "assistant", "content": text_content})
        return {"message": text_content, "pending_action": None, "session_id": session_id}

    # Process tool calls
    # Add the assistant message with tool_calls to history
    session.messages.append({
        "role": "assistant",
        "content": text_content or None,
        "tool_calls": tool_calls,
    })

    # Process each tool call — execute read-only ones, queue write ones for confirmation
    for tc in tool_calls:
        fn_name = tc["function"]["name"]
        try:
            fn_params = json.loads(tc["function"]["arguments"])
        except (json.JSONDecodeError, KeyError):
            fn_params = {}
        tc_id = tc.get("id", str(uuid.uuid4()))

        if is_readonly_tool(fn_name):
            success, result_text = execute_tool(fn_name, fn_params, user, db)
            session.messages.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "name": fn_name,
                "content": result_text,
            })
        else:
            # Write operation — pause and ask for confirmation
            desc = build_human_description(fn_name, fn_params, user, db)
            session.pending_action = PendingAction(
                action_id=str(uuid.uuid4()),
                tool_name=fn_name,
                tool_call_id=tc_id,
                parameters=fn_params,
                description=desc,
                ai_messages_snapshot=list(session.messages),
            )

            confirmation_msg = text_content or f"I'd like to: **{desc}**"
            return {
                "message": confirmation_msg,
                "pending_action": {
                    "action_id": session.pending_action.action_id,
                    "tool_name": fn_name,
                    "description": desc,
                    "parameters": fn_params,
                },
                "session_id": session_id,
            }

    # All tool calls were read-only — get the AI's final response
    final_response = await chat_completion_with_tools(
        messages=session.messages,
        system_prompt=system_prompt,
        tools=tools,
        max_tokens=1024,
        temperature=0.3,
    )

    if final_response:
        final_text = final_response.get("content") or "Done."
        # Check if the AI wants to call more tools
        more_tool_calls = final_response.get("tool_calls")
        if more_tool_calls:
            session.messages.append({
                "role": "assistant",
                "content": final_text or None,
                "tool_calls": more_tool_calls,
            })
            for tc in more_tool_calls:
                fn_name = tc["function"]["name"]
                try:
                    fn_params = json.loads(tc["function"]["arguments"])
                except (json.JSONDecodeError, KeyError):
                    fn_params = {}
                tc_id = tc.get("id", str(uuid.uuid4()))

                if is_readonly_tool(fn_name):
                    success, result_text = execute_tool(fn_name, fn_params, user, db)
                    session.messages.append({
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "name": fn_name,
                        "content": result_text,
                    })
                else:
                    desc = build_human_description(fn_name, fn_params, user, db)
                    session.pending_action = PendingAction(
                        action_id=str(uuid.uuid4()),
                        tool_name=fn_name,
                        tool_call_id=tc_id,
                        parameters=fn_params,
                        description=desc,
                        ai_messages_snapshot=list(session.messages),
                    )
                    return {
                        "message": final_text or f"I'd like to: **{desc}**",
                        "pending_action": {
                            "action_id": session.pending_action.action_id,
                            "tool_name": fn_name,
                            "description": desc,
                            "parameters": fn_params,
                        },
                        "session_id": session_id,
                    }

            # Get yet another response after processing these tool calls
            final_response2 = await chat_completion_with_tools(
                messages=session.messages,
                system_prompt=system_prompt,
                tools=tools,
                max_tokens=1024,
                temperature=0.3,
            )
            if final_response2:
                final_text = final_response2.get("content") or "Done."

        session.messages.append({"role": "assistant", "content": final_text})
    else:
        final_text = "I processed your request but couldn't generate a summary."
        session.messages.append({"role": "assistant", "content": final_text})

    return {"message": final_text, "pending_action": None, "session_id": session_id}


async def confirm_action(
    session_id: str,
    action_id: str,
    user: User,
    db: Session,
) -> Dict[str, Any]:
    """Execute a confirmed pending action and return the AI's follow-up response."""
    session = _sessions.get(session_id)
    if not session or session.user_id != user.id:
        return {"message": "Session not found or expired.", "session_id": session_id}

    pa = session.pending_action
    if not pa or pa.action_id != action_id:
        return {"message": "No matching pending action found.", "session_id": session_id}

    success, result_text = execute_tool(pa.tool_name, pa.parameters, user, db)

    session.messages.append({
        "role": "tool",
        "tool_call_id": pa.tool_call_id,
        "name": pa.tool_name,
        "content": result_text,
    })
    session.pending_action = None

    system_prompt = _build_system_prompt(user)
    tools = get_tools_for_role(user.role or "sales")

    final_response = await chat_completion_with_tools(
        messages=session.messages,
        system_prompt=system_prompt,
        tools=tools,
        max_tokens=1024,
        temperature=0.3,
    )

    if final_response:
        final_text = final_response.get("content") or result_text
    else:
        final_text = result_text

    session.messages.append({"role": "assistant", "content": final_text})
    return {"message": final_text, "session_id": session_id}


async def cancel_action(
    session_id: str,
    action_id: str,
    user: User,
) -> Dict[str, Any]:
    """Cancel a pending action."""
    session = _sessions.get(session_id)
    if not session or session.user_id != user.id:
        return {"message": "Session not found or expired.", "session_id": session_id}

    pa = session.pending_action
    if not pa or pa.action_id != action_id:
        return {"message": "No matching pending action found.", "session_id": session_id}

    # Remove the tool_calls message from history so we don't confuse the AI
    if session.messages and session.messages[-1].get("tool_calls"):
        session.messages.pop()

    session.pending_action = None

    cancel_msg = "Understood, I've cancelled the action. How else can I help?"
    session.messages.append({"role": "assistant", "content": cancel_msg})
    return {"message": cancel_msg, "session_id": session_id}
