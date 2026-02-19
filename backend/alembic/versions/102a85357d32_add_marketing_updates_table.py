"""add_marketing_updates_table

Revision ID: 102a85357d32
Revises: 103600bf0724
Create Date: 2026-02-19 21:18:37.725848

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '102a85357d32'
down_revision = '103600bf0724'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create marketing_updates table
    op.create_table(
        'marketing_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('short_description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('subcategory', sa.String(length=100), nullable=True),
        sa.Column('universe_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('universe_name', sa.String(length=100), nullable=True),
        sa.Column('category_name', sa.String(length=255), nullable=True),
        sa.Column('product_name', sa.String(length=255), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('target_audience', sa.String(length=100), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['universe_id'], ['universes.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_marketing_updates_title', 'marketing_updates', ['title'])
    op.create_index('ix_marketing_updates_category', 'marketing_updates', ['category'])
    op.create_index('ix_marketing_updates_universe_name', 'marketing_updates', ['universe_name'])
    op.create_index('ix_marketing_updates_product_name', 'marketing_updates', ['product_name'])
    op.create_index('ix_marketing_updates_published_at', 'marketing_updates', ['published_at'])


def downgrade() -> None:
    op.drop_index('ix_marketing_updates_published_at', table_name='marketing_updates')
    op.drop_index('ix_marketing_updates_product_name', table_name='marketing_updates')
    op.drop_index('ix_marketing_updates_universe_name', table_name='marketing_updates')
    op.drop_index('ix_marketing_updates_category', table_name='marketing_updates')
    op.drop_index('ix_marketing_updates_title', table_name='marketing_updates')
    op.drop_table('marketing_updates')
