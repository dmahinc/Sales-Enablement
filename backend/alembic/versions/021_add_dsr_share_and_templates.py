"""Add DSR password protection, share, and templates

Revision ID: 021
Revises: 018
"""
from alembic import op
import sqlalchemy as sa


revision = "021"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("deal_rooms")]

    # Password protection for share links
    if "password_protected" not in cols:
        op.add_column("deal_rooms", sa.Column("password_protected", sa.Boolean(), server_default="false", nullable=True))
    if "password_hash" not in cols:
        op.add_column("deal_rooms", sa.Column("password_hash", sa.String(255), nullable=True))

    # Deal room templates
    op.create_table(
        "deal_room_templates",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("welcome_message", sa.Text(), nullable=True),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("welcome_video_url", sa.String(500), nullable=True),
        sa.Column("materials_json", sa.JSON(), nullable=True),
        sa.Column("action_plan_json", sa.JSON(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("idx_deal_room_templates_name", "deal_room_templates", ["name"])

    # Seed default Blank template
    op.execute("""
        INSERT INTO deal_room_templates (name, description, materials_json, action_plan_json)
        VALUES ('Blank', 'Start with an empty room', '[]', '[]')
    """)


def downgrade():
    op.drop_table("deal_room_templates")
    op.drop_column("deal_rooms", "password_hash")
    op.drop_column("deal_rooms", "password_protected")
