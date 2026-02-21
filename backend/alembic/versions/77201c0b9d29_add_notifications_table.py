"""add_notifications_table

Revision ID: 77201c0b9d29
Revises: 102a85357d32
Create Date: 2026-02-19 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '77201c0b9d29'
down_revision = '102a85357d32'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('link_path', sa.String(length=255), nullable=True),
        sa.Column('sent_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['sent_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_title', 'notifications', ['title'])
    op.create_index('ix_notifications_notification_type', 'notifications', ['notification_type'])
    op.create_index('ix_notifications_target_id', 'notifications', ['target_id'])
    
    # Create notification_recipients junction table
    op.create_table(
        'notification_recipients',
        sa.Column('notification_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('notification_id', 'user_id')
    )
    op.create_index('ix_notification_recipients_user_id', 'notification_recipients', ['user_id'])
    op.create_index('ix_notification_recipients_is_read', 'notification_recipients', ['is_read'])


def downgrade() -> None:
    op.drop_index('ix_notification_recipients_is_read', table_name='notification_recipients')
    op.drop_index('ix_notification_recipients_user_id', table_name='notification_recipients')
    op.drop_table('notification_recipients')
    op.drop_index('ix_notifications_target_id', table_name='notifications')
    op.drop_index('ix_notifications_notification_type', table_name='notifications')
    op.drop_index('ix_notifications_title', table_name='notifications')
    op.drop_table('notifications')
