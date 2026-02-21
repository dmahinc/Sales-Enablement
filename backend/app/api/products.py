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


# Create request models
class ProductCreate(BaseModel):
    name: str
    display_name: str
    universe_id: int
    category_id: Optional[int] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    website_url: Optional[str] = None
    documentation_url: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    display_name: str
    universe_id: int
    description: Optional[str] = None


class UniverseCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product",
    description="Create a new product (Director/Admin only)"
)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new product"""
    # Check permissions - only Director/Admin can create products
    if current_user.role not in ['director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Directors and Admins can create products"
        )
    
    # Validate universe exists
    universe = db.query(Universe).filter(Universe.id == product_data.universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {product_data.universe_id} not found"
        )
    
    # Validate category if provided
    if product_data.category_id:
        category = db.query(Category).filter(Category.id == product_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {product_data.category_id} not found"
            )
        # Validate category belongs to universe
        if category.universe_id != product_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    # Check if product name already exists
    existing_product = db.query(Product).filter(Product.name == product_data.name).first()
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with name '{product_data.name}' already exists"
        )
    
    # Create product
    product = Product(
        name=product_data.name,
        display_name=product_data.display_name,
        universe_id=product_data.universe_id,
        category_id=product_data.category_id,
        short_description=product_data.short_description,
        description=product_data.description,
        phase=product_data.phase,
        website_url=product_data.website_url,
        documentation_url=product_data.documentation_url
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Category",
    description="Create a new product category (Director/Admin only)"
)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new category"""
    # Check permissions - only Director/Admin can create categories
    if current_user.role not in ['director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Directors and Admins can create categories"
        )
    
    # Validate universe exists
    universe = db.query(Universe).filter(Universe.id == category_data.universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {category_data.universe_id} not found"
        )
    
    # Check if category name already exists
    existing_category = db.query(Category).filter(Category.name == category_data.name).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with name '{category_data.name}' already exists"
        )
    
    # Create category
    category = Category(
        name=category_data.name,
        display_name=category_data.display_name,
        universe_id=category_data.universe_id,
        description=category_data.description
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return category


@router.get(
    "/universes",
    response_model=List[UniverseResponse],
    summary="List Universes",
    description="Get all product universes (Public Cloud, Private Cloud, Bare Metal, Hosting & Collaboration)",
    responses={
        200: {"description": "List of universes retrieved successfully"},
        401: {"description": "Authentication required"}
    }
)
async def list_universes(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all product universes.
    
    Returns the top-level product universes that organize the product hierarchy.
    By default, only active universes are returned.
    
    **Parameters:**
    - `include_inactive`: If true, includes inactive universes in the response
    
    **Returns:**
    - List of universe objects ordered by display_order and name
    """
    query = db.query(Universe)
    
    if not include_inactive:
        query = query.filter(Universe.is_active == True)
    
    universes = query.order_by(Universe.display_order, Universe.name).all()
    return universes


@router.get(
    "/categories",
    response_model=List[CategoryResponse],
    summary="List Categories",
    description="Get all product categories, optionally filtered by universe",
    responses={
        200: {"description": "List of categories retrieved successfully"},
        401: {"description": "Authentication required"}
    }
)
async def list_categories(
    universe_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all product categories.
    
    Returns product categories that group related products within universes.
    Can be filtered by universe ID.
    
    **Parameters:**
    - `universe_id`: (Optional) Filter categories by universe ID
    - `include_inactive`: If true, includes inactive categories in the response
    
    **Returns:**
    - List of category objects ordered by display_order and name
    """
    query = db.query(Category)
    
    if universe_id:
        query = query.filter(Category.universe_id == universe_id)
    
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    categories = query.order_by(Category.display_order, Category.name).all()
    return categories


@router.get(
    "/",
    response_model=List[ProductResponse],
    summary="List Products",
    description="Get all products, optionally filtered by universe and/or category",
    responses={
        200: {"description": "List of products retrieved successfully"},
        401: {"description": "Authentication required"}
    }
)
async def list_products(
    universe_id: Optional[int] = None,
    category_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all products.
    
    Returns individual OVHcloud products. Can be filtered by universe and/or category.
    
    **Parameters:**
    - `universe_id`: (Optional) Filter products by universe ID
    - `category_id`: (Optional) Filter products by category ID
    - `include_inactive`: If true, includes inactive products in the response
    
    **Returns:**
    - List of product objects ordered by display_order and name
    """
    query = db.query(Product)
    
    if universe_id:
        query = query.filter(Product.universe_id == universe_id)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    
    products = query.order_by(Product.display_order, Product.name).all()
    return products


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get Product",
    description="Get details of a specific product by ID",
    responses={
        200: {"description": "Product retrieved successfully"},
        404: {"description": "Product not found"},
        401: {"description": "Authentication required"}
    }
)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific product by ID.
    
    **Parameters:**
    - `product_id`: ID of the product to retrieve
    
    **Returns:**
    - Product object with full details
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product
