#!/usr/bin/env python3
"""
Script to create PMM user accounts
Login format: firstname.lastname@ovhcloud.com
Password format: firstname123
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

# List of PMMs: FirstName LastName <email>
PMM_USERS = [
    ("Anthony Monier", "anthony.monier@ovhcloud.com"),
    ("Arnaud Chardon", "arnaud.chardon@ovhcloud.com"),
    ("Arthur Cabot", "arthur.cabot@ovhcloud.com"),
    ("Berenice Despres", "berenice.despres@ovhcloud.com"),
    ("Celine Haffner", "celine.haffner@ovhcloud.com"),
    ("Dimitri Fague", "dimitri.fague@ovhcloud.com"),
    ("Elliott Weisse", "elliott.weisse@ovhcloud.com"),
    ("Florian Ruscassie", "florian.ruscassie@ovhcloud.com"),
    ("Jonathan Clarke", "jonathan.clarke@ovhcloud.com"),
    ("Maxime Lehmann", "maxime.lehmann@ovhcloud.com"),
    ("Nicolas Galdini", "nicolas.galdini@ovhcloud.com"),
    ("Nicolas Stevenin", "nicolas.stevenin@ovhcloud.com"),
    ("Pascal Tangapregassam", "pascal.tangapregassam@ovhcloud.com"),
    ("Sebastien Cavaille", "sebastien.cavaille@ovhcloud.com"),
    ("Stephanie Bauche", "stephanie.bauche@ovhcloud.com"),
    ("Thomas Gatignon", "thomas.gatignon@ovhcloud.com"),
]

def extract_firstname(email: str) -> str:
    """Extract firstname from email (e.g., anthony.monier@ovhcloud.com -> anthony)"""
    return email.split('@')[0].split('.')[0]

def create_pmm_users():
    """Create PMM user accounts"""
    db: Session = SessionLocal()
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    try:
        for full_name, email in PMM_USERS:
            try:
                # Check if user already exists
                existing_user = db.query(User).filter(User.email == email).first()
                if existing_user:
                    print(f"⏭️  Skipping {full_name} ({email}) - already exists")
                    skipped_count += 1
                    continue
                
                # Extract firstname for password
                firstname = extract_firstname(email)
                password = f"{firstname}123"
                
                # Create user
                user = User(
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash(password),
                    role="pmm",
                    is_active=True,
                    is_superuser=False
                )
                
                db.add(user)
                print(f"✅ Created: {full_name} ({email}) - Password: {password}")
                created_count += 1
                
            except Exception as e:
                print(f"❌ Error creating {full_name} ({email}): {str(e)}")
                error_count += 1
                db.rollback()
                continue
        
        # Commit all users at once
        db.commit()
        
        print(f"\n📊 Summary:")
        print(f"   ✅ Created: {created_count}")
        print(f"   ⏭️  Skipped: {skipped_count}")
        print(f"   ❌ Errors: {error_count}")
        print(f"\n✅ Successfully created {created_count} PMM user accounts!")
        
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
    success = create_pmm_users()
    sys.exit(0 if success else 1)
