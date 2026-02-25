"""Add company_name to shared_links

Revision ID: 013
Revises: 012
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    # Add company_name column to shared_links table
    op.add_column('shared_links', sa.Column('company_name', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('shared_links', 'company_name')
