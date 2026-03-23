"""Seed DSR templates

Revision ID: 022
Revises: 021
Create Date: 2026-03-23

"""
from alembic import op
import sqlalchemy as sa


revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade():
    # Insert 4 additional templates (Blank exists from 021)
    templates = [
        {
            "name": "Discovery / First Meeting",
            "description": "Light-touch room for initial discovery. Use for first contact, needs assessment, or exploratory calls.",
            "welcome_message": "Thanks for connecting. This room contains materials to support our conversation.",
            "action_plan": [
                {"title": "Schedule discovery call", "description": "", "status": "pending", "assignee": ""},
                {"title": "Send follow-up and materials", "description": "", "status": "pending", "assignee": ""},
                {"title": "Book next meeting", "description": "", "status": "pending", "assignee": ""},
            ],
        },
        {
            "name": "Solution Walkthrough",
            "description": "Full customer journey from problem to solution. Best for demos, proposals, or multi-stakeholder reviews.",
            "welcome_message": "Here’s how we can help. This room walks through our understanding of your needs and our proposed solution.",
            "action_plan": [
                {"title": "Demo / walkthrough completed", "description": "", "status": "pending", "assignee": ""},
                {"title": "Technical validation", "description": "", "status": "pending", "assignee": ""},
                {"title": "Commercial discussion", "description": "", "status": "pending", "assignee": ""},
                {"title": "Close decision", "description": "", "status": "pending", "assignee": ""},
            ],
        },
        {
            "name": "Technical Evaluation / POC",
            "description": "Validation-focused room for technical teams. Use for POCs, evaluations, or proof-of-concept.",
            "welcome_message": "Welcome to the technical evaluation. Find materials and success criteria below.",
            "action_plan": [
                {"title": "POC kickoff", "description": "", "status": "pending", "assignee": ""},
                {"title": "Success criteria defined", "description": "", "status": "pending", "assignee": ""},
                {"title": "Technical validation complete", "description": "", "status": "pending", "assignee": ""},
                {"title": "Go / No-go decision", "description": "", "status": "pending", "assignee": ""},
            ],
        },
        {
            "name": "Commercial & Close",
            "description": "Deal-closing room. Use when negotiating terms, legal review, or contract execution.",
            "welcome_message": "We’re close. This room contains the materials needed to move to signature.",
            "action_plan": [
                {"title": "Proposal sent", "description": "", "status": "pending", "assignee": ""},
                {"title": "Legal review", "description": "", "status": "pending", "assignee": ""},
                {"title": "Contract negotiation", "description": "", "status": "pending", "assignee": ""},
                {"title": "Signature", "description": "", "status": "pending", "assignee": ""},
            ],
        },
        {
            "name": "Executive Briefing",
            "description": "Concise room for C-level or decision makers. High-level value, few materials.",
            "welcome_message": "Executive summary for your review. We’ve captured the key points and next steps.",
            "action_plan": [
                {"title": "Executive review", "description": "", "status": "pending", "assignee": ""},
                {"title": "Decision meeting", "description": "", "status": "pending", "assignee": ""},
                {"title": "Follow-up", "description": "", "status": "pending", "assignee": ""},
            ],
        },
    ]

    conn = op.get_bind()
    meta = sa.MetaData()
    meta.reflect(bind=conn, only=["deal_room_templates"])
    table = meta.tables["deal_room_templates"]
    rows = [{"name": t["name"], "description": t["description"], "welcome_message": t["welcome_message"], "materials_json": [], "action_plan_json": t["action_plan"]} for t in templates]
    op.bulk_insert(table, rows)


def downgrade():
    op.execute("""
        DELETE FROM deal_room_templates
        WHERE name IN (
            'Discovery / First Meeting',
            'Solution Walkthrough',
            'Technical Evaluation / POC',
            'Commercial & Close',
            'Executive Briefing'
        )
    """)
