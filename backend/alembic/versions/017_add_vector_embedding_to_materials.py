"""Add vector embedding and tsvector columns to materials for semantic search

Revision ID: 017
Revises: 016
"""

from alembic import op
import sqlalchemy as sa


revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS vector;')

    op.add_column('materials', sa.Column('embedding', sa.Text(), nullable=True))

    op.execute("""
        ALTER TABLE materials 
        ADD COLUMN IF NOT EXISTS embedding_vec vector(384);
    """)

    op.add_column('materials', sa.Column(
        'search_text',
        sa.Text(),
        nullable=True,
    ))

    op.execute("""
        ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS search_tsv tsvector;
    """)

    op.execute("""
        UPDATE materials SET search_tsv = 
            to_tsvector('english',
                coalesce(name, '') || ' ' ||
                coalesce(description, '') || ' ' ||
                coalesce(product_name, '') || ' ' ||
                coalesce(universe_name, '') || ' ' ||
                coalesce(tags, '') || ' ' ||
                coalesce(keywords, '') || ' ' ||
                coalesce(use_cases, '') || ' ' ||
                coalesce(pain_points, '') || ' ' ||
                coalesce(executive_summary, '')
            );
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_materials_search_tsv 
        ON materials USING GIN (search_tsv);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_materials_embedding_vec 
        ON materials USING hnsw (embedding_vec vector_cosine_ops);
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION materials_search_tsv_trigger() RETURNS trigger AS $$
        BEGIN
            NEW.search_tsv := to_tsvector('english',
                coalesce(NEW.name, '') || ' ' ||
                coalesce(NEW.description, '') || ' ' ||
                coalesce(NEW.product_name, '') || ' ' ||
                coalesce(NEW.universe_name, '') || ' ' ||
                coalesce(NEW.tags, '') || ' ' ||
                coalesce(NEW.keywords, '') || ' ' ||
                coalesce(NEW.use_cases, '') || ' ' ||
                coalesce(NEW.pain_points, '') || ' ' ||
                coalesce(NEW.executive_summary, '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS trg_materials_search_tsv ON materials;
        CREATE TRIGGER trg_materials_search_tsv
        BEFORE INSERT OR UPDATE ON materials
        FOR EACH ROW EXECUTE FUNCTION materials_search_tsv_trigger();
    """)


def downgrade():
    op.execute('DROP TRIGGER IF EXISTS trg_materials_search_tsv ON materials;')
    op.execute('DROP FUNCTION IF EXISTS materials_search_tsv_trigger();')
    op.execute('DROP INDEX IF EXISTS idx_materials_embedding_vec;')
    op.execute('DROP INDEX IF EXISTS idx_materials_search_tsv;')
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS search_tsv;')
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS search_text;')
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS embedding_vec;')
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS embedding;')
