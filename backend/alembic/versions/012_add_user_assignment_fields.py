"""Add user assignment fields (assigned_sales_id, created_by_id)

Revision ID: 012
Revises: 011
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    # Add assigned_sales_id column
    op.add_column('users', sa.Column('assigned_sales_id', sa.Integer(), nullable=True))
    op.create_index('ix_users_assigned_sales_id', 'users', ['assigned_sales_id'])
    op.create_foreign_key('fk_users_assigned_sales', 'users', 'users', ['assigned_sales_id'], ['id'])
    
    # Add created_by_id column
    op.add_column('users', sa.Column('created_by_id', sa.Integer(), nullable=True))
    op.create_index('ix_users_created_by_id', 'users', ['created_by_id'])
    op.create_foreign_key('fk_users_created_by', 'users', 'users', ['created_by_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_users_created_by', 'users', type_='foreignkey')
    op.drop_index('ix_users_created_by_id', table_name='users')
    op.drop_column('users', 'created_by_id')
    
    op.drop_constraint('fk_users_assigned_sales', 'users', type_='foreignkey')
    op.drop_index('ix_users_assigned_sales_id', table_name='users')
    op.drop_column('users', 'assigned_sales_id')
