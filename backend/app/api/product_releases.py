"""
Product Releases API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.product_release import ProductRelease
from app.models.product import Universe, Category, Product
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.product_release import ProductReleaseCreate, ProductReleaseUpdate, ProductReleaseResponse
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/product-releases", tags=["product-releases"])


@router.get("", response_model=List[ProductReleaseResponse])
async def list_product_releases(
    universe_id: Optional[int] = None,
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all product releases, sorted by latest first"""
    query = db.query(ProductRelease)
    
    # Apply filters
    if universe_id:
        query = query.filter(ProductRelease.universe_id == universe_id)
    if category_id:
        query = query.filter(ProductRelease.category_id == category_id)
    if product_id:
        query = query.filter(ProductRelease.product_id == product_id)
    
    # Sort by published_at (latest first), then by created_at
    releases = query.order_by(
        desc(ProductRelease.published_at),
        desc(ProductRelease.created_at)
    ).all()
    
    # Convert to response format
    result = []
    for release in releases:
        release_dict = ProductReleaseResponse.model_validate(release).model_dump(mode='json')
        # Add creator info
        if release.created_by:
            release_dict['created_by_name'] = release.created_by.full_name
            release_dict['created_by_email'] = release.created_by.email
        result.append(release_dict)
    
    return result


@router.get("/{release_id}", response_model=ProductReleaseResponse)
async def get_product_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single product release by ID"""
    release = db.query(ProductRelease).filter(ProductRelease.id == release_id).first()
    
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product release not found"
        )
    
    release_dict = ProductReleaseResponse.model_validate(release).model_dump(mode='json')
    if release.created_by:
        release_dict['created_by_name'] = release.created_by.full_name
        release_dict['created_by_email'] = release.created_by.email
    
    return release_dict


@router.post("", response_model=ProductReleaseResponse, status_code=status.HTTP_201_CREATED)
async def create_product_release(
    release_data: ProductReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new product release"""
    # Validate hierarchy if provided
    if release_data.universe_id:
        universe = db.query(Universe).filter(Universe.id == release_data.universe_id).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {release_data.universe_id} not found"
            )
        if not release_data.universe_name:
            release_data.universe_name = universe.name or universe.display_name
    
    if release_data.category_id:
        category = db.query(Category).filter(Category.id == release_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {release_data.category_id} not found"
            )
        if not release_data.category_name:
            release_data.category_name = category.display_name or category.name
        # Validate category belongs to universe
        if release_data.universe_id and category.universe_id != release_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    if release_data.product_id:
        product = db.query(Product).filter(Product.id == release_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {release_data.product_id} not found"
            )
        if not release_data.product_name:
            release_data.product_name = product.display_name or product.name
        # Validate product belongs to category
        if release_data.category_id and product.category_id != release_data.category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
        # Validate product belongs to universe
        if release_data.universe_id and product.universe_id != release_data.universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
    
    # Set published_at to now if not provided
    published_at = release_data.published_at or datetime.utcnow()
    
    # Validate material_id if provided
    material = None
    if release_data.material_id:
        from app.models.material import Material
        material = db.query(Material).filter(Material.id == release_data.material_id).first()
        if not material:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Material with id {release_data.material_id} not found"
            )
    
    # Create release
    release = ProductRelease(
        title=release_data.title,
        short_description=release_data.short_description,
        content=release_data.content,
        universe_id=release_data.universe_id,
        category_id=release_data.category_id,
        product_id=release_data.product_id,
        universe_name=release_data.universe_name,
        category_name=release_data.category_name,
        product_name=release_data.product_name,
        created_by_id=current_user.id,
        published_at=published_at,
        material_id=release_data.material_id
    )
    
    db.add(release)
    db.commit()
    db.refresh(release)
    
    release_dict = ProductReleaseResponse.model_validate(release).model_dump(mode='json')
    if release.created_by:
        release_dict['created_by_name'] = release.created_by.full_name
        release_dict['created_by_email'] = release.created_by.email
    
    return release_dict


@router.put("/{release_id}", response_model=ProductReleaseResponse)
async def update_product_release(
    release_id: int,
    release_data: ProductReleaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a product release"""
    release = db.query(ProductRelease).filter(ProductRelease.id == release_id).first()
    
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product release not found"
        )
    
    # Update fields
    update_dict = release_data.model_dump(exclude_unset=True)
    
    # Validate hierarchy if being updated
    if 'universe_id' in update_dict and update_dict['universe_id']:
        universe = db.query(Universe).filter(Universe.id == update_dict['universe_id']).first()
        if not universe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Universe with id {update_dict['universe_id']} not found"
            )
        if 'universe_name' not in update_dict or not update_dict['universe_name']:
            update_dict['universe_name'] = universe.name or universe.display_name
    
    if 'category_id' in update_dict and update_dict['category_id']:
        category = db.query(Category).filter(Category.id == update_dict['category_id']).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {update_dict['category_id']} not found"
            )
        if 'category_name' not in update_dict or not update_dict['category_name']:
            update_dict['category_name'] = category.display_name or category.name
        # Validate category belongs to universe
        universe_id = update_dict.get('universe_id', release.universe_id)
        if universe_id and category.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not belong to selected universe"
            )
    
    if 'product_id' in update_dict and update_dict['product_id']:
        product = db.query(Product).filter(Product.id == update_dict['product_id']).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with id {update_dict['product_id']} not found"
            )
        if 'product_name' not in update_dict or not update_dict['product_name']:
            update_dict['product_name'] = product.display_name or product.name
        # Validate product belongs to category
        category_id = update_dict.get('category_id', release.category_id)
        if category_id and product.category_id != category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected category"
            )
        # Validate product belongs to universe
        universe_id = update_dict.get('universe_id', release.universe_id)
        if universe_id and product.universe_id != universe_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to selected universe"
            )
    
    # Validate material_id if being updated
    if 'material_id' in update_dict and update_dict['material_id']:
        from app.models.material import Material
        material = db.query(Material).filter(Material.id == update_dict['material_id']).first()
        if not material:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Material with id {update_dict['material_id']} not found"
            )
    
    for key, value in update_dict.items():
        setattr(release, key, value)
    
    db.commit()
    db.refresh(release)
    
    release_dict = ProductReleaseResponse.model_validate(release).model_dump(mode='json')
    if release.created_by:
        release_dict['created_by_name'] = release.created_by.full_name
        release_dict['created_by_email'] = release.created_by.email
    
    return release_dict


@router.delete("/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a product release"""
    release = db.query(ProductRelease).filter(ProductRelease.id == release_id).first()
    
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product release not found"
        )
    
    db.delete(release)
    db.commit()
    
    return None
