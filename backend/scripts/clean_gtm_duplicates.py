#!/usr/bin/env python3
"""
Remove legacy/duplicate segments. Keep only the canonical GTM hierarchy:
- Webcloud (Direct, Indirect)
- Digital Scalers (Blockchain & Web3, Cyber-security, AI, FinTech, AdTech, IoT)
- Corporates (Defense & Governments, Healthcare, Public sector, Private sector)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Legacy segment IDs to remove (old naming: digital_starters, digital_scalers, corporate)
LEGACY_LEVEL1_IDS = [2, 3, 4]  # digital_starters, digital_scalers, corporate
LEGACY_LEVEL2_IDS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]  # their children


def main():
    from sqlalchemy import delete, update
    from app.core.database import SessionLocal
    from app.models.segment import Segment
    from app.models.persona import Persona
    from app.models.associations import material_segment

    db = SessionLocal()
    try:
        legacy_ids = LEGACY_LEVEL2_IDS + LEGACY_LEVEL1_IDS
        # Clear persona.segment_id for legacy segments
        db.execute(update(Persona).where(Persona.segment_id.in_(legacy_ids)).values(segment_id=None))
        # Delete material_segment links for legacy segments
        db.execute(delete(material_segment).where(material_segment.c.segment_id.in_(legacy_ids)))
        print("Cleared material_segment links for legacy segments")

        # Delete children first (FK: parent_segment_id)
        for sid in LEGACY_LEVEL2_IDS:
            seg = db.query(Segment).filter(Segment.id == sid).first()
            if seg:
                db.delete(seg)
                print(f"Deleted: {seg.name} (id={sid})")

        # Then delete parents
        for sid in LEGACY_LEVEL1_IDS:
            seg = db.query(Segment).filter(Segment.id == sid).first()
            if seg:
                db.delete(seg)
                print(f"Deleted: {seg.name} (id={sid})")

        db.commit()
        print("\nDone. Legacy segments removed.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
