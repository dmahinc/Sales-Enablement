"""Deal room participants (invited access with roles)

Revision ID: 023
Revises: 022
"""
from alembic import op
import sqlalchemy as sa


revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "deal_room_participants",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deal_room_id", sa.Integer(), sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="viewer"),
        sa.Column("invited_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("idx_deal_room_participants_room", "deal_room_participants", ["deal_room_id"])
    op.create_index("idx_deal_room_participants_email", "deal_room_participants", ["email"])
    op.create_index(
        "idx_deal_room_participants_room_email",
        "deal_room_participants",
        ["deal_room_id", "email"],
        unique=True,
    )


def downgrade():
    op.drop_index("idx_deal_room_participants_room_email", table_name="deal_room_participants")
    op.drop_index("idx_deal_room_participants_email", table_name="deal_room_participants")
    op.drop_index("idx_deal_room_participants_room", table_name="deal_room_participants")
    op.drop_table("deal_room_participants")
