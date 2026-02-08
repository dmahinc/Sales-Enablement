"""
Product Hierarchy API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.product import Universe, Category, Product
from app.models.user import User
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/products", tags=["products"])


# Pydantic schemas
class UniverseResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    icon_name: Optional[str]
    color: Optional[str]
    display_order: int
    product_count: int = 0
    
    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    icon_name: Optional[str]
    universe_id: int
    universe_name: str
    display_order: int
    product_count: int = 0
    
    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Unique category name (e.g., 'ai-machine-learning')")
    display_name: str = Field(..., min_length=1, max_length=255, description="Human-readable category name")
    universe_id: int = Field(..., description="ID of the universe this category belongs to")
    description: Optional[str] = Field(None, description="Category description")
    icon_name: Optional[str] = Field(None, max_length=100, description="Icon identifier")
    display_order: int = Field(0, description="Display order for sorting")


class ProductResponse(BaseModel):
    id: int
    name: str
    display_name: str
    short_description: Optional[str]
    description: Optional[str]
    universe_id: int
    universe_name: str
    category_id: Optional[int]
    category_name: Optional[str]
    product_type: Optional[str]
    phase: Optional[str]
    website_url: Optional[str]
    documentation_url: Optional[str]
    material_count: int = 0
    
    class Config:
        from_attributes = True


class ProductDetailResponse(ProductResponse):
    hardware_tenancy: Optional[str]
    public_network: Optional[str]
    private_network: Optional[str]
    code_automation: bool
    datacenter_availability: Optional[dict]
    certifications: Optional[dict]


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Unique product name (e.g., 'ai-deploy')")
    display_name: str = Field(..., min_length=1, max_length=255, description="Human-readable product name")
    universe_id: int = Field(..., description="ID of the universe this product belongs to")
    category_id: Optional[int] = Field(None, description="Optional category ID")
    short_description: Optional[str] = Field(None, description="Brief description")
    description: Optional[str] = Field(None, description="Full description")
    product_type: Optional[str] = Field(None, description="Type: iaas, paas, saas")
    phase: Optional[str] = Field(None, description="Phase: general_avail, beta, research_dev")
    website_url: Optional[str] = Field(None, max_length=500)
    documentation_url: Optional[str] = Field(None, max_length=500)


@router.get("/universes", response_model=List[UniverseResponse])
def get_universes(
    include_inactive: bool = Query(False, description="Include inactive universes"),
    db: Session = Depends(get_db)
):
    """Get all product universes"""
    query = db.query(Universe)
    if not include_inactive:
        query = query.filter(Universe.is_active == True)
    
    universes = query.order_by(Universe.display_order).all()
    
    # Add product counts
    result = []
    for universe in universes:
        product_count = db.query(Product).filter(
            Product.universe_id == universe.id,
            Product.is_active == True
        ).count()
        result.append(UniverseResponse(
            id=universe.id,
            name=universe.name,
            display_name=universe.display_name,
            description=universe.description,
            icon_name=universe.icon_name,
            color=universe.color,
            display_order=universe.display_order,
            product_count=product_count
        ))
    
    return result


@router.get("/universes/{universe_id}", response_model=UniverseResponse)
def get_universe(universe_id: int, db: Session = Depends(get_db)):
    """Get a specific universe"""
    universe = db.query(Universe).filter(Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    
    product_count = db.query(Product).filter(
        Product.universe_id == universe.id,
        Product.is_active == True
    ).count()
    
    return UniverseResponse(
        id=universe.id,
        name=universe.name,
        display_name=universe.display_name,
        description=universe.description,
        icon_name=universe.icon_name,
        color=universe.color,
        display_order=universe.display_order,
        product_count=product_count
    )


@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    universe_id: Optional[int] = Query(None, description="Filter by universe"),
    include_inactive: bool = Query(False, description="Include inactive categories"),
    db: Session = Depends(get_db)
):
    """Get all categories, optionally filtered by universe"""
    query = db.query(Category)
    
    if universe_id:
        query = query.filter(Category.universe_id == universe_id)
    
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    categories = query.order_by(Category.display_order).all()
    
    # Add product counts and universe names
    result = []
    for category in categories:
        product_count = db.query(Product).filter(
            Product.category_id == category.id,
            Product.is_active == True
        ).count()
        result.append(CategoryResponse(
            id=category.id,
            name=category.name,
            display_name=category.display_name,
            description=category.description,
            icon_name=category.icon_name,
            universe_id=category.universe_id,
            universe_name=category.universe.name,
            display_order=category.display_order,
            product_count=product_count
        ))
    
    return result


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new category (Director only)"""
    # Check if user is director or superuser
    if current_user.role != "director" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can create categories"
        )
    
    # Check if category name already exists in this universe
    existing_category = db.query(Category).filter(
        Category.name == category_data.name,
        Category.universe_id == category_data.universe_id
    ).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{category_data.name}' already exists in this universe"
        )
    
    # Validate universe exists
    universe = db.query(Universe).filter(Universe.id == category_data.universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {category_data.universe_id} not found"
        )
    
    # Create category
    category = Category(
        name=category_data.name,
        display_name=category_data.display_name,
        universe_id=category_data.universe_id,
        description=category_data.description,
        icon_name=category_data.icon_name,
        display_order=category_data.display_order,
        is_active=True
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    # Return category with universe name
    return CategoryResponse(
        id=category.id,
        name=category.name,
        display_name=category.display_name,
        description=category.description,
        icon_name=category.icon_name,
        universe_id=category.universe_id,
        universe_name=universe.name,
        display_order=category.display_order,
        product_count=0
    )


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    product_count = db.query(Product).filter(
        Product.category_id == category.id,
        Product.is_active == True
    ).count()
    
    return CategoryResponse(
        id=category.id,
        name=category.name,
        display_name=category.display_name,
        description=category.description,
        icon_name=category.icon_name,
        universe_id=category.universe_id,
        universe_name=category.universe.name,
        display_order=category.display_order,
        product_count=product_count
    )


@router.get("/", response_model=List[ProductResponse])
def get_products(
    universe_id: Optional[int] = Query(None, description="Filter by universe"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in product names"),
    include_inactive: bool = Query(False, description="Include inactive products"),
    db: Session = Depends(get_db)
):
    """Get all products with optional filters"""
    query = db.query(Product)
    
    if universe_id:
        query = query.filter(Product.universe_id == universe_id)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.display_name.ilike(search_term),
                Product.short_description.ilike(search_term)
            )
        )
    
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    
    products = query.order_by(Product.display_order, Product.name).all()
    
    # Add universe and category names
    result = []
    for product in products:
        result.append(ProductResponse(
            id=product.id,
            name=product.name,
            display_name=product.display_name,
            short_description=product.short_description,
            description=product.description,
            universe_id=product.universe_id,
            universe_name=product.universe.name,
            category_id=product.category_id,
            category_name=product.category.name if product.category else None,
            product_type=product.product_type,
            phase=product.phase,
            website_url=product.website_url,
            documentation_url=product.documentation_url,
            material_count=product.material_count
        ))
    
    return result


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product with full details"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductDetailResponse(
        id=product.id,
        name=product.name,
        display_name=product.display_name,
        short_description=product.short_description,
        description=product.description,
        universe_id=product.universe_id,
        universe_name=product.universe.name,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        product_type=product.product_type,
        phase=product.phase,
        website_url=product.website_url,
        documentation_url=product.documentation_url,
        material_count=product.material_count,
        hardware_tenancy=product.hardware_tenancy,
        public_network=product.public_network,
        private_network=product.private_network,
        code_automation=product.code_automation or False,
        datacenter_availability=product.datacenter_availability,
        certifications=product.certifications
    )


@router.get("/hierarchy/tree", response_model=dict)
def get_product_hierarchy(db: Session = Depends(get_db)):
    """Get complete product hierarchy as a tree structure"""
    universes = db.query(Universe).filter(Universe.is_active == True).order_by(Universe.display_order).all()
    
    hierarchy = []
    for universe in universes:
        universe_data = {
            "id": universe.id,
            "name": universe.name,
            "display_name": universe.display_name,
            "icon_name": universe.icon_name,
            "color": universe.color,
            "categories": []
        }
        
        categories = db.query(Category).filter(
            Category.universe_id == universe.id,
            Category.is_active == True
        ).order_by(Category.display_order).all()
        
        for category in categories:
            category_data = {
                "id": category.id,
                "name": category.name,
                "display_name": category.display_name,
                "icon_name": category.icon_name,
                "products": []
            }
            
            products = db.query(Product).filter(
                Product.category_id == category.id,
                Product.is_active == True
            ).order_by(Product.display_order, Product.name).all()
            
            for product in products:
                category_data["products"].append({
                    "id": product.id,
                    "name": product.name,
                    "display_name": product.display_name,
                    "short_description": product.short_description,
                    "phase": product.phase,
                })
            
            universe_data["categories"].append(category_data)
        
        hierarchy.append(universe_data)
    
    return {"hierarchy": hierarchy}


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new product (Director only)"""
    # Check if user is director or superuser
    if current_user.role != "director" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can create products"
        )
    
    # Check if product name already exists
    existing_product = db.query(Product).filter(Product.name == product_data.name).first()
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with name '{product_data.name}' already exists"
        )
    
    # Validate universe exists
    universe = db.query(Universe).filter(Universe.id == product_data.universe_id).first()
    if not universe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Universe with id {product_data.universe_id} not found"
        )
    
    # Validate category if provided
    category = None
    if product_data.category_id:
        category = db.query(Category).filter(Category.id == product_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {product_data.category_id} not found"
            )
        # Ensure category belongs to the same universe
        if category.universe_id != product_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category must belong to the selected universe"
            )
    
    # Create product
    product = Product(
        name=product_data.name,
        display_name=product_data.display_name,
        universe_id=product_data.universe_id,
        category_id=product_data.category_id,
        short_description=product_data.short_description,
        description=product_data.description,
        product_type=product_data.product_type,
        phase=product_data.phase,
        website_url=product_data.website_url,
        documentation_url=product_data.documentation_url,
        is_active=True,
        material_count=0
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Return product with universe and category names
    return ProductResponse(
        id=product.id,
        name=product.name,
        display_name=product.display_name,
        short_description=product.short_description,
        description=product.description,
        universe_id=product.universe_id,
        universe_name=universe.name,
        category_id=product.category_id,
        category_name=category.name if category else None,
        product_type=product.product_type,
        phase=product.phase,
        website_url=product.website_url,
        documentation_url=product.documentation_url,
        material_count=product.material_count
    )
