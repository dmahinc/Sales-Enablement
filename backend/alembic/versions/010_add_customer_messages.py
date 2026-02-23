"""Add customer_messages table and customer role support

Revision ID: 010
Revises: 009
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'  # Points to 009_add_executive_summary_to_materials
branch_labels = None
depends_on = None


def upgrade():
    # Create customer_messages table
    op.create_table(
        'customer_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('sales_contact_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('sent_by_customer', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('parent_message_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sales_contact_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_message_id'], ['customer_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_customer_messages_customer', 'customer_messages', ['customer_id'])
    op.create_index('idx_customer_messages_sales', 'customer_messages', ['sales_contact_id'])
    op.create_index('idx_customer_messages_thread', 'customer_messages', ['parent_message_id'])
    op.create_index('idx_customer_messages_unread', 'customer_messages', ['customer_id', 'is_read'])


def downgrade():
    op.drop_index('idx_customer_messages_unread', table_name='customer_messages')
    op.drop_index('idx_customer_messages_thread', table_name='customer_messages')
    op.drop_index('idx_customer_messages_sales', table_name='customer_messages')
    op.drop_index('idx_customer_messages_customer', table_name='customer_messages')
    op.drop_table('customer_messages')
