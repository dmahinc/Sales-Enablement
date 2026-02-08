#!/usr/bin/env python3
"""
Update user roles
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.user import User

def update_user_roles():
    db = SessionLocal()
    try:
        # Update damien.mahinc@gmail.com to PMM
        damien = db.query(User).filter(User.email == "damien.mahinc@gmail.com").first()
        if damien:
            damien.role = "pmm"
            print(f"✅ Updated {damien.email} to PMM role")
        else:
            print(f"⚠️  User damien.mahinc@gmail.com not found - skipping")
        
        # Update admin@ovhcloud.com to Director
        admin = db.query(User).filter(User.email == "admin@ovhcloud.com").first()
        if admin:
            admin.role = "director"
            # Keep superuser status for admin access
            admin.is_superuser = True
            print(f"✅ Updated {admin.email} to Director role (keeping superuser)")
        else:
            print(f"⚠️  User admin@ovhcloud.com not found - skipping")
        
        db.commit()
        print("\n✅ User roles updated successfully!")
        
        # Display current roles
        print("\n📋 Current user roles:")
        users = db.query(User).all()
        for user in users:
            print(f"   {user.email}: {user.role} (superuser: {user.is_superuser})")
            
    except Exception as e:
        print(f"❌ Error updating user roles: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_user_roles()
