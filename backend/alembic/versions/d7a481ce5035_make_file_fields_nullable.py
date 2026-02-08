"""make_file_fields_nullable

Revision ID: d7a481ce5035
Revises: 006
Create Date: 2026-02-04 22:03:23.325227

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d7a481ce5035"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make file_path and file_name nullable to allow creating materials without files
    op.alter_column("materials", "file_path",
                    existing_type=sa.String(length=500),
                    nullable=True)
    op.alter_column("materials", "file_name",
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL (but this will fail if there are NULL values)
    op.alter_column("materials", "file_path",
                    existing_type=sa.String(length=500),
                    nullable=False)
    op.alter_column("materials", "file_name",
                    existing_type=sa.String(length=255),
                    nullable=False)
