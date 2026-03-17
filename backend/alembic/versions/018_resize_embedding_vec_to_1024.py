"""Resize embedding_vec from 384 to 1024 for OVH BGE-M3

Revision ID: 018
Revises: 017
"""

from alembic import op


revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade():
    # Drop HNSW index before altering column
    op.execute('DROP INDEX IF EXISTS idx_materials_embedding_vec;')

    # Drop old vector(384) column
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS embedding_vec;')

    # Add new vector(1024) column for BGE-M3
    op.execute('ALTER TABLE materials ADD COLUMN embedding_vec vector(1024);')

    # Recreate HNSW index for cosine similarity
    op.execute("""
        CREATE INDEX idx_materials_embedding_vec
        ON materials USING hnsw (embedding_vec vector_cosine_ops);
    """)

    # Clear embedding JSON so /api/embeddings/generate will regenerate all materials
    op.execute('UPDATE materials SET embedding = NULL;')


def downgrade():
    op.execute('DROP INDEX IF EXISTS idx_materials_embedding_vec;')
    op.execute('ALTER TABLE materials DROP COLUMN IF EXISTS embedding_vec;')
    op.execute('ALTER TABLE materials ADD COLUMN embedding_vec vector(384);')
    op.execute("""
        CREATE INDEX idx_materials_embedding_vec
        ON materials USING hnsw (embedding_vec vector_cosine_ops);
    """)
    op.execute('UPDATE materials SET embedding = NULL;')
