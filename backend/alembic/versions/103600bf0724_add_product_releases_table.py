"""add_product_releases_table

Revision ID: 103600bf0724
Revises: 09c95dcb15cd
Create Date: 2026-02-19 19:45:17.402217

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '103600bf0724'
down_revision = '09c95dcb15cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create product_releases table
    op.create_table(
        'product_releases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('short_description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('universe_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('universe_name', sa.String(length=100), nullable=True),
        sa.Column('category_name', sa.String(length=255), nullable=True),
        sa.Column('product_name', sa.String(length=255), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['universe_id'], ['universes.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_product_releases_title', 'product_releases', ['title'])
    op.create_index('ix_product_releases_universe_name', 'product_releases', ['universe_name'])
    op.create_index('ix_product_releases_product_name', 'product_releases', ['product_name'])
    op.create_index('ix_product_releases_published_at', 'product_releases', ['published_at'])


def downgrade() -> None:
    op.drop_index('ix_product_releases_published_at', table_name='product_releases')
    op.drop_index('ix_product_releases_product_name', table_name='product_releases')
    op.drop_index('ix_product_releases_universe_name', table_name='product_releases')
    op.drop_index('ix_product_releases_title', table_name='product_releases')
    op.drop_table('product_releases')
