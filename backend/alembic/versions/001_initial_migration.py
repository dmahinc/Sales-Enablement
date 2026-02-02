"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create segments table
    op.create_table(
        'segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('characteristics', sa.Text(), nullable=True),
        sa.Column('firmographics', sa.Text(), nullable=True),
        sa.Column('technographics', sa.Text(), nullable=True),
        sa.Column('buying_behavior', sa.Text(), nullable=True),
        sa.Column('pain_points', sa.Text(), nullable=True),
        sa.Column('messaging_preferences', sa.Text(), nullable=True),
        sa.Column('parent_segment_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_by_ids', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('approval_count', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_segment_id'], ['segments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_segments_id'), 'segments', ['id'], unique=False)
    op.create_index(op.f('ix_segments_name'), 'segments', ['name'], unique=True)

    # Create personas table
    op.create_table(
        'personas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('characteristics', sa.Text(), nullable=True),
        sa.Column('pain_points', sa.Text(), nullable=True),
        sa.Column('buying_behavior', sa.Text(), nullable=True),
        sa.Column('messaging_preferences', sa.Text(), nullable=True),
        sa.Column('segment_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_by_ids', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('approval_count', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['segment_id'], ['segments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_personas_id'), 'personas', ['id'], unique=False)
    op.create_index(op.f('ix_personas_name'), 'personas', ['name'], unique=True)

    # Create materials table
    op.create_table(
        'materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('material_type', sa.String(length=50), nullable=False),
        sa.Column('audience', sa.String(length=50), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=True),
        sa.Column('universe_name', sa.String(length=255), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_format', sa.String(length=50), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=True),
        sa.Column('completeness_score', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('health_score', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('keywords', sa.Text(), nullable=True),
        sa.Column('use_cases', sa.Text(), nullable=True),
        sa.Column('pain_points', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_materials_id'), 'materials', ['id'], unique=False)
    op.create_index(op.f('ix_materials_name'), 'materials', ['name'], unique=False)
    op.create_index(op.f('ix_materials_product_name'), 'materials', ['product_name'], unique=False)
    op.create_index(op.f('ix_materials_universe_name'), 'materials', ['universe_name'], unique=False)

    # Create content_blocks table
    op.create_table(
        'content_blocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('block_type', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('keywords', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('use_cases', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('products', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('segments', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('personas', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('core_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('rating_average', sa.Float(), nullable=True),
        sa.Column('rating_count', sa.Integer(), nullable=True),
        sa.Column('comment_count', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_content_blocks_id'), 'content_blocks', ['id'], unique=False)
    op.create_index(op.f('ix_content_blocks_title'), 'content_blocks', ['title'], unique=False)

    # Create association tables
    op.create_table(
        'material_persona',
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['persona_id'], ['personas.id'], ),
        sa.PrimaryKeyConstraint('material_id', 'persona_id')
    )

    op.create_table(
        'material_segment',
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('segment_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['segment_id'], ['segments.id'], ),
        sa.PrimaryKeyConstraint('material_id', 'segment_id')
    )

    # Create content block ratings and comments
    op.create_table(
        'content_block_ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('content_block_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['content_block_id'], ['content_blocks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'content_block_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('content_block_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['content_block_id'], ['content_blocks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'content_block_usages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('content_block_id', sa.Integer(), nullable=True),
        sa.Column('material_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['content_block_id'], ['content_blocks.id'], ),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create material health history
    op.create_table(
        'material_health_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('material_id', sa.Integer(), nullable=True),
        sa.Column('freshness_score', sa.Integer(), nullable=True),
        sa.Column('completeness_score', sa.Integer(), nullable=True),
        sa.Column('usage_score', sa.Integer(), nullable=True),
        sa.Column('performance_score', sa.Integer(), nullable=True),
        sa.Column('overall_health_score', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('material_health_history')
    op.drop_table('content_block_usages')
    op.drop_table('content_block_comments')
    op.drop_table('content_block_ratings')
    op.drop_table('material_segment')
    op.drop_table('material_persona')
    op.drop_table('content_blocks')
    op.drop_table('materials')
    op.drop_table('personas')
    op.drop_table('segments')
    op.drop_table('users')
