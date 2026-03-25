"""merge all heads (linear continuation from DSR branch)

Revision ID: f3e021285562
Revises: 023

This revision exists so deployments on the 018→021→022→023 line can run
`alembic upgrade head` without applying unrelated parallel branches (019, 09c95dcb15cd,
add_material_id) that may already be partially applied or conflict.

Other migration branches remain in the repo for environments that track them; the
canonical production line for this app is 021→022→023→f3e021285562.

Create Date: 2026-03-24 22:58:31.609219

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3e021285562'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
