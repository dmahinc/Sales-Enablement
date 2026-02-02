"""Update Persona and Segment models to match Product Brief

Revision ID: 003_update_persona_segment_fields
Revises: 002_add_indexes
Create Date: 2026-02-02 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_update_persona_segment_fields'
down_revision = '002_add_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add new fields to personas table
    op.add_column('personas', sa.Column('role', sa.String(100), nullable=True))
    op.add_column('personas', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('personas', sa.Column('goals', sa.Text(), nullable=True))
    op.add_column('personas', sa.Column('challenges', sa.Text(), nullable=True))
    op.add_column('personas', sa.Column('preferred_content', sa.Text(), nullable=True))
    
    # Add new fields to segments table
    op.add_column('segments', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('segments', sa.Column('industry', sa.String(100), nullable=True))
    op.add_column('segments', sa.Column('company_size', sa.String(50), nullable=True))
    op.add_column('segments', sa.Column('region', sa.String(50), nullable=True))
    op.add_column('segments', sa.Column('key_drivers', sa.Text(), nullable=True))
    op.add_column('segments', sa.Column('pain_points', sa.Text(), nullable=True))
    op.add_column('segments', sa.Column('buying_criteria', sa.Text(), nullable=True))
    
    # Add indexes for new fields
    op.create_index('idx_segments_industry', 'segments', ['industry'])
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
