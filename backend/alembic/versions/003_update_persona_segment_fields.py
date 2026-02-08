"""Update Persona and Segment models to match Product Brief

Revision ID: 003_update_persona_segment_fields
Revises: 002_add_indexes
Create Date: 2026-02-02 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002_add_indexes'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    
    # Helper function to check if column exists
    def column_exists(table_name, column_name):
        conn = op.get_bind()
        inspector = inspect(conn)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    
    # Helper function to check if index exists
    def index_exists(index_name, table_name):
        conn = op.get_bind()
        inspector = inspect(conn)
        indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
        return index_name in indexes
    
    # Add new fields to personas table (if they don't exist)
    if not column_exists('personas', 'role'):
        op.add_column('personas', sa.Column('role', sa.String(100), nullable=True))
    if not column_exists('personas', 'description'):
        op.add_column('personas', sa.Column('description', sa.Text(), nullable=True))
    if not column_exists('personas', 'goals'):
        op.add_column('personas', sa.Column('goals', sa.Text(), nullable=True))
    if not column_exists('personas', 'challenges'):
        op.add_column('personas', sa.Column('challenges', sa.Text(), nullable=True))
    if not column_exists('personas', 'preferred_content'):
        op.add_column('personas', sa.Column('preferred_content', sa.Text(), nullable=True))
    
    # Add new fields to segments table (if they don't exist)
    if not column_exists('segments', 'description'):
        op.add_column('segments', sa.Column('description', sa.Text(), nullable=True))
    if not column_exists('segments', 'industry'):
        op.add_column('segments', sa.Column('industry', sa.String(100), nullable=True))
    if not column_exists('segments', 'company_size'):
        op.add_column('segments', sa.Column('company_size', sa.String(50), nullable=True))
    if not column_exists('segments', 'region'):
        op.add_column('segments', sa.Column('region', sa.String(50), nullable=True))
    if not column_exists('segments', 'key_drivers'):
        op.add_column('segments', sa.Column('key_drivers', sa.Text(), nullable=True))
    if not column_exists('segments', 'pain_points'):
        op.add_column('segments', sa.Column('pain_points', sa.Text(), nullable=True))
    if not column_exists('segments', 'buying_criteria'):
        op.add_column('segments', sa.Column('buying_criteria', sa.Text(), nullable=True))
    
    # Add indexes for new fields (if they don't exist)
    if not index_exists('idx_segments_industry', 'segments'):
        op.create_index('idx_segments_industry', 'segments', ['industry'])
    if not index_exists('idx_segments_region', 'segments'):
        op.create_index('idx_segments_region', 'segments', ['region'])


def downgrade():
    op.drop_index('idx_segments_region', table_name='segments')
    op.drop_index('idx_segments_industry', table_name='segments')
    
    op.drop_column('segments', 'buying_criteria')
    op.drop_column('segments', 'pain_points')
    op.drop_column('segments', 'key_drivers')
    op.drop_column('segments', 'region')
    op.drop_column('segments', 'company_size')
    op.drop_column('segments', 'industry')
    op.drop_column('segments', 'description')
    
    op.drop_column('personas', 'preferred_content')
    op.drop_column('personas', 'challenges')
    op.drop_column('personas', 'goals')
    op.drop_column('personas', 'description')
    op.drop_column('personas', 'role')
