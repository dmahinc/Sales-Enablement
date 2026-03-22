#!/usr/bin/env python3
"""
Seed the GTM hierarchy segments into the database.

Level 1: Webcloud, Digital Scalers, Corporates
Level 2:
  - Webcloud: Direct, Indirect
  - Digital Scalers: Blockchain & Web3, Cyber-security, AI, FinTech, AdTech, IoT
  - Corporates: Defense & Governments, Healthcare, Public sector, Private sector

Run from backend dir: python scripts/seed_gtm_hierarchy.py
Or via docker: docker compose exec backend python scripts/seed_gtm_hierarchy.py
"""
import os
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# GTM Hierarchy structure: (Level1, [(Level2_name, description)])
GTM_HIERARCHY = [
    ("Webcloud", [
        ("Direct", "Direct sales channel"),
        ("Indirect", "Indirect / partner sales channel"),
    ]),
    ("Digital Scalers", [
        ("Blockchain & Web3", "Blockchain and Web3 technology segment"),
        ("Cyber-security", "Cybersecurity solutions segment"),
        ("AI", "Artificial Intelligence segment"),
        ("FinTech", "Financial Technology segment"),
        ("AdTech", "Advertising Technology segment"),
        ("IoT", "Internet of Things segment"),
    ]),
    ("Corporates", [
        ("Defense & Governments", "Defense and government sector"),
        ("Healthcare", "Healthcare sector"),
        ("Public sector", "Public sector organizations"),
        ("Private sector", "Private sector organizations"),
    ]),
]


def main():
    from app.core.database import SessionLocal
    from app.models.segment import Segment

    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0

        for level1_name, level2_items in GTM_HIERARCHY:
            # Create or get Level 1 segment
            level1 = db.query(Segment).filter(
                Segment.name == level1_name,
                Segment.parent_segment_id == None
            ).first()

            if not level1:
                level1 = Segment(
                    name=level1_name,
                    display_name=level1_name,
                    description=f"GTM Level 1: {level1_name}",
                    parent_segment_id=None,
                )
                db.add(level1)
                db.flush()  # Get ID
                created_count += 1
                print(f"Created Level 1: {level1_name}")
            else:
                print(f"Level 1 already exists: {level1_name}")

            # Create Level 2 segments
            for level2_name, level2_desc in level2_items:
                existing = db.query(Segment).filter(
                    Segment.name == level2_name,
                    Segment.parent_segment_id == level1.id
                ).first()

                if not existing:
                    level2 = Segment(
                        name=level2_name,
                        display_name=level2_name,
                        description=level2_desc,
                        parent_segment_id=level1.id,
                    )
                    db.add(level2)
                    created_count += 1
                    print(f"  Created Level 2: {level2_name}")
                else:
                    print(f"  Level 2 already exists: {level2_name}")

        db.commit()
        print(f"\nDone. Created: {created_count}, Skipped (existing): {len(GTM_HIERARCHY) * 2 + sum(len(l2) for _, l2 in GTM_HIERARCHY) - created_count}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
