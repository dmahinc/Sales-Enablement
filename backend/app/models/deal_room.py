"""
DealRoom model - Digital Sales Room (DSR) for curated deal presentations
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets
from app.models.base import BaseModel


class DealRoom(BaseModel):
    """
    Digital Sales Room - branded microsite per opportunity.
    Curated collection of materials, persona sections, action plan, messaging.
    """
    __tablename__ = "deal_rooms"

    # Identification
    unique_token = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Ownership
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Customer / opportunity
    customer_email = Column(String(255), nullable=True, index=True)
    customer_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    opportunity_name = Column(String(255), nullable=True)

    # Branding & welcome
    welcome_message = Column(Text, nullable=True)
    executive_summary = Column(Text, nullable=True)
    welcome_video_url = Column(String(500), nullable=True)
    # OVHcloud branding is default; custom_logo_url optional for future

    # Lifecycle
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(days=90))
    is_active = Column(Boolean, default=True, nullable=False)

    # Engagement tracking
    access_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    unique_visitors = Column(Integer, default=0, nullable=False)

    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    room_materials = relationship(
        "DealRoomMaterial",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="DealRoomMaterial.display_order",
    )
    action_plan_items = relationship(
        "ActionPlanItem",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="ActionPlanItem.display_order",
    )
    messages = relationship(
        "RoomMessage",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="RoomMessage.created_at",
    )

    __table_args__ = (
        Index("idx_deal_rooms_created_by", "created_by_user_id"),
        Index("idx_deal_rooms_customer", "customer_email"),
        Index("idx_deal_rooms_active", "is_active", "expires_at"),
    )

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(32)

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        return self.is_active and not self.is_expired()

    def record_access(self):
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()


class DealRoomMaterial(BaseModel):
    """
    Material in a deal room, optionally in a persona-specific section.
    """
    __tablename__ = "deal_room_materials"

    deal_room_id = Column(Integer, ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    persona_id = Column(Integer, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True)
    section_name = Column(String(100), nullable=True)  # e.g. "CTO view", "CFO view"
    display_order = Column(Integer, default=0, nullable=False)

    deal_room = relationship("DealRoom", back_populates="room_materials")
    material = relationship("Material", backref="deal_room_associations")
    persona = relationship("Persona", backref="deal_room_material_refs")

    __table_args__ = (
        Index("idx_deal_room_materials_room", "deal_room_id"),
        Index("idx_deal_room_materials_material", "material_id"),
    )


class ActionPlanItem(BaseModel):
    """
    Mutual action plan milestone for a deal room.
    """
    __tablename__ = "action_plan_items"

    deal_room_id = Column(Integer, ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, in_progress, completed
    assignee = Column(String(50), nullable=True)  # "sales" | "customer" | "both"
    display_order = Column(Integer, default=0, nullable=False)

    deal_room = relationship("DealRoom", back_populates="action_plan_items")

    __table_args__ = (Index("idx_action_plan_items_room", "deal_room_id"),)


class RoomMessage(BaseModel):
    """
    Two-way messaging between sales rep and buying committee within a deal room.
    """
    __tablename__ = "room_messages"

    deal_room_id = Column(Integer, ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    message = Column(Text, nullable=False)
    sent_by_customer = Column(Boolean, default=False, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    parent_message_id = Column(Integer, ForeignKey("room_messages.id", ondelete="SET NULL"), nullable=True)

    deal_room = relationship("DealRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_user_id])
    parent_message = relationship("RoomMessage", remote_side="RoomMessage.id", backref="replies")

    __table_args__ = (
        Index("idx_room_messages_room", "deal_room_id"),
        Index("idx_room_messages_sender", "sender_user_id"),
        Index("idx_room_messages_thread", "parent_message_id"),
    )
