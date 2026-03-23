"""DealRoomTemplate model for reusable DSR structures"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy import JSON
from app.models.base import BaseModel


class DealRoomTemplate(BaseModel):
    """
    Reusable template for Digital Sales Rooms.
    Stores structure (materials, action plan) that can be cloned into a new room.
    """
    __tablename__ = "deal_room_templates"

    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    welcome_message = Column(Text, nullable=True)
    executive_summary = Column(Text, nullable=True)
    welcome_video_url = Column(String(500), nullable=True)
    materials_json = Column(JSON, nullable=True)  # [{material_id, section_name, display_order}]
    action_plan_json = Column(JSON, nullable=True)  # [{title, description, due_date, status, assignee}]
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_by = relationship("User", foreign_keys=[created_by_user_id])

    __table_args__ = (Index("idx_deal_room_templates_name", "name"),)
