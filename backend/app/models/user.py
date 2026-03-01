"""
User model - represents PMMs and other users
"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
# Import notification_recipients table to ensure it's available for relationship
try:
    from app.models.notification import notification_recipients  # noqa: F401
except ImportError:
    pass

class User(BaseModel):
    """User model"""
    __tablename__ = "users"
    
    # Basic Information
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    
    # Authentication
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Role
    role = Column(String(50), default="pmm")  # pmm, director, sales, admin, customer
    
    # Customer assignment (for customer role)
    assigned_sales_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Sales person assigned to this customer
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # User who created this account
    
    # Relationships (using string references to avoid circular imports)
    # Specify foreign_keys to avoid ambiguity since Material has both owner_id and pmm_in_charge_id
    materials = relationship("Material", back_populates="owner", foreign_keys="Material.owner_id", lazy="dynamic")
    notifications = relationship("Notification", secondary="notification_recipients", back_populates="recipients")
    assigned_sales = relationship("User", foreign_keys=[assigned_sales_id], remote_side="User.id", backref="assigned_customers")
    creator = relationship("User", foreign_keys=[created_by_id], remote_side="User.id", backref="created_users")
