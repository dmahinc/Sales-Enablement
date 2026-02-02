"""Add Sales Enablement Tracks

Revision ID: 005_add_tracks
Revises: 004_add_material_usage_tracking
Create Date: 2026-02-02 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_tracks'
down_revision = '004_add_material_usage_tracking'
branch_labels = None
depends_on = None


def upgrade():
    # Create tracks table
    op.create_table(
        'tracks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('use_case', sa.String(length=255), nullable=False),
        sa.Column('learning_objectives', sa.Text(), nullable=True),
        sa.Column('target_audience', sa.Text(), nullable=True),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_tracks_name', 'tracks', ['name'])
    op.create_index('ix_tracks_use_case', 'tracks', ['use_case'])
    
    # Create track_materials table
    op.create_table(
        'track_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('track_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('step_description', sa.Text(), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['track_id'], ['tracks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_track_materials_track_id', 'track_materials', ['track_id'])
    op.create_index('ix_track_materials_material_id', 'track_materials', ['material_id'])
    
    # Create track_progress table
    op.create_table(
        'track_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('track_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('completed_material_ids', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['track_id'], ['tracks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_track_progress_track_id', 'track_progress', ['track_id'])
    op.create_index('ix_track_progress_user_id', 'track_progress', ['user_id'])


def downgrade():
    op.drop_index('ix_track_progress_user_id', table_name='track_progress')
    op.drop_index('ix_track_progress_track_id', table_name='track_progress')
    op.drop_table('track_progress')
    
    op.drop_index('ix_track_materials_material_id', table_name='track_materials')
    op.drop_index('ix_track_materials_track_id', table_name='track_materials')
    op.drop_table('track_materials')
    
    op.drop_index('ix_tracks_use_case', table_name='tracks')
    op.drop_index('ix_tracks_name', table_name='tracks')
    op.drop_table('tracks')
