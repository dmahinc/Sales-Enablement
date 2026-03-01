"""Add shared_link_id to material_usage

Revision ID: 014
Revises: 013
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014'
down_revision = '77201c0b9d29'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('material_usage', sa.Column('shared_link_id', sa.Integer(), nullable=True))
    op.create_index('ix_material_usage_shared_link_id', 'material_usage', ['shared_link_id'])
    op.create_foreign_key(
        'fk_material_usage_shared_link_id',
        'material_usage', 'shared_links',
        ['shared_link_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    op.drop_constraint('fk_material_usage_shared_link_id', 'material_usage', type_='foreignkey')
    op.drop_index('ix_material_usage_shared_link_id', table_name='material_usage')
    op.drop_column('material_usage', 'shared_link_id')
