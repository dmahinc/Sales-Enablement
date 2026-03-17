"""Add executive_summary and welcome_video_url to deal_rooms

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("deal_rooms", sa.Column("executive_summary", sa.Text(), nullable=True))
    op.add_column("deal_rooms", sa.Column("welcome_video_url", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("deal_rooms", "welcome_video_url")
    op.drop_column("deal_rooms", "executive_summary")
