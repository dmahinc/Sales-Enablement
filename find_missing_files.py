#!/usr/bin/env python3
"""
Script to find missing material files and suggest fixes
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection (adjust as needed)
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'sales_enablement',
    'user': 'user',
    'password': 'password'
}

def find_files_in_directory(base_path, filename):
    """Recursively search for a file by name"""
    matches = []
    base = Path(base_path)
    if not base.exists():
        return matches
    
    for root, dirs, files in os.walk(base):
        for file in files:
            if filename.lower() in file.lower() or file.lower() in filename.lower():
                full_path = Path(root) / file
                rel_path = full_path.relative_to(base)
                matches.append({
                    'full_path': str(full_path),
                    'relative_path': str(rel_path),
                    'filename': file
                })
    return matches

def main():
    # Get storage path from environment or use default
    storage_path = os.getenv('STORAGE_PATH', '/home/ubuntu/Sales-Enablement/storage')
    
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
        suggestions = []
        
        for mat in materials:
            expected_path = Path(storage_path) / mat['file_path']
            exists = expected_path.exists()
            
            if exists:
                found_count += 1
                print(f"✓ Material {mat['id']}: {mat['name'][:50]}")
                print(f"  File exists: {mat['file_path']}")
            else:
                missing_count += 1
                print(f"✗ Material {mat['id']}: {mat['name'][:50]}")
                print(f"  Expected: {mat['file_path']}")
                print(f"  Missing file: {mat['file_name']}")
                
                # Try to find the file
                matches = find_files_in_directory(storage_path, mat['file_name'])
                if matches:
                    print(f"  Found similar files:")
                    for match in matches:
                        print(f"    - {match['relative_path']}")
                        suggestions.append({
                            'material_id': mat['id'],
                            'current_path': mat['file_path'],
                            'found_path': match['relative_path'],
                            'found_filename': match['filename']
                        })
                else:
                    print(f"  No similar files found")
            print()
        
        print("=" * 80)
        print(f"Summary: {found_count} found, {missing_count} missing")
        
        if suggestions:
            print(f"\nFound {len(suggestions)} files that might match:")
            print("\nSuggested SQL updates:")
            for sug in suggestions:
                print(f"-- Material {sug['material_id']}")
                print(f"UPDATE materials SET file_path = '{sug['found_path']}', file_name = '{sug['found_filename']}' WHERE id = {sug['material_id']};")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
