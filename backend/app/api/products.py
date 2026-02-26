"""
Products API endpoints - Product hierarchy (universes, categories, products)
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import os
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


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    universe_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    universe_id: Optional[int] = None
    category_id: Optional[int] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    website_url: Optional[str] = None
    documentation_url: Optional[str] = None
    is_active: Optional[bool] = None


class UniverseCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None


@router.post(
    "/",
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


@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Update Category",
    description="Update an existing product category (Director/Admin only)"
)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing category"""
    # Check permissions - only Director/Admin can update categories
    if current_user.role not in ['director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Directors and Admins can update categories"
        )
    
    # Get existing category
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    
    # Validate universe if being updated
    universe_id = category_data.universe_id if category_data.universe_id is not None else category.universe_id
    if category_data.universe_id is not None:
        universe = db.query(Universe).filter(Universe.id == category_data.universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {category_data.universe_id} not found"
            )
    
    # Check if category name already exists (if name is being changed)
    if category_data.name and category_data.name != category.name:
        existing_category = db.query(Category).filter(Category.name == category_data.name).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with name '{category_data.name}' already exists"
            )
    
    # Update category fields
    update_data = category_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    
    return category


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update Product",
    description="Update an existing product (Director/Admin only)"
)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing product"""
    # Check permissions - only Director/Admin can update products
    if current_user.role not in ['director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Directors and Admins can update products"
        )
    
    # Get existing product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )
    
    # Validate universe if being updated
    universe_id = product_data.universe_id if product_data.universe_id is not None else product.universe_id
    if product_data.universe_id is not None:
        universe = db.query(Universe).filter(Universe.id == product_data.universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {product_data.universe_id} not found"
            )
    
    # Validate category if being updated
    category_id = product_data.category_id if product_data.category_id is not None else product.category_id
    if product_data.category_id is not None:
        if product_data.category_id:  # Only validate if not None and not empty
            category = db.query(Category).filter(Category.id == product_data.category_id).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category with id {product_data.category_id} not found"
                )
            # Validate category belongs to universe
            if category.universe_id != universe_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category does not belong to selected universe"
                )
    
    # Check if product name already exists (if name is being changed)
    if product_data.name and product_data.name != product.name:
        existing_product = db.query(Product).filter(Product.name == product_data.name).first()
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with name '{product_data.name}' already exists"
            )
    
    # Update product fields
    update_data = product_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    
    return product


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


@router.get(
    "/icons/{product_name:path}",
    summary="Get Product Icon Path",
    description="Get the icon path for a product by name"
)
async def get_product_icon(
    product_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the icon path for a product by its name or display_name.
    Checks both the database products and the filesystem.
    """
    from pathlib import Path
    
    # Normalize product name for matching (multiple variations)
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        # Remove special characters, lowercase, replace spaces with underscores
        normalized = name.lower().strip().replace(' ', '_').replace('/', '_').replace('-', '_')
        # Remove any remaining special characters
        normalized = ''.join(c if c.isalnum() or c == '_' else '' for c in normalized)
        return normalized
    
    # Create multiple normalized variations for matching
    normalized_variations = [
        normalize_name(product_name),
        product_name.lower().replace(' ', '_'),
        product_name.lower().replace(' ', '-'),
        product_name.lower().replace('_', ' ').replace(' ', '_'),  # Handle mixed formats
    ]
    # Remove duplicates and empty strings
    normalized_variations = list(set([v for v in normalized_variations if v]))
    
    # Try to find product in database
    products = db.query(Product).filter(
        (Product.name.ilike(f"%{product_name}%")) |
        (Product.display_name.ilike(f"%{product_name}%"))
    ).all()
    
    # Base icon directory
    base_icon_dir = Path("/app/icons/products")
    
    # Try to find icon for each matching product
    for product in products:
        # Try different path patterns
        possible_paths = []
        
        # Pattern 1: universe/product_name.ext
        universe = db.query(Universe).filter(Universe.id == product.universe_id).first()
        if universe:
            # Try both name and display_name variations
            for name_var in [product.name, product.display_name]:
                normalized_var = normalize_name(name_var)
                possible_paths.append(base_icon_dir / universe.name / f"{normalized_var}.svg")
                possible_paths.append(base_icon_dir / universe.name / f"{normalized_var}.png")
                possible_paths.append(base_icon_dir / universe.name / f"{normalized_var}.jpg")
                possible_paths.append(base_icon_dir / universe.name / f"{normalized_var}.jpeg")
            
            # Pattern 2: universe/category/product_name.ext
            if product.category_id:
                category = db.query(Category).filter(Category.id == product.category_id).first()
                if category:
                    for name_var in [product.name, product.display_name]:
                        normalized_var = normalize_name(name_var)
                        possible_paths.append(base_icon_dir / universe.name / category.name / f"{normalized_var}.svg")
                        possible_paths.append(base_icon_dir / universe.name / category.name / f"{normalized_var}.png")
                        possible_paths.append(base_icon_dir / universe.name / category.name / f"{normalized_var}.jpg")
                        possible_paths.append(base_icon_dir / universe.name / category.name / f"{normalized_var}.jpeg")
        
        # Check if any of these paths exist
        for icon_path in possible_paths:
            if icon_path.exists():
                # Generate relative path
                relative_path = f"/icons/products/{icon_path.relative_to(base_icon_dir)}"
                return {
                    "hasIcon": True,
                    "iconPath": relative_path,
                    "productName": product.display_name,
                    "productId": product.id
                }
    
    # Also check filesystem directly by normalized name variations (case-insensitive)
    if base_icon_dir.exists():
        # Extract key words from product name for matching (e.g., "Managed ClickHouse" -> ["managed", "clickhouse"])
        key_words = [w.lower() for w in product_name.split() if len(w) > 2]
        
        for universe_dir in base_icon_dir.iterdir():
            if universe_dir.is_dir():
                # Check universe level - try matching by key words (case-insensitive)
                for icon_file in universe_dir.iterdir():
                    if icon_file.is_file() and icon_file.suffix.lower() in ['.svg', '.png', '.jpg', '.jpeg']:
                        file_name_lower = icon_file.name.lower()
                        # Check if all key words are in the filename
                        if all(word in file_name_lower for word in key_words):
                            relative_path = f"/icons/products/{icon_file.relative_to(base_icon_dir)}"
                            return {
                                "hasIcon": True,
                                "iconPath": relative_path,
                                "productName": product_name
                            }
                
                # Check category subdirectories - try matching by key words (case-insensitive)
                for category_dir in universe_dir.iterdir():
                    if category_dir.is_dir():
                        for icon_file in category_dir.iterdir():
                            if icon_file.is_file() and icon_file.suffix.lower() in ['.svg', '.png', '.jpg', '.jpeg']:
                                file_name_lower = icon_file.name.lower()
                                # Check if all key words are in the filename
                                if all(word in file_name_lower for word in key_words):
                                    relative_path = f"/icons/products/{universe_dir.name}/{category_dir.name}/{icon_file.name}"
                                    return {
                                        "hasIcon": True,
                                        "iconPath": relative_path,
                                        "productName": product_name
                                    }
    
    return {
        "hasIcon": False,
        "iconPath": None,
        "productName": product_name
    }


@router.post(
    "/icons/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload Product Icon",
    description="Upload a new product icon (Director/Admin only)"
)
async def upload_product_icon(
    file: UploadFile = File(...),
    universe_id: int = Form(...),
    category_id: Optional[int] = Form(None),
    product_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a new product icon"""
    # Check permissions - only Director/Admin can upload icons
    if current_user.role not in ['director', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Directors and Admins can upload product icons"
        )
    
    # Validate universe exists
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {universe_id} not found"
        )
    
    # Validate category if provided
    category = None
    if category_id:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {category_id} not found"
            )
        # Validate category belongs to universe
        if category.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    # Validate product if provided
    product = None
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {product_id} not found"
            )
        # Validate product belongs to universe
        if product.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
        # Validate product belongs to category if category is provided
        if category_id and product.category_id != category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
    
    # Validate file type (only SVG, PNG, or JPG)
    allowed_extensions = ['.svg', '.png', '.jpg', '.jpeg']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 10MB for icons)
    file_content = await file.read()
    file_size = len(file_content)
    max_size = 10 * 1024 * 1024  # 10MB
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of 10MB"
        )
    
    # Determine icon directory structure
    # Base path: /app/icons/products/
    base_icon_dir = Path("/app/icons/products")
    base_icon_dir.mkdir(parents=True, exist_ok=True)
    
    # Create directory structure: universe_name/category_name/ or universe_name/
    if category:
        icon_dir = base_icon_dir / universe.name / category.name
    else:
        icon_dir = base_icon_dir / universe.name
    
    icon_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    if product:
        # Use product name for filename
        safe_product_name = product.name.replace(' ', '_').replace('/', '_')
        icon_filename = f"{safe_product_name}{file_ext}"
    else:
        # Use original filename
        icon_filename = file.filename
    
    icon_path = icon_dir / icon_filename
    
    # Save file
    try:
        with open(icon_path, 'wb') as f:
            f.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save icon file: {str(e)}"
        )
    
    # Generate relative path for frontend access
    # Path format: /icons/products/universe_name/category_name/filename.svg
    relative_path = f"/icons/products/{universe.name}"
    if category:
        relative_path += f"/{category.name}"
    relative_path += f"/{icon_filename}"
    
    return {
        "success": True,
        "message": "Icon uploaded successfully",
        "icon_path": relative_path,
        "icon_filename": icon_filename,
        "universe_id": universe_id,
        "category_id": category_id,
        "product_id": product_id,
        "product_name": product.display_name if product else None,
        "product_display_name": product.display_name if product else None
    }
