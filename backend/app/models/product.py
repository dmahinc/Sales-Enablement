"""
Product hierarchy models - represents OVHcloud products organized by universe and category
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Universe(BaseModel):
    """Product Universe model (Public Cloud, Private Cloud, Bare Metal, Hosting & Collaboration)"""
    __tablename__ = "universes"
    
    # Basic Information
    name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    icon_url = Column(String(500))  # URL to icon
    icon_name = Column(String(100))  # Icon identifier (e.g., 'Cloud', 'Server')
    color = Column(String(50))  # Color code (e.g., '#0050d7')
    
    # Ordering
    display_order = Column(Integer, default=0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    
    # Relationships
    categories = relationship("Category", back_populates="universe", lazy="dynamic")
    products = relationship("Product", back_populates="universe", lazy="dynamic")


class Category(BaseModel):
    """Product Category model (e.g., AI & Machine Learning, Compute, Storage)"""
    __tablename__ = "categories"
    
    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    icon_url = Column(String(500))
    icon_name = Column(String(100))
    
    # Hierarchy
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=False, index=True)
    universe = relationship("Universe", back_populates="categories")
    
    # Ordering
    display_order = Column(Integer, default=0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    
    # Relationships
    products = relationship("Product", back_populates="category", lazy="dynamic")


class Product(BaseModel):
    """Product model - represents individual OVHcloud products"""
    __tablename__ = "products"
    
    # Basic Information
    name = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    short_description = Column(Text)
    description = Column(Text)
    
    # Hierarchy
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=False, index=True)
    universe = relationship("Universe", back_populates="products")
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    category = relationship("Category", back_populates="products")
    
    # Product Details
    product_type = Column(String(50))  # iaas, paas, saas
    phase = Column(String(50))  # general_avail, beta, research_dev, etc.
    visibility = Column(Boolean, default=True)
    
    # Links
    website_url = Column(String(500))
    documentation_url = Column(String(500))
    
    # Technical Details
    hardware_tenancy = Column(String(50))  # single_tenant, multi_tenant
    public_network = Column(String(100))  # public_ipv4, public_ipv6, unavailable
    private_network = Column(String(100))  # private_ipv4, private_ipv6, unavailable
    code_automation = Column(Boolean, default=False)
    
    # Datacenter Availability (stored as JSON for flexibility)
    datacenter_availability = Column(JSON)  # {"gravelines": true, "roubaix": false, ...}
    
    # Certifications (stored as JSON)
    certifications = Column(JSON)  # {"iso_27001": true, "hds": true, ...}
    
    # Ordering
    display_order = Column(Integer, default=0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    
    # Usage tracking
    material_count = Column(Integer, default=0)  # Count of materials associated with this product
