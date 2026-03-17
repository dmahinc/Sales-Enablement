"""Add Digital Sales Rooms (Deal Rooms)

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa


revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "deal_rooms",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("unique_token", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("customer_email", sa.String(255), nullable=True, index=True),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("opportunity_name", sa.String(255), nullable=True),
        sa.Column("welcome_message", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), server_default=sa.text("(NOW() + INTERVAL '90 days')"), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("access_count", sa.Integer(), default=0, nullable=False),
        sa.Column("last_accessed_at", sa.DateTime(), nullable=True),
        sa.Column("unique_visitors", sa.Integer(), default=0, nullable=False),
    )
    op.create_index("idx_deal_rooms_created_by", "deal_rooms", ["created_by_user_id"])
    op.create_index("idx_deal_rooms_customer", "deal_rooms", ["customer_email"])
    op.create_index("idx_deal_rooms_active", "deal_rooms", ["is_active", "expires_at"])

    op.create_table(
        "deal_room_materials",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deal_room_id", sa.Integer(), sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("material_id", sa.Integer(), sa.ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("persona_id", sa.Integer(), sa.ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("section_name", sa.String(100), nullable=True),
        sa.Column("display_order", sa.Integer(), default=0, nullable=False),
    )
    op.create_index("idx_deal_room_materials_room", "deal_room_materials", ["deal_room_id"])
    op.create_index("idx_deal_room_materials_material", "deal_room_materials", ["material_id"])

    op.create_table(
        "action_plan_items",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deal_room_id", sa.Integer(), sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(50), default="pending", nullable=False),
        sa.Column("assignee", sa.String(50), nullable=True),
        sa.Column("display_order", sa.Integer(), default=0, nullable=False),
    )
    op.create_index("idx_action_plan_items_room", "action_plan_items", ["deal_room_id"])

    op.create_table(
        "room_messages",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deal_room_id", sa.Integer(), sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent_by_customer", sa.Boolean(), default=False, nullable=False),
        sa.Column("is_read", sa.Boolean(), default=False, nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("parent_message_id", sa.Integer(), sa.ForeignKey("room_messages.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("idx_room_messages_room", "room_messages", ["deal_room_id"])
    op.create_index("idx_room_messages_sender", "room_messages", ["sender_user_id"])
    op.create_index("idx_room_messages_thread", "room_messages", ["parent_message_id"])

    op.add_column("material_usage", sa.Column("deal_room_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_material_usage_deal_room", "material_usage", "deal_rooms", ["deal_room_id"], ["id"], ondelete="SET NULL")
    op.create_index("idx_material_usage_deal_room", "material_usage", ["deal_room_id"])


def downgrade():
    op.drop_index("idx_material_usage_deal_room", "material_usage")
    op.drop_constraint("fk_material_usage_deal_room", "material_usage", type_="foreignkey")
    op.drop_column("material_usage", "deal_room_id")

    op.drop_table("room_messages")
    op.drop_table("action_plan_items")
    op.drop_table("deal_room_materials")
    op.drop_table("deal_rooms")
