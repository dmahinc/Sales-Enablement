"""Add database indexes for performance

Revision ID: 002_add_indexes
Revises: 001_initial_migration
Create Date: 2026-02-02 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_indexes'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for frequently queried columns
    op.create_index('idx_materials_created_at', 'materials', ['created_at'])
    op.create_index('idx_materials_updated_at', 'materials', ['updated_at'])
    op.create_index('idx_materials_status_universe', 'materials', ['status', 'universe_name'])
    
    # Add GIN indexes for array/JSON fields (if using PostgreSQL)
    # Note: These require the pg_trgm extension for text search
    # op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    # op.create_index('idx_materials_tags_gin', 'materials', ['tags'], postgresql_using='gin')
    # op.create_index('idx_materials_keywords_gin', 'materials', ['keywords'], postgresql_using='gin')
    
    # Add indexes for personas and segments
    op.create_index('idx_personas_name', 'personas', ['name'])
    op.create_index('idx_segments_name', 'segments', ['name'])
    op.create_index('idx_segments_industry', 'segments', ['industry'])
    op.create_index('idx_segments_region', 'segments', ['region'])


def downgrade():
    op.drop_index('idx_materials_created_at', table_name='materials')
    op.drop_index('idx_materials_updated_at', table_name='materials')
    op.drop_index('idx_materials_status_universe', table_name='materials')
    op.drop_index('idx_personas_name', table_name='personas')
    op.drop_index('idx_segments_name', table_name='segments')
    op.drop_index('idx_segments_industry', table_name='segments')
    op.drop_index('idx_segments_region', table_name='segments')
