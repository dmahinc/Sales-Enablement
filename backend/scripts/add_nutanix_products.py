#!/usr/bin/env python3
"""
Script to add Nutanix category and products to Private Cloud universe
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.product import Universe, Category, Product


def add_nutanix_products():
    """Add Nutanix category and products to Private Cloud universe"""
    db: Session = SessionLocal()
    
    try:
        # Find Private Cloud universe
        private_cloud = db.query(Universe).filter(Universe.name == "Private Cloud").first()
        if not private_cloud:
            print("❌ Error: Private Cloud universe not found")
            return False
        
        print(f"✓ Found Private Cloud universe (ID: {private_cloud.id})")
        
        # Check if Nutanix category already exists
        nutanix_category = db.query(Category).filter(
            Category.name == "nutanix",
            Category.universe_id == private_cloud.id
        ).first()
        
        if nutanix_category:
            print(f"✓ Nutanix category already exists (ID: {nutanix_category.id})")
        else:
            # Get the highest display_order for categories in Private Cloud
            max_order = db.query(Category).filter(
                Category.universe_id == private_cloud.id
            ).count()
            
            # Create Nutanix category
            nutanix_category = Category(
                name="nutanix",
                display_name="Nutanix",
                description="Nutanix hyperconverged infrastructure solutions",
                universe_id=private_cloud.id,
                display_order=max_order,
                is_active=True
            )
            db.add(nutanix_category)
            db.flush()  # Flush to get the ID
            print(f"✓ Created Nutanix category (ID: {nutanix_category.id})")
        
        # Create products
        products_to_create = [
            {
                "name": "Nutanix on OVHcloud",
                "display_name": "Nutanix on OVHcloud",
                "description": "Nutanix hyperconverged infrastructure hosted on OVHcloud",
                "product_type": "iaas",
                "phase": "general_avail"
            },
            {
                "name": "Nutanix Cloud Cluster",
                "display_name": "Nutanix Cloud Cluster",
                "description": "Nutanix Cloud Cluster solution",
                "product_type": "iaas",
                "phase": "general_avail"
            }
        ]
        
        for product_data in products_to_create:
            # Check if product already exists
            existing_product = db.query(Product).filter(
                Product.name == product_data["name"]
            ).first()
            
            if existing_product:
                # Update existing product to ensure it's in the right category
                existing_product.universe_id = private_cloud.id
                existing_product.category_id = nutanix_category.id
                existing_product.display_name = product_data["display_name"]
                existing_product.description = product_data.get("description")
                existing_product.product_type = product_data.get("product_type")
                existing_product.phase = product_data.get("phase")
                print(f"✓ Updated product: {product_data['name']} (ID: {existing_product.id})")
            else:
                # Get the highest display_order for products in this category
                max_product_order = db.query(Product).filter(
                    Product.category_id == nutanix_category.id
                ).count()
                
                # Create new product
                product = Product(
                    name=product_data["name"],
                    display_name=product_data["display_name"],
                    description=product_data.get("description"),
                    universe_id=private_cloud.id,
                    category_id=nutanix_category.id,
                    product_type=product_data.get("product_type"),
                    phase=product_data.get("phase"),
                    display_order=max_product_order,
                    is_active=True
                )
                db.add(product)
                print(f"✓ Created product: {product_data['name']}")
        
        # Commit all changes
        db.commit()
        print("\n✅ Successfully added Nutanix category and products!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = add_nutanix_products()
    sys.exit(0 if success else 1)
