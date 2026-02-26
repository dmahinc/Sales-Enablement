#!/bin/bash
# Script to find and fix all missing material file paths
# Run this on the HOST system

set -e

STORAGE_PATH="/home/ubuntu/Sales-Enablement/storage"
DB_CONTAINER="sales-enablement-backend"

echo "=========================================="
echo "Finding Missing Material Files"
echo "=========================================="
echo ""

# Check if storage path exists
if [ ! -d "$STORAGE_PATH" ]; then
    echo "ERROR: Storage path does not exist: $STORAGE_PATH"
    exit 1
fi

echo "Storage path: $STORAGE_PATH"
echo ""

# Find all document files
echo "Scanning for document files..."
FILES=$(find "$STORAGE_PATH" -type f \( -name "*.pptx" -o -name "*.pdf" -o -name "*.docx" -o -name "*.ppt" -o -name "*.doc" \) | wc -l)
echo "Found $FILES document files"
echo ""

# Run Python script in container to fix paths
echo "Running fix script in container..."
docker exec $DB_CONTAINER python3 << 'PYTHON_SCRIPT'
from app.models.material import Material
from app.core.database import SessionLocal
from app.services.storage import storage_service
from pathlib import Path
import os

db = SessionLocal()

print("=" * 80)
print("Fixing Material File Paths")
print("=" * 80)

# Get all materials
materials = db.query(Material).filter(Material.file_path.isnot(None)).all()
print(f"\nChecking {len(materials)} materials...\n")

found_count = 0
missing_count = 0
updates_needed = []

storage_base = Path('/app/storage')

# Find ALL files in storage recursively
print("Scanning storage directory for files...")
all_files_map = {}
file_count = 0
try:
    for root, dirs, files in os.walk(str(storage_base)):
        for file in files:
            if file.endswith(('.pptx', '.pdf', '.docx', '.ppt', '.doc')):
                file_count += 1
                full_path = Path(root) / file
                try:
                    rel_path = full_path.relative_to(storage_base)
                    if file not in all_files_map:
                        all_files_map[file] = []
                    all_files_map[file].append(str(rel_path))
                except ValueError:
                    pass
except Exception as e:
    print(f"Error scanning: {e}")

print(f"Found {file_count} document files in storage")
print(f"Found {len(all_files_map)} unique filenames\n")

# Check each material
for mat in materials:
    expected = storage_service.get_file_path(mat.file_path)
    exists = expected.exists()
    
    if exists:
        found_count += 1
    else:
        missing_count += 1
        # Try to find by filename
        if mat.file_name and mat.file_name in all_files_map:
            matches = all_files_map[mat.file_name]
            if len(matches) >= 1:
                new_path = matches[0]
                updates_needed.append({
                    'id': mat.id,
                    'old_path': mat.file_path,
                    'new_path': new_path
                })
                print(f"✓ Material {mat.id}: Found '{new_path}'")
        else:
            print(f"✗ Material {mat.id}: '{mat.file_name}' not found")

print(f"\n" + "=" * 80)
print(f"Summary: {found_count} found, {missing_count} missing")
print(f"Can fix: {len(updates_needed)} materials")
print("=" * 80)

if updates_needed:
    print("\nApplying updates...")
    for upd in updates_needed:
        mat = db.query(Material).filter(Material.id == upd['id']).first()
        if mat:
            mat.file_path = upd['new_path']
            print(f"  Updated material {upd['id']}: {upd['old_path']} -> {upd['new_path']}")
    
    db.commit()
    print(f"\n✓ Successfully updated {len(updates_needed)} materials")
    
    # Verify
    verified = 0
    for upd in updates_needed:
        mat = db.query(Material).filter(Material.id == upd['id']).first()
        if mat:
            expected = storage_service.get_file_path(mat.file_path)
            if expected.exists():
                verified += 1
    
    print(f"✓ Verified {verified}/{len(updates_needed)} files now exist")
else:
    print("\nNo updates needed")

db.close()
print("\nDone!")
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="
