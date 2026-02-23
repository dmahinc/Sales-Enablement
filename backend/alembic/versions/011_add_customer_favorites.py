"""Add customer_favorites table

Revision ID: 011
Revises: 010
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    # Create customer_favorites table
    op.create_table(
        'customer_favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_customer_favorites_customer', 'customer_favorites', ['customer_id'])
    op.create_index('idx_customer_favorites_material', 'customer_favorites', ['material_id'])
    
    # Create unique constraint
    op.create_unique_constraint('uq_customer_favorite', 'customer_favorites', ['customer_id', 'material_id'])


def downgrade():
    op.drop_constraint('uq_customer_favorite', 'customer_favorites', type_='unique')
    op.drop_index('idx_customer_favorites_material', table_name='customer_favorites')
    op.drop_index('idx_customer_favorites_customer', table_name='customer_favorites')
    op.drop_table('customer_favorites')
