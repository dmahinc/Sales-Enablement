#!/usr/bin/env python3
"""
Script to delete 'Test Category' from the product hierarchy
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.product import Category, Product

def delete_test_category():
    """Delete 'Test Category' and any associated products"""
    db: Session = SessionLocal()
    try:
        # Find the Test Category
        test_category = db.query(Category).filter(
            (Category.name.ilike('%test%')) | 
            (Category.display_name.ilike('%test%'))
        ).all()
        
        if not test_category:
            print("No 'Test Category' found in database.")
            return
        
        print(f"Found {len(test_category)} category/categories matching 'test':")
        for cat in test_category:
            print(f"  - ID: {cat.id}, Name: {cat.name}, Display Name: {cat.display_name}")
        
        # Delete associated products first
        for cat in test_category:
            products = db.query(Product).filter(Product.category_id == cat.id).all()
            if products:
                print(f"\nDeleting {len(products)} product(s) associated with category '{cat.display_name}':")
                for product in products:
                    print(f"  - Product: {product.display_name}")
                    db.delete(product)
        
        # Delete the categories
        print(f"\nDeleting {len(test_category)} category/categories:")
        for cat in test_category:
            print(f"  - Deleting category: {cat.display_name}")
            db.delete(cat)
        
        db.commit()
        print("\n✓ Successfully deleted 'Test Category' and associated products.")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error deleting category: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    delete_test_category()
