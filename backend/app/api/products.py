"""
Products API endpoints - Product hierarchy (universes, categories, products)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.product import Universe, Category, Product
from pydantic import BaseModel

router = APIRouter(prefix="/api/products", tags=["products"])


# Response models
class UniverseResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    icon_name: Optional[str] = None
    color: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    universe_id: int
    display_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    universe_id: int
    category_id: Optional[int] = None
    display_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


@router.get("/universes", response_model=List[UniverseResponse])
async def list_universes(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all universes"""
    query = db.query(Universe)
    
    if not include_inactive:
        query = query.filter(Universe.is_active == True)
    
    universes = query.order_by(Universe.display_order, Universe.name).all()
    return universes


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    universe_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all categories, optionally filtered by universe"""
    query = db.query(Category)
    
    if universe_id:
        query = query.filter(Category.universe_id == universe_id)
    
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    categories = query.order_by(Category.display_order, Category.name).all()
    return categories


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    universe_id: Optional[int] = None,
    category_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all products, optionally filtered by universe and/or category"""
    query = db.query(Product)
    
    if universe_id:
        query = query.filter(Product.universe_id == universe_id)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    
    products = query.order_by(Product.display_order, Product.name).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product
