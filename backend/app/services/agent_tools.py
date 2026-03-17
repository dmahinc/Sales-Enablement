"""
Agent tool definitions and executors for the agentic AI assistant.

Each tool has:
- An OpenAI function-calling schema (get_tools_for_role)
- An executor function that performs the actual operation
- A flag indicating whether user confirmation is required
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func, text

from app.models.user import User
from app.models.material import Material
from app.models.material_request import MaterialRequest, MaterialRequestStatus, MaterialRequestCloseReason
from app.models.shared_link import SharedLink

logger = logging.getLogger(__name__)

READONLY_TOOLS = {
    "search_materials",
    "get_material_details",
    "list_my_sales_contacts",
    "list_my_customers",
    "list_my_requests",
    "list_shared_materials",
    "list_material_requests",
    "list_pmm_users",
    "check_customer_engagement",
    "get_sharing_stats",
    "get_executive_summary",
    "list_enablement_tracks",
    "get_track_details",
    "list_product_releases",
    "list_marketing_updates",
    "get_notifications",
    "get_dashboard_summary",
    "get_material_health",
    "list_products",
    "search_by_use_case",
    "get_conversations",
    "get_usage_analytics",
}

# ---------------------------------------------------------------------------
# Tool schema definitions (OpenAI function-calling format)
# ---------------------------------------------------------------------------

_SEARCH_MATERIALS = {
    "type": "function",
    "function": {
        "name": "search_materials",
        "description": "AI-powered semantic search for sales enablement materials (datasheets, decks, briefs). Use for document-related queries only. Do NOT use for finding people or sending messages — for 'tell X' or 'dis à X' requests, use list_my_customers + send_message_to_customer instead.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Natural language search query or keywords. Can be a full question like 'materials about data sovereignty for CTOs', partial words, product names, or material names. The search uses AI semantic matching when available, with keyword fallback."},
                "material_type": {"type": "string", "description": "Filter by type: product_brief, sales_enablement_deck, sales_deck, datasheet, product_portfolio, product_catalog, other"},
                "universe_name": {"type": "string", "description": "Filter by universe: Public Cloud, Private Cloud, Bare Metal, Hosting & Collaboration"},
                "limit": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": [],
        },
    },
}

_GET_MATERIAL_DETAILS = {
    "type": "function",
    "function": {
        "name": "get_material_details",
        "description": "Get detailed information about a specific material by its ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer", "description": "The material ID"},
            },
            "required": ["material_id"],
        },
    },
}

_LIST_MY_CUSTOMERS = {
    "type": "function",
    "function": {
        "name": "list_my_customers",
        "description": "List all customers assigned to you (or created by you). Use this when the user asks how many customers they have, who their customers are, or similar questions about their customer list.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

_LIST_MY_REQUESTS = {
    "type": "function",
    "function": {
        "name": "list_my_requests",
        "description": "List material requests created by the current sales user. Can filter by status.",
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {"type": "string", "description": "Filter by status: pending, acknowledged, delivered, closed"},
            },
            "required": [],
        },
    },
}

_LIST_SHARED_MATERIALS = {
    "type": "function",
    "function": {
        "name": "list_shared_materials",
        "description": "List materials shared with customers by the current user.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

_REQUEST_MATERIAL_FROM_PMM = {
    "type": "function",
    "function": {
        "name": "request_material_from_pmm",
        "description": "Create a material request to the PMM team. The sales user describes what material they need.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_type": {"type": "string", "description": "Type of material needed: product_brief, sales_enablement_deck, sales_deck, datasheet, product_portfolio, product_catalog, other"},
                "description": {"type": "string", "description": "Description of the material needed"},
                "priority": {"type": "string", "description": "Priority: low, medium, high, urgent", "default": "medium"},
                "use_case": {"type": "string", "description": "The use case or context for this material"},
            },
            "required": ["material_type", "description"],
        },
    },
}

_SHARE_MATERIAL_WITH_CUSTOMER = {
    "type": "function",
    "function": {
        "name": "share_material_with_customer",
        "description": "Share a material with a customer by creating a secure share link. CRITICAL: Use the EXACT email the user specified (e.g. damien.mahinc@gmail.com). Never use the current user's email - that is the sales person, not the customer.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer", "description": "ID of the material to share"},
                "customer_email": {"type": "string", "description": "The customer's email address - MUST be the exact email the user asked to share with (e.g. john@company.com), NOT the current user's email"},
                "customer_name": {"type": "string", "description": "Customer's name (optional)"},
                "expires_in_days": {"type": "integer", "description": "Number of days until link expires (default 90)", "default": 90},
            },
            "required": ["material_id", "customer_email"],
        },
    },
}

_SEND_MESSAGE_TO_CUSTOMER = {
    "type": "function",
    "function": {
        "name": "send_message_to_customer",
        "description": "Send a message to a customer. ALWAYS use customer_name (string) for the recipient name — e.g. customer_name: 'Laetitia Fauquembergue'. NEVER put a name in customer_id (customer_id must be an integer from list_my_customers). Use customer_email if you have it.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {"type": "string", "description": "Recipient name, e.g. 'Laetitia Fauquembergue'. Use this when the user mentions a person by name."},
                "customer_email": {"type": "string", "description": "Recipient email, e.g. laetitia.fauquembergue@gmail.com. Most reliable when known."},
                "customer_id": {"type": "integer", "description": "Only use when you have the exact numeric ID from list_my_customers. Do NOT use for names."},
                "message": {"type": "string", "description": "Message text to send"},
                "subject": {"type": "string", "description": "Message subject (optional)"},
            },
            "required": ["message"],
        },
    },
}

_LIST_MY_SALES_CONTACTS = {
    "type": "function",
    "function": {
        "name": "list_my_sales_contacts",
        "description": "List your sales contacts (OVHcloud team members who have shared materials with you). Use this to find who to send a thank-you or message to.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

_SEND_MESSAGE_TO_SALES_CONTACT = {
    "type": "function",
    "function": {
        "name": "send_message_to_sales_contact",
        "description": "Send a message to your sales contact (e.g. to thank them for a shared document). Use list_my_sales_contacts first to find the sales_contact_id if needed.",
        "parameters": {
            "type": "object",
            "properties": {
                "sales_contact_id": {"type": "integer", "description": "ID of the sales contact to message (from list_my_sales_contacts)"},
                "message": {"type": "string", "description": "Message text to send"},
                "subject": {"type": "string", "description": "Message subject (optional, e.g. 'Thank you for the Object Storage one-pager')"},
            },
            "required": ["sales_contact_id", "message"],
        },
    },
}

_LIST_MATERIAL_REQUESTS = {
    "type": "function",
    "function": {
        "name": "list_material_requests",
        "description": "List material requests. Can filter by status or show only requests assigned to the current PMM.",
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {"type": "string", "description": "Filter by status: pending, acknowledged, delivered, closed"},
                "assigned_to_me": {"type": "boolean", "description": "Only show requests assigned to me"},
            },
            "required": [],
        },
    },
}

_ACKNOWLEDGE_REQUEST = {
    "type": "function",
    "function": {
        "name": "acknowledge_request",
        "description": "Acknowledge a pending material request and assign it. As a PMM, it is auto-assigned to you.",
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {"type": "integer", "description": "The material request ID"},
                "eta_date": {"type": "string", "description": "Estimated delivery date (YYYY-MM-DD)"},
            },
            "required": ["request_id"],
        },
    },
}

_DELIVER_REQUEST = {
    "type": "function",
    "function": {
        "name": "deliver_request",
        "description": "Mark a material request as delivered by linking it to an existing material.",
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {"type": "integer", "description": "The material request ID"},
                "delivered_material_id": {"type": "integer", "description": "ID of the material being delivered"},
            },
            "required": ["request_id", "delivered_material_id"],
        },
    },
}

_CLOSE_REQUEST = {
    "type": "function",
    "function": {
        "name": "close_request",
        "description": "Close a material request with a reason.",
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {"type": "integer", "description": "The material request ID"},
                "close_reason": {"type": "string", "description": "Reason: already_exists, planned_later, not_planned"},
                "close_reason_details": {"type": "string", "description": "Additional details about the closure"},
                "existing_material_id": {"type": "integer", "description": "ID of existing material (required if reason is already_exists)"},
                "planned_date": {"type": "string", "description": "Planned date (YYYY-MM-DD, required if reason is planned_later)"},
            },
            "required": ["request_id", "close_reason"],
        },
    },
}

_REOPEN_REQUEST = {
    "type": "function",
    "function": {
        "name": "reopen_request",
        "description": "Reopen a previously closed material request.",
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {"type": "integer", "description": "The material request ID"},
            },
            "required": ["request_id"],
        },
    },
}

_LIST_PMM_USERS = {
    "type": "function",
    "function": {
        "name": "list_pmm_users",
        "description": "List PMM users available for request assignment.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

# --- NEW TOOLS ---

_CHECK_CUSTOMER_ENGAGEMENT = {
    "type": "function",
    "function": {
        "name": "check_customer_engagement",
        "description": "Check customer engagement: whether a customer viewed or downloaded shared materials. ONLY use for questions about views/downloads (e.g. 'Did X download?', 'Has Laetitia viewed the deck?'). Do NOT use when the user wants to SEND a message to someone — use list_my_customers + send_message_to_customer for that.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_email": {"type": "string", "description": "Customer email to filter engagement for"},
                "customer_name": {"type": "string", "description": "Customer name to search for (if email unknown)"},
                "material_id": {"type": "integer", "description": "Filter engagement for a specific material"},
                "event_type": {"type": "string", "description": "Filter by event: shared, viewed, downloaded"},
                "limit": {"type": "integer", "description": "Max events to return (default 20)", "default": 20},
            },
            "required": [],
        },
    },
}

_GET_SHARING_STATS = {
    "type": "function",
    "function": {
        "name": "get_sharing_stats",
        "description": "Get sharing statistics: total shares, active shares, total views, total downloads, unique customers. Can filter by date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "end_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
            },
            "required": [],
        },
    },
}

_GET_EXECUTIVE_SUMMARY = {
    "type": "function",
    "function": {
        "name": "get_executive_summary",
        "description": "Get or generate an AI executive summary of a material. Provides a structured overview including product description, target personas, use cases, and key benefits.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer", "description": "The material ID to summarize"},
            },
            "required": ["material_id"],
        },
    },
}

_LIST_ENABLEMENT_TRACKS = {
    "type": "function",
    "function": {
        "name": "list_enablement_tracks",
        "description": "List enablement (learning) tracks available on the platform.",
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {"type": "string", "description": "Filter by status"},
                "use_case": {"type": "string", "description": "Filter by use case"},
            },
            "required": [],
        },
    },
}

_GET_TRACK_DETAILS = {
    "type": "function",
    "function": {
        "name": "get_track_details",
        "description": "Get details of a specific enablement track, including its materials and steps.",
        "parameters": {
            "type": "object",
            "properties": {
                "track_id": {"type": "integer", "description": "The track ID"},
            },
            "required": ["track_id"],
        },
    },
}

_LIST_PRODUCT_RELEASES = {
    "type": "function",
    "function": {
        "name": "list_product_releases",
        "description": "List the latest product releases. Can filter by universe, category, or product.",
        "parameters": {
            "type": "object",
            "properties": {
                "universe_id": {"type": "integer", "description": "Filter by universe ID"},
                "product_id": {"type": "integer", "description": "Filter by product ID"},
            },
            "required": [],
        },
    },
}

_LIST_MARKETING_UPDATES = {
    "type": "function",
    "function": {
        "name": "list_marketing_updates",
        "description": "List the latest marketing updates. Can filter by category or priority.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Filter by category"},
                "priority": {"type": "string", "description": "Filter by priority"},
            },
            "required": [],
        },
    },
}

_GET_NOTIFICATIONS = {
    "type": "function",
    "function": {
        "name": "get_notifications",
        "description": "Get the user's notifications. Can filter to show only unread ones.",
        "parameters": {
            "type": "object",
            "properties": {
                "unread_only": {"type": "boolean", "description": "Only show unread notifications", "default": False},
            },
            "required": [],
        },
    },
}

_GET_DASHBOARD_SUMMARY = {
    "type": "function",
    "function": {
        "name": "get_dashboard_summary",
        "description": "Get a summary of the user's dashboard: key metrics, recent activity, and statistics.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

_GET_MATERIAL_HEALTH = {
    "type": "function",
    "function": {
        "name": "get_material_health",
        "description": "Get material health dashboard: freshness scores, materials needing updates, and quarterly review information.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer", "description": "Get health for a specific material (optional)"},
            },
            "required": [],
        },
    },
}

_LIST_PRODUCTS = {
    "type": "function",
    "function": {
        "name": "list_products",
        "description": "List products in the product hierarchy. Can filter by universe or category.",
        "parameters": {
            "type": "object",
            "properties": {
                "universe_id": {"type": "integer", "description": "Filter by universe ID"},
                "category_id": {"type": "integer", "description": "Filter by category ID"},
            },
            "required": [],
        },
    },
}

_SEARCH_BY_USE_CASE = {
    "type": "function",
    "function": {
        "name": "search_by_use_case",
        "description": "Search materials by use case, pain point, or discovery keywords. Good for finding materials for specific sales scenarios.",
        "parameters": {
            "type": "object",
            "properties": {
                "keywords": {"type": "string", "description": "Search keywords"},
                "use_case": {"type": "string", "description": "Specific use case to search for"},
                "pain_point": {"type": "string", "description": "Specific pain point to search for"},
            },
            "required": [],
        },
    },
}

_GET_CONVERSATIONS = {
    "type": "function",
    "function": {
        "name": "get_conversations",
        "description": "Get message conversations with customers. Shows unread count and last message.",
        "parameters": {
            "type": "object",
            "properties": {
                "search": {"type": "string", "description": "Search by customer name or email"},
            },
            "required": [],
        },
    },
}

_GET_USAGE_ANALYTICS = {
    "type": "function",
    "function": {
        "name": "get_usage_analytics",
        "description": "Get material usage analytics: most used materials, usage by type, downloads, views, and trends.",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Number of days to look back (default 30)", "default": 30},
            },
            "required": [],
        },
    },
}


def get_tools_for_role(role: str) -> List[Dict[str, Any]]:
    """Return the list of tool schemas available to a given role."""
    # Common tools available to all roles
    common_read = [
        _SEARCH_MATERIALS,
        _GET_MATERIAL_DETAILS,
        _GET_EXECUTIVE_SUMMARY,
        _LIST_ENABLEMENT_TRACKS,
        _GET_TRACK_DETAILS,
        _LIST_PRODUCT_RELEASES,
        _LIST_MARKETING_UPDATES,
        _GET_NOTIFICATIONS,
        _GET_DASHBOARD_SUMMARY,
        _LIST_PRODUCTS,
        _SEARCH_BY_USE_CASE,
        _GET_USAGE_ANALYTICS,
    ]

    if role in ("sales", "user"):
        return common_read + [
            _LIST_MY_CUSTOMERS,
            _LIST_MY_REQUESTS,
            _LIST_SHARED_MATERIALS,
            _CHECK_CUSTOMER_ENGAGEMENT,
            _GET_SHARING_STATS,
            _GET_CONVERSATIONS,
            _REQUEST_MATERIAL_FROM_PMM,
            _SHARE_MATERIAL_WITH_CUSTOMER,
            _SEND_MESSAGE_TO_CUSTOMER,
        ]
    elif role in ("pmm", "director", "admin"):
        tools = common_read + [
            _LIST_MY_CUSTOMERS,
            _LIST_MATERIAL_REQUESTS,
            _CHECK_CUSTOMER_ENGAGEMENT,
            _GET_SHARING_STATS,
            _GET_MATERIAL_HEALTH,
            _ACKNOWLEDGE_REQUEST,
            _DELIVER_REQUEST,
            _CLOSE_REQUEST,
            _REOPEN_REQUEST,
            _LIST_PMM_USERS,
        ]
        if role in ("director", "admin"):
            tools.append(_SHARE_MATERIAL_WITH_CUSTOMER)
        return tools
    elif role == "customer":
        return common_read + [
            _LIST_MY_SALES_CONTACTS,
            _SEND_MESSAGE_TO_SALES_CONTACT,
        ]
    return common_read


def is_readonly_tool(tool_name: str) -> bool:
    return tool_name in READONLY_TOOLS


# ---------------------------------------------------------------------------
# Tool executors
# ---------------------------------------------------------------------------

def execute_tool(
    tool_name: str,
    params: Dict[str, Any],
    user: User,
    db: Session,
) -> Tuple[bool, str]:
    """
    Execute a tool and return (success, result_text).
    result_text is a human-/AI-readable summary of the outcome.
    """
    executor = _EXECUTORS.get(tool_name)
    if not executor:
        return False, f"Unknown tool: {tool_name}"
    try:
        return executor(params, user, db)
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
        return False, f"Error executing {tool_name}: {str(e)}"


def _exec_search_materials(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    query = params.get("query", "")
    mat_type = params.get("material_type")
    universe = params.get("universe_name")
    limit = min(params.get("limit", 10), 20)

    # Try semantic search first
    if query:
        try:
            embedded_count = db.execute(
                text("SELECT count(*) FROM materials WHERE embedding_vec IS NOT NULL")
            ).scalar()
            if embedded_count and embedded_count > 0:
                import asyncio
                from app.services.embedding_service import embed_text
                
                # Handle async call from sync context
                # Check if there's a running event loop (FastAPI context)
                try:
                    loop = asyncio.get_running_loop()
                    # We're in an async context - run in a thread with new event loop
                    import concurrent.futures
                    def run_async():
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        try:
                            return new_loop.run_until_complete(embed_text(query))
                        finally:
                            new_loop.close()
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(run_async)
                        qvec = future.result(timeout=30)
                except RuntimeError:
                    # No event loop running - safe to use asyncio.run
                    qvec = asyncio.run(embed_text(query))
                
                vec_str = "[" + ",".join(f"{v:.8f}" for v in qvec) + "]"

                where_parts = ["embedding_vec IS NOT NULL", "status NOT IN ('draft', 'archived')"]
                sql_params: Dict = {"qvec": vec_str, "lim": limit}
                if mat_type:
                    where_parts.append("material_type ILIKE :mtype")
                    sql_params["mtype"] = f"%{mat_type}%"
                if universe:
                    where_parts.append("universe_name ILIKE :uni")
                    sql_params["uni"] = f"%{universe}%"

                rows = db.execute(
                    text(f"""
                        SELECT id, 1 - (embedding_vec <=> CAST(:qvec AS vector)) AS similarity
                        FROM materials
                        WHERE {" AND ".join(where_parts)}
                        ORDER BY embedding_vec <=> CAST(:qvec AS vector)
                        LIMIT :lim
                    """),
                    sql_params,
                ).fetchall()

                if rows:
                    ids = [r[0] for r in rows]
                    materials = db.query(Material).filter(Material.id.in_(ids)).all()
                    mat_map = {m.id: m for m in materials}
                    lines = [f"Found {len(ids)} material(s) (semantic search):"]
                    for row in rows:
                        m = mat_map.get(row[0])
                        if m:
                            sim = round(float(row[1]) * 100, 1)
                            lines.append(f"- ID {m.id}: \"{m.name}\" ({m.material_type or 'N/A'}) — {m.product_name or 'N/A'} [{m.universe_name or 'N/A'}] — relevance: {sim}%")
                    return True, "\n".join(lines)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.warning(f"Semantic search failed in agent, falling back to keyword search: {e}", exc_info=True)

    # Keyword fallback
    q = db.query(Material).filter(Material.status != "ARCHIVED")
    if query:
        normalized_query = " ".join(query.split())
        query_words = normalized_query.replace("-", " ").replace("_", " ").split()
        normalized_nospace = normalized_query.replace(" ", "").replace("-", "").replace("_", "").lower()

        word_conditions = []
        for word in query_words:
            if len(word) > 2:
                wl = f"%{word}%"
                word_conditions.append(or_(
                    Material.name.ilike(wl), Material.file_name.ilike(wl),
                    Material.product_name.ilike(wl), Material.universe_name.ilike(wl),
                    Material.description.ilike(wl),
                ))

        search_filters = [
            func.lower(func.replace(func.replace(func.replace(Material.name, ' ', ''), '-', ''), '_', '')).like(f"%{normalized_nospace}%"),
            func.lower(func.replace(func.replace(func.replace(Material.file_name, ' ', ''), '-', ''), '_', '')).like(f"%{normalized_nospace}%"),
        ]
        if word_conditions:
            search_filters.append(and_(*word_conditions))
        simple_like = f"%{normalized_query}%"
        search_filters.append(or_(
            Material.name.ilike(simple_like), Material.file_name.ilike(simple_like),
            Material.product_name.ilike(simple_like), Material.universe_name.ilike(simple_like),
            Material.description.ilike(simple_like),
        ))
        q = q.filter(or_(*search_filters))
    if mat_type:
        q = q.filter(Material.material_type.ilike(f"%{mat_type}%"))
    if universe:
        q = q.filter(Material.universe_name.ilike(f"%{universe}%"))

    materials = q.order_by(desc(Material.created_at)).limit(limit).all()
    if not materials:
        return True, "No materials found matching your search."
    lines = [f"Found {len(materials)} material(s):"]
    for m in materials:
        lines.append(f"- ID {m.id}: \"{m.name}\" ({m.material_type or 'N/A'}) — {m.product_name or 'N/A'} [{m.universe_name or 'N/A'}] — status: {m.status}")
    return True, "\n".join(lines)


def _exec_get_material_details(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    mid = params.get("material_id")
    mat = db.query(Material).filter(Material.id == mid).first()
    if not mat:
        return False, f"Material with ID {mid} not found."
    info = {
        "id": mat.id, "name": mat.name, "type": mat.material_type,
        "audience": mat.audience, "product": mat.product_name,
        "universe": mat.universe_name, "status": mat.status,
        "description": mat.description or "N/A",
        "file_name": mat.file_name, "file_format": mat.file_format,
    }
    return True, json.dumps(info, indent=2, default=str)


def _exec_list_my_customers(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    customers = db.query(User).filter(
        and_(User.role == "customer", or_(
            User.assigned_sales_id == user.id, User.created_by_id == user.id,
        ))
    ).order_by(User.full_name).all()
    if not customers:
        return True, "You have no customers assigned."
    lines = [f"You have {len(customers)} customer(s):"]
    for c in customers:
        company = None
        try:
            link = db.query(SharedLink).filter(
                and_(
                    SharedLink.shared_by_user_id == user.id,
                    SharedLink.customer_email == c.email,
                    SharedLink.company_name.isnot(None),
                )
            ).order_by(SharedLink.created_at.desc()).first()
            if link:
                company = link.company_name
        except Exception:
            pass
        suffix = f" — {company}" if company else ""
        lines.append(f"- ID {c.id}: {c.full_name} ({c.email}){suffix}")
    return True, "\n".join(lines)


def _exec_list_my_requests(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    q = db.query(MaterialRequest).filter(MaterialRequest.requester_id == user.id)
    sf = params.get("status_filter")
    if sf:
        try:
            q = q.filter(MaterialRequest.status == MaterialRequestStatus(sf))
        except ValueError:
            pass
    reqs = q.order_by(desc(MaterialRequest.created_at)).limit(20).all()
    if not reqs:
        return True, "You have no material requests."
    lines = [f"You have {len(reqs)} request(s):"]
    for r in reqs:
        status_val = r.status.value if isinstance(r.status, MaterialRequestStatus) else r.status
        lines.append(f"- Request #{r.id}: {r.description[:80] if r.description else 'N/A'} — status: {status_val}")
    return True, "\n".join(lines)


def _exec_list_shared_materials(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    links = db.query(SharedLink).filter(
        SharedLink.shared_by_user_id == user.id
    ).order_by(desc(SharedLink.created_at)).limit(20).all()
    if not links:
        return True, "You haven't shared any materials yet."
    lines = [f"You have {len(links)} shared link(s):"]
    for lk in links:
        mat = db.query(Material).filter(Material.id == lk.material_id).first()
        mat_name = mat.name if mat else "Unknown"
        lines.append(f"- Link #{lk.id}: \"{mat_name}\" shared with {lk.customer_email or 'N/A'} (active: {lk.is_active}, views: {lk.access_count}, downloads: {lk.download_count or 0})")
    return True, "\n".join(lines)


def _exec_request_material_from_pmm(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    req = MaterialRequest(
        requester_id=user.id,
        material_type=params.get("material_type", "other"),
        description=params.get("description", ""),
        priority=params.get("priority", "medium"),
        use_case=params.get("use_case"),
        status=MaterialRequestStatus.PENDING,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return True, f"Material request #{req.id} created successfully (status: pending). The PMM team will be notified."


def _exec_share_material_with_customer(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    import secrets as _secrets
    mid = params.get("material_id")
    mat = None
    if isinstance(mid, int) or (isinstance(mid, str) and str(mid).isdigit()):
        mat = db.query(Material).filter(Material.id == int(mid)).first()
    elif isinstance(mid, str) and mid.strip():
        # AI sometimes passes material name instead of ID — search by name
        like = f"%{mid.strip()}%"
        mat = db.query(Material).filter(
            Material.status.in_(["published", "PUBLISHED"]),
            or_(Material.name.ilike(like), Material.file_name.ilike(like)),
        ).order_by(desc(Material.created_at)).first()
    if not mat:
        return False, f"Material '{mid}' not found. Use search_materials to find the correct material ID."
    mid = mat.id  # Use resolved ID
    if mat.status != "published" and mat.status != "PUBLISHED":
        return False, f"Material \"{mat.name}\" is not published (status: {mat.status}). Only published materials can be shared."
    customer_email = (params.get("customer_email") or "").strip()
    customer_name = (params.get("customer_name") or "").strip()
    if not customer_email and customer_name:
        # AI may pass only customer_name — look up email from user's customers
        customers = db.query(User).filter(
            and_(
                User.role == "customer",
                or_(
                    User.assigned_sales_id == user.id,
                    User.created_by_id == user.id,
                ),
            )
        ).all()
        parts = [p.strip().lower() for p in customer_name.split() if p.strip()]
        for c in customers:
            fn = (c.full_name or "").lower()
            if all(p in fn for p in parts):
                customer_email = c.email or ""
                customer_name = customer_name or c.full_name or ""
                break
    if not customer_email:
        return False, "Customer email is required. Use list_my_customers to find the customer's email."
    token = _secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(days=params.get("expires_in_days", 90))
    link = SharedLink(
        unique_token=token, material_id=mid, shared_by_user_id=user.id,
        customer_email=params.get("customer_email"), customer_name=params.get("customer_name"),
        expires_at=expires_at, is_active=True,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    from app.core.config import settings
    platform_url = getattr(settings, "PLATFORM_URL", "http://localhost:3003")
    share_url = f"{platform_url.rstrip('/')}/share/{token}"
    shared_by_name = user.full_name or user.email or "OVHcloud"
    email_sent = False
    if customer_email:
        try:
            from app.core.email import send_share_link_notification
            email_sent = send_share_link_notification(
                customer_email=customer_email,
                customer_name=customer_name,
                material_name=mat.name,
                share_url=share_url,
                shared_by_name=shared_by_name,
                platform_url=platform_url,
            )
        except Exception as e:
            logger.warning("Failed to send share link email: %s", e)
    msg = f"Shared \"{mat.name}\" with {customer_email}. Share link: {share_url} (expires in {params.get('expires_in_days', 90)} days)."
    if email_sent:
        msg += " Email notification sent."
    elif customer_email and not email_sent:
        msg += " (Email notification could not be sent - check SMTP configuration.)"
    return True, msg


def _exec_send_message_to_customer(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.customer_message import CustomerMessage
    except ImportError:
        return False, "Messaging feature is not available."
    cid = params.get("customer_id")
    customer_name_param = (params.get("customer_name") or "").strip()
    customer_email_param = (params.get("customer_email") or "").strip().lower()
    # AI sometimes puts name in customer_id (e.g. "Laetitia Fauquembergue") — treat as customer_name
    if isinstance(cid, str) and cid.strip() and not cid.strip().isdigit():
        customer_name_param = customer_name_param or cid.strip()
        cid = None
    elif cid is not None:
        try:
            cid = int(cid)
        except (TypeError, ValueError):
            customer_name_param = customer_name_param or str(cid)
            cid = None
    if not cid and not customer_name_param and not customer_email_param:
        return False, "Provide customer_id, customer_name, or customer_email to identify the recipient."
    customer = None

    def _can_message(c):
        is_assigned = c.assigned_sales_id == user.id or c.created_by_id == user.id
        has_conv = db.query(CustomerMessage).filter(
            and_(CustomerMessage.customer_id == c.id, CustomerMessage.sales_contact_id == user.id)
        ).first() is not None
        return is_assigned or has_conv

    # 1. Try customer_email first (most reliable)
    if customer_email_param:
        customer = db.query(User).filter(
            User.role == "customer", User.email.ilike(customer_email_param)
        ).first()
        if customer and not _can_message(customer):
            customer = None

    # 2. Try customer_id (may be wrong if AI confused with message ID)
    if not customer and cid:
        customer = db.query(User).filter(
            and_(User.id == cid, User.role == "customer")
        ).first()
        if customer and not _can_message(customer):
            customer = None

    # 3. Fallback: customer_id failed but we have email from conversation — try by email
    if not customer and cid and customer_email_param:
        customer = db.query(User).filter(
            User.role == "customer", User.email.ilike(customer_email_param)
        ).first()
        if customer and not _can_message(customer):
            customer = None

    # 4. Try customer_name
    if not customer and customer_name_param:
        assigned_ids = {r[0] for r in db.query(User.id).filter(
            and_(User.role == "customer", or_(
                User.assigned_sales_id == user.id, User.created_by_id == user.id,
            ))
        ).all()}
        messaged_ids = {r[0] for r in db.query(CustomerMessage.customer_id).filter(
            CustomerMessage.sales_contact_id == user.id
        ).distinct().all()}
        allowed_ids = assigned_ids | messaged_ids
        if not allowed_ids:
            return False, "You have no customers. Use list_my_customers to see your customers."
        q = db.query(User).filter(
            and_(User.role == "customer", User.id.in_(allowed_ids))
        )
        parts = [p.strip().lower() for p in customer_name_param.split() if p.strip()]
        for c in q.all():
            full_name_lower = (c.full_name or "").lower()
            name_has_any = any(p in full_name_lower for p in parts)
            company_has_any = False
            try:
                link = db.query(SharedLink).filter(
                    and_(
                        SharedLink.shared_by_user_id == user.id,
                        SharedLink.customer_email == c.email,
                    )
                ).first()
                if link and link.company_name:
                    company_lower = (link.company_name or "").lower()
                    company_has_any = any(p in company_lower for p in parts)
            except Exception:
                pass
            if name_has_any or company_has_any:
                customer = c
                break
    if not customer:
        return False, f"Customer not found or not assigned to you. Use list_my_customers to see your customers."
    msg = CustomerMessage(
        customer_id=customer.id, sales_contact_id=user.id,
        subject=params.get("subject"), message=params.get("message", ""),
        sent_by_customer=False, is_read=False,
    )
    db.add(msg)
    db.commit()
    return True, f"Message sent to {customer.full_name} ({customer.email})."


def _exec_list_my_sales_contacts(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """List sales contacts for the current customer (users who shared materials with them)."""
    if user.role != "customer":
        return False, "This tool is only available for customers."
    links = db.query(SharedLink).filter(
        and_(
            SharedLink.customer_email == user.email,
            SharedLink.is_active == True,
            SharedLink.shared_by_user_id.isnot(None),
        )
    ).all()
    contact_ids = list(set([lk.shared_by_user_id for lk in links if lk.shared_by_user_id]))
    if not contact_ids:
        return True, "You have no sales contacts yet (no one has shared materials with you)."
    contacts = db.query(User).filter(
        User.id.in_(contact_ids),
        User.role.in_(["sales", "director", "pmm", "admin"]),
    ).order_by(User.full_name).all()
    lines = [f"You have {len(contacts)} sales contact(s):"]
    for c in contacts:
        lines.append(f"- ID {c.id}: {c.full_name} ({c.email})")
    return True, "\n".join(lines)


def _exec_send_message_to_sales_contact(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Customer sends a message to their sales contact."""
    if user.role != "customer":
        return False, "This tool is only available for customers."
    try:
        from app.models.customer_message import CustomerMessage
    except ImportError:
        return False, "Messaging feature is not available."
    sid = params.get("sales_contact_id")
    sales = db.query(User).filter(User.id == sid).first()
    if not sales or sales.role not in ("sales", "director", "pmm", "admin"):
        return False, f"Sales contact with ID {sid} not found."
    # Verify this sales contact has shared with this customer
    link = db.query(SharedLink).filter(
        and_(
            SharedLink.customer_email == user.email,
            SharedLink.shared_by_user_id == sid,
        )
    ).first()
    if not link:
        return False, f"You cannot message {sales.full_name} — they have not shared any materials with you."
    msg = CustomerMessage(
        customer_id=user.id,
        sales_contact_id=sid,
        subject=params.get("subject"),
        message=params.get("message", ""),
        sent_by_customer=True,
        is_read=False,
    )
    db.add(msg)
    db.commit()
    return True, f"Message sent to {sales.full_name} ({sales.email})."


def _exec_list_material_requests(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    q = db.query(MaterialRequest)
    if params.get("assigned_to_me"):
        q = q.filter(MaterialRequest.assigned_to_id == user.id)
    sf = params.get("status_filter")
    if sf:
        try:
            q = q.filter(MaterialRequest.status == MaterialRequestStatus(sf))
        except ValueError:
            pass
    reqs = q.order_by(desc(MaterialRequest.created_at)).limit(20).all()
    if not reqs:
        return True, "No material requests found."
    lines = [f"Found {len(reqs)} request(s):"]
    for r in reqs:
        requester = db.query(User).filter(User.id == r.requester_id).first()
        requester_name = requester.full_name if requester else "Unknown"
        status_val = r.status.value if isinstance(r.status, MaterialRequestStatus) else r.status
        assigned = ""
        if r.assigned_to_id:
            a = db.query(User).filter(User.id == r.assigned_to_id).first()
            assigned = f" (assigned to {a.full_name})" if a else ""
        lines.append(f"- Request #{r.id} by {requester_name}: {r.description[:60] if r.description else 'N/A'} — {status_val}{assigned}")
    return True, "\n".join(lines)


def _exec_acknowledge_request(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    rid = params.get("request_id")
    req = db.query(MaterialRequest).filter(MaterialRequest.id == rid).first()
    if not req:
        return False, f"Request #{rid} not found."
    if req.status != MaterialRequestStatus.PENDING:
        return False, f"Request #{rid} is not pending (current status: {req.status.value})."
    req.status = MaterialRequestStatus.ACKNOWLEDGED
    req.assigned_to_id = user.id
    req.acknowledged_at = datetime.utcnow()
    eta = params.get("eta_date")
    if eta:
        try:
            req.eta_date = datetime.strptime(eta, "%Y-%m-%d").date()
        except ValueError:
            pass
    db.commit()
    return True, f"Request #{rid} acknowledged and assigned to you.{' ETA: ' + eta if eta else ''}"


def _exec_deliver_request(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    rid = params.get("request_id")
    req = db.query(MaterialRequest).filter(MaterialRequest.id == rid).first()
    if not req:
        return False, f"Request #{rid} not found."
    dmid = params.get("delivered_material_id")
    mat = db.query(Material).filter(Material.id == dmid).first()
    if not mat:
        return False, f"Material with ID {dmid} not found."
    req.status = MaterialRequestStatus.DELIVERED
    req.delivered_at = datetime.utcnow()
    req.delivered_material_id = dmid
    db.commit()
    return True, f"Request #{rid} marked as delivered with material \"{mat.name}\" (ID {dmid})."


def _exec_close_request(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    rid = params.get("request_id")
    req = db.query(MaterialRequest).filter(MaterialRequest.id == rid).first()
    if not req:
        return False, f"Request #{rid} not found."
    if req.status == MaterialRequestStatus.DELIVERED:
        return False, "Cannot close a delivered request."
    reason_str = params.get("close_reason", "not_planned")
    try:
        reason = MaterialRequestCloseReason(reason_str)
    except ValueError:
        return False, f"Invalid close reason: {reason_str}"
    req.status = MaterialRequestStatus.CLOSED
    req.closed_at = datetime.utcnow()
    req.close_reason = reason
    req.close_reason_details = params.get("close_reason_details")
    req.existing_material_id = params.get("existing_material_id")
    planned = params.get("planned_date")
    if planned:
        try:
            req.planned_date = datetime.strptime(planned, "%Y-%m-%d").date()
        except ValueError:
            pass
    db.commit()
    return True, f"Request #{rid} closed (reason: {reason_str})."


def _exec_reopen_request(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    rid = params.get("request_id")
    req = db.query(MaterialRequest).filter(MaterialRequest.id == rid).first()
    if not req:
        return False, f"Request #{rid} not found."
    if req.status != MaterialRequestStatus.CLOSED:
        return False, f"Can only reopen closed requests (current: {req.status.value})."
    req.status = MaterialRequestStatus.PENDING
    req.closed_at = None
    req.close_reason = None
    req.close_reason_details = None
    req.existing_material_id = None
    req.planned_date = None
    db.commit()
    return True, f"Request #{rid} reopened (status: pending)."


def _exec_list_pmm_users(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    pmms = db.query(User).filter(User.role == "pmm", User.is_active == True).all()
    if not pmms:
        return True, "No active PMM users found."
    lines = [f"{len(pmms)} PMM user(s):"]
    for p in pmms:
        lines.append(f"- ID {p.id}: {p.full_name} ({p.email})")
    return True, "\n".join(lines)


# ---------------------------------------------------------------------------
# NEW tool executors
# ---------------------------------------------------------------------------

def _exec_check_customer_engagement(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Check engagement: shared/viewed/downloaded events for a customer or material.
    Uses both SharedLink counters and MaterialUsage records for a complete picture."""

    customer_email = params.get("customer_email")
    customer_name = params.get("customer_name")
    material_id = params.get("material_id")
    event_type = params.get("event_type")
    limit = min(params.get("limit", 20), 50)

    # If name given but no email, look up the customer
    if customer_name and not customer_email:
        cust = db.query(User).filter(
            User.role == "customer",
            User.full_name.ilike(f"%{customer_name}%"),
        ).first()
        if cust:
            customer_email = cust.email
        else:
            return True, f"No customer found matching '{customer_name}'."

    # Scope shared links by user role
    if user.role in ("director", "admin", "pmm"):
        links_q = db.query(SharedLink)
    else:
        links_q = db.query(SharedLink).filter(SharedLink.shared_by_user_id == user.id)

    if customer_email:
        links_q = links_q.filter(SharedLink.customer_email == customer_email)
    if material_id:
        links_q = links_q.filter(SharedLink.material_id == material_id)

    shared_links = links_q.order_by(desc(SharedLink.created_at)).all()
    if not shared_links:
        target = customer_email or customer_name or "the specified criteria"
        return True, f"No shared materials found for {target}."

    mat_ids = list(set(lk.material_id for lk in shared_links))
    mats = {m.id: m for m in db.query(Material).filter(Material.id.in_(mat_ids)).all()}

    # Build a summary per shared link with engagement data from SharedLink counters
    lines = []
    cust_display = customer_name or customer_email or "customer"
    total_views = sum(lk.access_count or 0 for lk in shared_links)
    total_downloads = sum(lk.download_count or 0 for lk in shared_links)

    lines.append(f"Engagement summary for {cust_display}:")
    lines.append(f"- Total shared materials: {len(shared_links)}")
    lines.append(f"- Total views: {total_views}")
    lines.append(f"- Total downloads: {total_downloads}")
    lines.append("")

    for lk in shared_links[:limit]:
        mat = mats.get(lk.material_id)
        mat_name = mat.name if mat else "Unknown"
        shared_date = lk.created_at.strftime("%Y-%m-%d") if lk.created_at else "N/A"
        last_view = lk.last_accessed_at.strftime("%Y-%m-%d %H:%M") if lk.last_accessed_at else "never"
        last_dl = lk.last_downloaded_at.strftime("%Y-%m-%d %H:%M") if lk.last_downloaded_at else "never"
        views = lk.access_count or 0
        downloads = lk.download_count or 0

        status_parts = []
        if downloads > 0:
            status_parts.append(f"DOWNLOADED {downloads}x (last: {last_dl})")
        if views > 0:
            status_parts.append(f"VIEWED {views}x (last: {last_view})")
        if not status_parts:
            status_parts.append("NOT OPENED yet")

        status = ", ".join(status_parts)
        lines.append(f"- \"{mat_name}\" (shared {shared_date}): {status}")

    return True, "\n".join(lines)


def _exec_get_sharing_stats(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Get sharing overview statistics."""
    start_date = params.get("start_date")
    end_date = params.get("end_date")

    if user.role in ("director", "admin", "pmm"):
        base_q = db.query(SharedLink)
    else:
        base_q = db.query(SharedLink).filter(SharedLink.shared_by_user_id == user.id)

    q = base_q
    if start_date:
        try:
            q = q.filter(SharedLink.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
        except ValueError:
            pass
    if end_date:
        try:
            q = q.filter(SharedLink.created_at <= datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59))
        except ValueError:
            pass

    total = q.count()
    now = datetime.utcnow()
    active = q.filter(SharedLink.is_active == True, SharedLink.expires_at > now).count()
    total_views = sum(lk.access_count or 0 for lk in q.all())
    total_downloads = sum(lk.download_count or 0 for lk in q.all())
    unique_custs = q.filter(SharedLink.customer_email.isnot(None)).with_entities(
        func.count(func.distinct(SharedLink.customer_email))
    ).scalar() or 0

    lines = [
        "Sharing Statistics:",
        f"- Total shares: {total}",
        f"- Active shares: {active}",
        f"- Total views: {total_views}",
        f"- Total downloads: {total_downloads}",
        f"- Unique customers: {unique_custs}",
    ]
    return True, "\n".join(lines)


def _exec_get_executive_summary(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Get or generate executive summary for a material."""
    mid = params.get("material_id")
    mat = db.query(Material).filter(Material.id == mid).first()
    if not mat:
        return False, f"Material with ID {mid} not found."
    if mat.executive_summary:
        return True, f"Executive Summary for \"{mat.name}\":\n\n{mat.executive_summary}"
    return True, f"No executive summary available yet for \"{mat.name}\". The summary can be generated from the material detail page in the UI."


def _exec_list_enablement_tracks(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.track import Track
    except ImportError:
        return True, "Enablement tracks feature is not available."
    q = db.query(Track)
    sf = params.get("status_filter")
    if sf:
        q = q.filter(Track.status == sf)
    tracks = q.order_by(desc(Track.created_at)).limit(20).all()
    if not tracks:
        return True, "No enablement tracks found."
    lines = [f"Found {len(tracks)} track(s):"]
    for t in tracks:
        lines.append(f"- ID {t.id}: \"{t.name}\" — {(t.description or '')[:60] or 'N/A'}")
    return True, "\n".join(lines)


def _exec_get_track_details(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.track import Track
    except ImportError:
        return False, "Enablement tracks feature is not available."
    tid = params.get("track_id")
    track = db.query(Track).filter(Track.id == tid).first()
    if not track:
        return False, f"Track with ID {tid} not found."
    info = {"id": track.id, "name": track.name, "description": track.description or "N/A"}
    return True, json.dumps(info, indent=2, default=str)


def _exec_list_product_releases(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.product_release import ProductRelease
    except ImportError:
        return True, "Product releases feature is not available."
    q = db.query(ProductRelease)
    uid = params.get("universe_id")
    pid = params.get("product_id")
    if uid:
        q = q.filter(ProductRelease.universe_id == uid)
    if pid:
        q = q.filter(ProductRelease.product_id == pid)
    releases = q.order_by(desc(ProductRelease.created_at)).limit(15).all()
    if not releases:
        return True, "No product releases found."
    lines = [f"Found {len(releases)} product release(s):"]
    for r in releases:
        title = getattr(r, "title", None) or getattr(r, "name", "N/A")
        date_str = r.created_at.strftime("%Y-%m-%d") if r.created_at else "N/A"
        lines.append(f"- ID {r.id}: \"{title}\" ({date_str})")
    return True, "\n".join(lines)


def _exec_list_marketing_updates(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.marketing_update import MarketingUpdate
    except ImportError:
        return True, "Marketing updates feature is not available."
    q = db.query(MarketingUpdate)
    cat = params.get("category")
    if cat:
        q = q.filter(MarketingUpdate.category.ilike(f"%{cat}%"))
    prio = params.get("priority")
    if prio:
        q = q.filter(MarketingUpdate.priority == prio)
    updates = q.order_by(desc(MarketingUpdate.created_at)).limit(15).all()
    if not updates:
        return True, "No marketing updates found."
    lines = [f"Found {len(updates)} marketing update(s):"]
    for u in updates:
        title = getattr(u, "title", None) or getattr(u, "name", "N/A")
        date_str = u.created_at.strftime("%Y-%m-%d") if u.created_at else "N/A"
        lines.append(f"- ID {u.id}: \"{title}\" ({date_str})")
    return True, "\n".join(lines)


def _exec_get_notifications(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.notification import Notification, notification_recipients
    except ImportError:
        return True, "Notifications feature is not available."
    unread_only = params.get("unread_only", False)
    q = db.query(Notification).join(
        notification_recipients, Notification.id == notification_recipients.c.notification_id
    ).filter(notification_recipients.c.user_id == user.id)
    if unread_only:
        q = q.filter(notification_recipients.c.is_read == False)
    notifs = q.order_by(desc(Notification.created_at)).limit(15).all()
    if not notifs:
        return True, "No notifications." if not unread_only else "No unread notifications."
    lines = [f"{len(notifs)} notification(s):"]
    for n in notifs:
        date_str = n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else "N/A"
        lines.append(f"- [{date_str}] {n.title}: {n.message[:80]}")
    return True, "\n".join(lines)


def _exec_get_dashboard_summary(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Summarize key dashboard metrics depending on role."""
    total_materials = db.query(Material).filter(Material.status != "ARCHIVED").count()
    published = db.query(Material).filter(Material.status.in_(["published", "PUBLISHED"])).count()
    total_requests = db.query(MaterialRequest).count()
    pending_requests = db.query(MaterialRequest).filter(MaterialRequest.status == MaterialRequestStatus.PENDING).count()
    total_shares = db.query(SharedLink).count()
    active_shares = db.query(SharedLink).filter(SharedLink.is_active == True, SharedLink.expires_at > datetime.utcnow()).count()

    lines = [
        "Dashboard Summary:",
        f"- Total materials: {total_materials} ({published} published)",
        f"- Material requests: {total_requests} ({pending_requests} pending)",
        f"- Shared links: {total_shares} ({active_shares} active)",
    ]

    if user.role == "sales":
        my_customers = db.query(User).filter(
            and_(User.role == "customer", or_(
                User.assigned_sales_id == user.id, User.created_by_id == user.id,
            ))
        ).count()
        my_shares = db.query(SharedLink).filter(SharedLink.shared_by_user_id == user.id).count()
        lines.append(f"- My customers: {my_customers}")
        lines.append(f"- My shares: {my_shares}")

    return True, "\n".join(lines)


def _exec_get_material_health(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Get material health/freshness information."""
    mid = params.get("material_id")
    if mid:
        mat = db.query(Material).filter(Material.id == mid).first()
        if not mat:
            return False, f"Material with ID {mid} not found."
        age_days = (datetime.utcnow() - mat.last_updated).days if mat.last_updated else None
        return True, f"Material \"{mat.name}\" health:\n- Last updated: {mat.last_updated or 'Unknown'}\n- Age: {age_days} days\n- Status: {mat.status}"

    now = datetime.utcnow()
    stale_threshold = now - timedelta(days=180)
    stale = db.query(Material).filter(
        Material.status != "ARCHIVED", Material.last_updated < stale_threshold
    ).count()
    total = db.query(Material).filter(Material.status != "ARCHIVED").count()
    fresh = total - stale
    lines = [
        "Material Health Overview:",
        f"- Total active materials: {total}",
        f"- Fresh (< 6 months): {fresh}",
        f"- Stale (> 6 months): {stale}",
    ]
    return True, "\n".join(lines)


def _exec_list_products(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    try:
        from app.models.product import Product, Universe, Category
    except ImportError:
        return True, "Products feature is not available."
    uid = params.get("universe_id")
    cid = params.get("category_id")

    if not uid and not cid:
        universes = db.query(Universe).filter(Universe.is_active == True).all()
        lines = [f"{len(universes)} universe(s):"]
        for u in universes:
            prod_count = db.query(Product).filter(Product.universe_id == u.id).count()
            lines.append(f"- ID {u.id}: {u.name} ({prod_count} products)")
        return True, "\n".join(lines)

    q = db.query(Product)
    if uid:
        q = q.filter(Product.universe_id == uid)
    if cid:
        q = q.filter(Product.category_id == cid)
    products = q.order_by(Product.name).all()
    if not products:
        return True, "No products found."
    lines = [f"Found {len(products)} product(s):"]
    for p in products:
        display = p.display_name or p.name
        lines.append(f"- ID {p.id}: {display}")
    return True, "\n".join(lines)


def _exec_search_by_use_case(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Search materials by use case, pain point, or discovery keywords."""
    keywords = params.get("keywords", "")
    use_case = params.get("use_case", "")
    pain_point = params.get("pain_point", "")
    search_term = keywords or use_case or pain_point
    if not search_term:
        return True, "Please provide keywords, a use case, or a pain point to search."

    like = f"%{search_term}%"
    mats = db.query(Material).filter(
        Material.status != "ARCHIVED",
        or_(
            Material.use_cases.ilike(like),
            Material.pain_points.ilike(like),
            Material.keywords.ilike(like),
            Material.description.ilike(like),
            Material.name.ilike(like),
        )
    ).order_by(desc(Material.created_at)).limit(15).all()

    if not mats:
        return True, f"No materials found for '{search_term}'."
    lines = [f"Found {len(mats)} material(s) related to '{search_term}':"]
    for m in mats:
        lines.append(f"- ID {m.id}: \"{m.name}\" ({m.material_type or 'N/A'}) — {m.product_name or 'N/A'}")
    return True, "\n".join(lines)


def _exec_get_conversations(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Get sales message conversations."""
    try:
        from app.models.customer_message import CustomerMessage
    except ImportError:
        return True, "Messaging feature is not available."

    search = params.get("search", "")
    customers = db.query(User).filter(
        and_(User.role == "customer", or_(
            User.assigned_sales_id == user.id, User.created_by_id == user.id,
        ))
    ).all()
    if search:
        customers = [c for c in customers if search.lower() in c.full_name.lower() or search.lower() in c.email.lower()]
    if not customers:
        return True, "No customer conversations found."

    lines = [f"{len(customers)} conversation(s):"]
    for c in customers:
        msgs = db.query(CustomerMessage).filter(
            and_(CustomerMessage.customer_id == c.id, CustomerMessage.sales_contact_id == user.id)
        ).order_by(desc(CustomerMessage.created_at)).all()
        unread = sum(1 for m in msgs if m.sent_by_customer and not m.is_read)
        last_msg = msgs[0] if msgs else None
        last_preview = last_msg.message[:50] if last_msg else "No messages"
        unread_str = f" [{unread} unread]" if unread > 0 else ""
        lines.append(f"- {c.full_name} ({c.email}): {len(msgs)} messages{unread_str} — last: \"{last_preview}\"")
    return True, "\n".join(lines)


def _exec_get_usage_analytics(params: Dict, user: User, db: Session) -> Tuple[bool, str]:
    """Get material usage analytics."""
    from app.models.usage import MaterialUsage, UsageAction
    days = params.get("days", 30)
    since = datetime.utcnow() - timedelta(days=days)

    total_views = db.query(MaterialUsage).filter(
        MaterialUsage.action == UsageAction.VIEW.value, MaterialUsage.used_at >= since
    ).count()
    total_downloads = db.query(MaterialUsage).filter(
        MaterialUsage.action == UsageAction.DOWNLOAD.value, MaterialUsage.used_at >= since
    ).count()

    # Most downloaded materials
    top_downloaded = db.query(
        MaterialUsage.material_id, func.count(MaterialUsage.id).label("cnt")
    ).filter(
        MaterialUsage.action == UsageAction.DOWNLOAD.value, MaterialUsage.used_at >= since
    ).group_by(MaterialUsage.material_id).order_by(desc("cnt")).limit(5).all()

    lines = [
        f"Usage Analytics (last {days} days):",
        f"- Total views: {total_views}",
        f"- Total downloads: {total_downloads}",
    ]
    if top_downloaded:
        lines.append("- Most downloaded:")
        for mid, cnt in top_downloaded:
            mat = db.query(Material).filter(Material.id == mid).first()
            name = mat.name if mat else f"ID {mid}"
            lines.append(f"  - \"{name}\": {cnt} downloads")
    return True, "\n".join(lines)


# ---------------------------------------------------------------------------
# Executor registry
# ---------------------------------------------------------------------------

_EXECUTORS = {
    "search_materials": _exec_search_materials,
    "get_material_details": _exec_get_material_details,
    "list_my_customers": _exec_list_my_customers,
    "list_my_requests": _exec_list_my_requests,
    "list_shared_materials": _exec_list_shared_materials,
    "request_material_from_pmm": _exec_request_material_from_pmm,
    "share_material_with_customer": _exec_share_material_with_customer,
    "send_message_to_customer": _exec_send_message_to_customer,
    "list_my_sales_contacts": _exec_list_my_sales_contacts,
    "send_message_to_sales_contact": _exec_send_message_to_sales_contact,
    "list_material_requests": _exec_list_material_requests,
    "acknowledge_request": _exec_acknowledge_request,
    "deliver_request": _exec_deliver_request,
    "close_request": _exec_close_request,
    "reopen_request": _exec_reopen_request,
    "list_pmm_users": _exec_list_pmm_users,
    "check_customer_engagement": _exec_check_customer_engagement,
    "get_sharing_stats": _exec_get_sharing_stats,
    "get_executive_summary": _exec_get_executive_summary,
    "list_enablement_tracks": _exec_list_enablement_tracks,
    "get_track_details": _exec_get_track_details,
    "list_product_releases": _exec_list_product_releases,
    "list_marketing_updates": _exec_list_marketing_updates,
    "get_notifications": _exec_get_notifications,
    "get_dashboard_summary": _exec_get_dashboard_summary,
    "get_material_health": _exec_get_material_health,
    "list_products": _exec_list_products,
    "search_by_use_case": _exec_search_by_use_case,
    "get_conversations": _exec_get_conversations,
    "get_usage_analytics": _exec_get_usage_analytics,
}


def build_human_description(tool_name: str, params: Dict[str, Any], user: User, db: Session) -> str:
    """Build a human-readable description of the action for confirmation UI."""
    if tool_name == "request_material_from_pmm":
        return f"Create a material request ({params.get('material_type', 'N/A')}): \"{params.get('description', '')[:100]}\""
    elif tool_name == "share_material_with_customer":
        mid = params.get("material_id")
        mat = None
        if isinstance(mid, int) or (isinstance(mid, str) and str(mid).isdigit()):
            mat = db.query(Material).filter(Material.id == int(mid)).first()
        elif isinstance(mid, str) and mid.strip():
            # AI sometimes passes material name instead of ID — search by name
            like = f"%{mid.strip()}%"
            mat = db.query(Material).filter(
                Material.status.in_(["published", "PUBLISHED"]),
                or_(Material.name.ilike(like), Material.file_name.ilike(like)),
            ).order_by(desc(Material.created_at)).first()
        mat_name = mat.name if mat else str(mid) if mid else "?"
        return f"Share \"{mat_name}\" with {params.get('customer_email', 'customer')}"
    elif tool_name == "send_message_to_customer":
        cid = params.get("customer_id")
        cname = params.get("customer_name")
        cemail = params.get("customer_email")
        if cemail:
            cust = db.query(User).filter(User.email.ilike(cemail)).first()
            target = cust.full_name if cust else cemail
        elif cname:
            target = cname
        elif cid:
            cust = db.query(User).filter(User.id == cid).first()
            target = cust.full_name if cust else f"ID {cid}"
        else:
            target = "customer"
        return f"Send message to {target}: \"{params.get('message', '')[:80]}\""
    elif tool_name == "send_message_to_sales_contact":
        sales = db.query(User).filter(User.id == params.get("sales_contact_id")).first()
        sales_name = sales.full_name if sales else f"ID {params.get('sales_contact_id')}"
        return f"Send message to {sales_name}: \"{params.get('message', '')[:80]}\""
    elif tool_name == "acknowledge_request":
        return f"Acknowledge request #{params.get('request_id')}" + (f" with ETA {params.get('eta_date')}" if params.get("eta_date") else "")
    elif tool_name == "deliver_request":
        return f"Deliver request #{params.get('request_id')} with material ID {params.get('delivered_material_id')}"
    elif tool_name == "close_request":
        return f"Close request #{params.get('request_id')} (reason: {params.get('close_reason', 'N/A')})"
    elif tool_name == "reopen_request":
        return f"Reopen request #{params.get('request_id')}"
    return f"Execute {tool_name} with parameters: {json.dumps(params)}"
