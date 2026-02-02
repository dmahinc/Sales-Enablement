#!/usr/bin/env python3
"""
Create initial admin user
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@ovhcloud.com").first()
        if admin:
            print("Admin user already exists!")
            return
        
        # Create admin user
        import bcrypt
        password = "admin123"
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin = User(
            email="admin@ovhcloud.com",
            full_name="Admin User",
            hashed_password=hashed_password,
            role="admin",
            is_active=True,
            is_superuser=True
        )
        db.add(admin)
        db.commit()
        print("✅ Admin user created successfully!")
        print("   Email: admin@ovhcloud.com")
        print("   Password: admin123")
        print("   ⚠️  Please change the password after first login!")
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
