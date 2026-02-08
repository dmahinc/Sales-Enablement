"""Add product hierarchy tables (universes, categories, products)

Revision ID: 007_add_product_hierarchy
Revises: 006_add_shared_links
Create Date: 2026-02-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_add_product_hierarchy'
down_revision = 'd7a481ce5035'
branch_labels = None
depends_on = None


def upgrade():
    # Create universes table
    op.create_table(
        'universes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon_url', sa.String(length=500), nullable=True),
        sa.Column('icon_name', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_universes_name', 'universes', ['name'])
    
    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon_url', sa.String(length=500), nullable=True),
        sa.Column('icon_name', sa.String(length=100), nullable=True),
        sa.Column('universe_id', sa.Integer(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['universe_id'], ['universes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_categories_name', 'categories', ['name'])
    op.create_index('ix_categories_universe_id', 'categories', ['universe_id'])
    
    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('short_description', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('universe_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('product_type', sa.String(length=50), nullable=True),
        sa.Column('phase', sa.String(length=50), nullable=True),
        sa.Column('visibility', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('website_url', sa.String(length=500), nullable=True),
        sa.Column('documentation_url', sa.String(length=500), nullable=True),
        sa.Column('hardware_tenancy', sa.String(length=50), nullable=True),
        sa.Column('public_network', sa.String(length=100), nullable=True),
        sa.Column('private_network', sa.String(length=100), nullable=True),
        sa.Column('code_automation', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('datacenter_availability', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('certifications', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('material_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['universe_id'], ['universes.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_products_name', 'products', ['name'])
    op.create_index('ix_products_universe_id', 'products', ['universe_id'])
    op.create_index('ix_products_category_id', 'products', ['category_id'])
    
    # Add product_id foreign key to materials table (optional, for future use)
    # For now, we'll keep product_name as string for backward compatibility
    # op.add_column('materials', sa.Column('product_id', sa.Integer(), nullable=True))
    # op.create_foreign_key('fk_materials_product_id', 'materials', 'products', ['product_id'], ['id'])
    # op.create_index('ix_materials_product_id', 'materials', ['product_id'])


def downgrade():
    # Drop indexes first
    # op.drop_index('ix_materials_product_id', table_name='materials')
    # op.drop_constraint('fk_materials_product_id', 'materials', type_='foreignkey')
    # op.drop_column('materials', 'product_id')
    
    op.drop_index('ix_products_category_id', table_name='products')
    op.drop_index('ix_products_universe_id', table_name='products')
    op.drop_index('ix_products_name', table_name='products')
    op.drop_table('products')
    
    op.drop_index('ix_categories_universe_id', table_name='categories')
    op.drop_index('ix_categories_name', table_name='categories')
    op.drop_table('categories')
    
    op.drop_index('ix_universes_name', table_name='universes')
    op.drop_table('universes')
