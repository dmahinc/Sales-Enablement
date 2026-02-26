#!/usr/bin/env python3
"""
Script to find missing material files and update database paths
Run this on the HOST system (not in container)
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection - adjust these values
DB_CONFIG = {
    'host': 'localhost',  # or your DB host
    'port': 5432,
    'database': 'sales_enablement',
    'user': 'user',  # Update with your DB user
    'password': 'password'  # Update with your DB password
}

def find_file_recursive(base_path, filename):
    """Recursively search for a file"""
    matches = []
    base = Path(base_path)
    if not base.exists():
        return matches
    
    # Try exact match first
    for root, dirs, files in os.walk(base):
        for file in files:
            if file == filename:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(base)
                matches.append({
                    'full_path': str(full_path),
                    'relative_path': str(rel_path).replace('\\', '/'),  # Normalize path
                    'filename': file,
                    'match_type': 'exact'
                })
            elif filename.lower() in file.lower() or file.lower() in filename.lower():
                full_path = Path(root) / file
                rel_path = full_path.relative_to(base)
                matches.append({
                    'full_path': str(full_path),
                    'relative_path': str(rel_path).replace('\\', '/'),
                    'filename': file,
                    'match_type': 'partial'
                })
    return matches

def main():
    # Storage path on host
    storage_path = Path('/home/ubuntu/Sales-Enablement/storage')
    
    if not storage_path.exists():
        print(f"ERROR: Storage path does not exist: {storage_path}")
        print("Please update the storage_path variable in this script")
        sys.exit(1)
    
    print(f"Searching for files in: {storage_path}")
    print("=" * 80)
    
    # Connect to database
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all materials with file paths
        cur.execute("""
            SELECT id, name, file_path, file_name 
            FROM materials 
            WHERE file_path IS NOT NULL
            ORDER BY id
        """)
        
        materials = cur.fetchall()
        print(f"Found {len(materials)} materials with file paths\n")
        
        found_count = 0
        missing_count = 0
        updates = []
        
        for mat in materials:
            expected_path = storage_path / mat['file_path']
            exists = expected_path.exists()
            
            if exists:
                found_count += 1
                print(f"✓ Material {mat['id']}: {mat['name'][:50]}")
            else:
                missing_count += 1
                print(f"✗ Material {mat['id']}: {mat['name'][:50]}")
                print(f"  Missing: {mat['file_path']}")
                
                # Try to find the file
                matches = find_file_recursive(storage_path, mat['file_name'])
                if matches:
                    # Prefer exact matches
                    exact_matches = [m for m in matches if m['match_type'] == 'exact']
                    if exact_matches:
                        match = exact_matches[0]
                    else:
                        match = matches[0]
                    
                    print(f"  → Found: {match['relative_path']}")
                    updates.append({
                        'material_id': mat['id'],
                        'old_path': mat['file_path'],
                        'new_path': match['relative_path'],
                        'old_filename': mat['file_name'],
                        'new_filename': match['filename']
                    })
                else:
                    print(f"  → Not found anywhere")
            print()
        
        print("=" * 80)
        print(f"Summary: {found_count} found, {missing_count} missing")
        
        if updates:
            print(f"\nFound {len(updates)} files that can be fixed:")
            print("\nSQL UPDATE statements:")
            print("BEGIN;")
            for upd in updates:
                print(f"UPDATE materials SET file_path = '{upd['new_path']}', file_name = '{upd['new_filename']}' WHERE id = {upd['material_id']};")
            print("COMMIT;")
            
            response = input("\nApply these updates? (yes/no): ")
            if response.lower() == 'yes':
                for upd in updates:
                    cur.execute("""
                        UPDATE materials 
                        SET file_path = %s, file_name = %s 
                        WHERE id = %s
                    """, (upd['new_path'], upd['new_filename'], upd['material_id']))
                conn.commit()
                print(f"✓ Updated {len(updates)} materials")
            else:
                print("Updates not applied")
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        print("\nPlease update DB_CONFIG in the script with correct database credentials")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
