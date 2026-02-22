"""add_material_id_to_releases_updates

Revision ID: add_material_id
Revises: 102a85357d32
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_material_id'
down_revision = '102a85357d32'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add material_id to product_releases table
    op.add_column('product_releases', sa.Column('material_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_product_releases_material_id',
        'product_releases', 'materials',
        ['material_id'], ['id']
    )
    
    # Add material_id to marketing_updates table
    op.add_column('marketing_updates', sa.Column('material_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_marketing_updates_material_id',
        'marketing_updates', 'materials',
        ['material_id'], ['id']
    )


def downgrade() -> None:
    # Remove material_id from marketing_updates
    op.drop_constraint('fk_marketing_updates_material_id', 'marketing_updates', type_='foreignkey')
    op.drop_column('marketing_updates', 'material_id')
    
    # Remove material_id from product_releases
    op.drop_constraint('fk_product_releases_material_id', 'product_releases', type_='foreignkey')
    op.drop_column('product_releases', 'material_id')
