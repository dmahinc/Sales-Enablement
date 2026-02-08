"""Add material usage tracking table

Revision ID: 004_add_material_usage_tracking
Revises: 003_update_persona_segment_fields
Create Date: 2026-02-02 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_add_material_usage_tracking'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Create material_usage table
    op.create_table(
        'material_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_material_usage_material_id', 'material_usage', ['material_id'])
    op.create_index('ix_material_usage_user_id', 'material_usage', ['user_id'])
    op.create_index('ix_material_usage_action', 'material_usage', ['action'])
    op.create_index('ix_material_usage_used_at', 'material_usage', ['used_at'])


def downgrade():
    op.drop_index('ix_material_usage_used_at', table_name='material_usage')
    op.drop_index('ix_material_usage_action', table_name='material_usage')
    op.drop_index('ix_material_usage_user_id', table_name='material_usage')
    op.drop_index('ix_material_usage_material_id', table_name='material_usage')
    op.drop_table('material_usage')
