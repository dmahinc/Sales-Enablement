"""Add material_requests table

Revision ID: 015
Revises: 014
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    material_request_status = postgresql.ENUM('pending', 'acknowledged', 'delivered', 'closed', name='materialrequeststatus')
    material_request_status.create(op.get_bind(), checkfirst=True)
    
    material_request_close_reason = postgresql.ENUM('already_exists', 'planned_later', 'not_planned', name='materialrequestclosereason')
    material_request_close_reason.create(op.get_bind(), checkfirst=True)
    
    # Create material_requests table
    op.create_table(
        'material_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('material_type', sa.String(length=50), nullable=False),
        sa.Column('products', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('target_audience', sa.String(length=50), nullable=True),
        sa.Column('use_case', sa.Text(), nullable=True),
        sa.Column('needed_by_date', sa.DateTime(), nullable=True),
        sa.Column('additional_notes', sa.Text(), nullable=True),
        sa.Column('status', material_request_status, nullable=True, server_default='pending'),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('eta_date', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('close_reason', material_request_close_reason, nullable=True),
        sa.Column('close_reason_details', sa.Text(), nullable=True),
        sa.Column('existing_material_id', sa.Integer(), nullable=True),
        sa.Column('planned_date', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_material_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['delivered_material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['existing_material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_requests_assigned_to_id'), 'material_requests', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_material_requests_requester_id'), 'material_requests', ['requester_id'], unique=False)
    op.create_index(op.f('ix_material_requests_status'), 'material_requests', ['status'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_material_requests_status'), table_name='material_requests')
    op.drop_index(op.f('ix_material_requests_requester_id'), table_name='material_requests')
    op.drop_index(op.f('ix_material_requests_assigned_to_id'), table_name='material_requests')
    op.drop_table('material_requests')
    
    # Drop enum types
    sa.Enum(name='materialrequeststatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='materialrequestclosereason').drop(op.get_bind(), checkfirst=True)
