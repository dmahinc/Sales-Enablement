"""
Script to add Cross-Universes universe to the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.product import Universe

def add_cross_universes():
    """Add Cross-Universes universe to the database"""
    db = SessionLocal()
    try:
        # Check if Cross-Universes already exists
        existing = db.query(Universe).filter(Universe.name == "Cross-Universes").first()
        
        if existing:
            print("✓ Cross-Universes universe already exists")
            # Update it to ensure it has correct values
            existing.display_name = "Cross-Universes"
            existing.description = "Materials that span across multiple universes"
            existing.icon_name = "Globe"
            existing.color = "#6366f1"  # indigo-500
            existing.display_order = 5
            existing.is_active = True
            db.commit()
            print("✓ Updated Cross-Universes universe")
        else:
            # Create new Cross-Universes universe
            cross_universes = Universe(
                name="Cross-Universes",
                display_name="Cross-Universes",
                description="Materials that span across multiple universes",
                icon_name="Globe",
                color="#6366f1",  # indigo-500
                display_order=5,
                is_active=True
            )
            db.add(cross_universes)
            db.commit()
            print("✓ Created Cross-Universes universe")
        
        # Verify it was created/updated
        universe = db.query(Universe).filter(Universe.name == "Cross-Universes").first()
        if universe:
            print(f"✓ Cross-Universes universe verified:")
            print(f"  - ID: {universe.id}")
            print(f"  - Name: {universe.name}")
            print(f"  - Display Name: {universe.display_name}")
            print(f"  - Display Order: {universe.display_order}")
            print(f"  - Active: {universe.is_active}")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error adding Cross-Universes universe: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_cross_universes()
