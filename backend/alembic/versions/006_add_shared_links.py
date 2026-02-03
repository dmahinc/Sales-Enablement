"""Add shared_links table

Revision ID: 006
Revises: 005
Create Date: 2026-02-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005_add_tracks'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'shared_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('unique_token', sa.String(length=64), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('shared_by_user_id', sa.Integer(), nullable=True),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_shared_links_token', 'shared_links', ['unique_token'], unique=True)
    op.create_index('idx_shared_links_material', 'shared_links', ['material_id'])
    op.create_index('idx_shared_links_customer', 'shared_links', ['customer_email'])
    op.create_index('idx_shared_links_user', 'shared_links', ['shared_by_user_id'])
    op.create_index('idx_shared_links_active', 'shared_links', ['is_active', 'expires_at'])


def downgrade():
    op.drop_index('idx_shared_links_active', table_name='shared_links')
    op.drop_index('idx_shared_links_user', table_name='shared_links')
    op.drop_index('idx_shared_links_customer', table_name='shared_links')
    op.drop_index('idx_shared_links_material', table_name='shared_links')
    op.drop_index('idx_shared_links_token', table_name='shared_links')
    op.drop_table('shared_links')
