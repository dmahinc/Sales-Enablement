"""Add executive_summary to materials

Revision ID: 009
Revises: 008
Create Date: 2026-02-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '7127a750cb42'  # Point to the actual current head
branch_labels = None
depends_on = None


def upgrade():
    # Add executive_summary and executive_summary_generated_at columns to materials table
    # Check if columns already exist before adding
    from alembic import op
    from sqlalchemy import inspect
    
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('materials')]
    
    if 'executive_summary' not in columns:
        op.add_column('materials', sa.Column('executive_summary', sa.Text(), nullable=True))
    if 'executive_summary_generated_at' not in columns:
        op.add_column('materials', sa.Column('executive_summary_generated_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('materials', 'executive_summary_generated_at')
    op.drop_column('materials', 'executive_summary')
