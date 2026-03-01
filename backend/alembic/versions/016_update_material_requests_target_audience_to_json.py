"""Update material_requests target_audience to JSON

Revision ID: 016
Revises: 015
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    # Change target_audience from VARCHAR(50) to JSONB
    op.execute("""
        ALTER TABLE material_requests 
        ALTER COLUMN target_audience TYPE JSONB 
        USING CASE 
            WHEN target_audience IS NULL THEN NULL
            ELSE target_audience::jsonb
        END
    """)


def downgrade():
    # Change back to VARCHAR(50)
    op.execute("""
        ALTER TABLE material_requests 
        ALTER COLUMN target_audience TYPE VARCHAR(50) 
        USING CASE 
            WHEN target_audience IS NULL THEN NULL
            ELSE target_audience::text
        END
    """)
