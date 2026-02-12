"""Add download tracking to shared_links table

Revision ID: 008
Revises: 007
Create Date: 2026-02-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_add_download_tracking'
down_revision = '7127a750cb42'
branch_labels = None
depends_on = None


def upgrade():
    # Add download tracking columns
    op.add_column('shared_links', sa.Column('download_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('shared_links', sa.Column('last_downloaded_at', sa.DateTime(), nullable=True))
    
    # Create index for download queries
    op.create_index('idx_shared_links_downloads', 'shared_links', ['last_downloaded_at'])


def downgrade():
    op.drop_index('idx_shared_links_downloads', table_name='shared_links')
    op.drop_column('shared_links', 'last_downloaded_at')
    op.drop_column('shared_links', 'download_count')
