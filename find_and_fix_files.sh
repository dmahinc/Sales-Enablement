#!/bin/bash
# Script to find material files on host and fix database paths
# Run this on the HOST system

set -e

echo "=========================================="
echo "Finding Material Files on Host"
echo "=========================================="
echo ""

# Check if storage directory exists
STORAGE_PATH="/home/ubuntu/Sales-Enablement/storage"
if [ ! -d "$STORAGE_PATH" ]; then
    echo "ERROR: Storage path does not exist: $STORAGE_PATH"
    exit 1
fi

echo "1. Checking storage directory: $STORAGE_PATH"
FILE_COUNT=$(find "$STORAGE_PATH" -type f \( -name "*.pptx" -o -name "*.pdf" -o -name "*.docx" \) 2>/dev/null | wc -l)
echo "   Found $FILE_COUNT document files"
echo ""

# Check other possible locations
echo "2. Checking other possible locations:"
POSSIBLE_LOCATIONS=(
    "/home/ubuntu/Sales-Enablement/backend/storage"
    "/home/ubuntu/Sales-Enablement/storage"
    "/home/ubuntu/storage"
    "/var/lib/docker/volumes"
)

for loc in "${POSSIBLE_LOCATIONS[@]}"; do
    if [ -d "$loc" ]; then
        count=$(find "$loc" -type f \( -name "*.pptx" -o -name "*.pdf" -o -name "*.docx" \) 2>/dev/null | wc -l)
        if [ "$count" -gt 0 ]; then
            echo "   ✓ $loc: $count files"
            find "$loc" -type f \( -name "*.pptx" -o -name "*.pdf" -o -name "*.docx" \) 2>/dev/null | head -5 | while read f; do
                echo "     - $(basename "$f")"
            done
        fi
    fi
done
echo ""

# Now run the Python script in container to update database
echo "3. Running database update script in container..."
docker exec sales-enablement-backend python3 << 'PYTHON_SCRIPT'
from app.models.material import Material
from app.core.database import SessionLocal
from app.services.storage import storage_service
from pathlib import Path
import os

db = SessionLocal()

print("=" * 80)
print("UPDATING MATERIAL FILE PATHS")
print("=" * 80)

materials = db.query(Material).filter(Material.file_path.isnot(None)).all()
print(f"\nChecking {len(materials)} materials...\n")

storage_base = Path('/app/storage')

# Find ALL files
all_files_map = {}
file_count = 0
for root, dirs, files in os.walk(str(storage_base)):
    for file in files:
        if file.endswith(('.pptx', '.pdf', '.docx', '.ppt', '.doc')):
            file_count += 1
            full_path = Path(root) / file
            try:
                rel_path = str(full_path.relative_to(storage_base))
                if file not in all_files_map:
                    all_files_map[file] = []
                all_files_map[file].append(rel_path)
            except:
                pass

print(f"Found {file_count} files in storage")
print(f"Found {len(all_files_map)} unique filenames\n")

# Check and update materials
updates = []
for mat in materials:
    expected = storage_service.get_file_path(mat.file_path)
    if not expected.exists():
        if mat.file_name and mat.file_name in all_files_map:
            matches = all_files_map[mat.file_name]
            if matches:
                new_path = matches[0]
                updates.append({
                    'id': mat.id,
                    'old': mat.file_path,
                    'new': new_path
                })
                print(f"✓ Material {mat.id}: {mat.file_name}")
                print(f"  {mat.file_path} -> {new_path}")

print(f"\n" + "=" * 80)
print(f"Found {len(updates)} materials to update")

if updates:
    print("\nApplying updates...")
    for upd in updates:
        mat = db.query(Material).filter(Material.id == upd['id']).first()
        if mat:
            mat.file_path = upd['new']
    
    db.commit()
    print(f"✓ Updated {len(updates)} materials")
    
    # Verify
    verified = 0
    for upd in updates:
        mat = db.query(Material).filter(Material.id == upd['id']).first()
        if mat:
            expected = storage_service.get_file_path(mat.file_path)
            if expected.exists():
                verified += 1
    
    print(f"✓ Verified {verified}/{len(updates)} files now exist")
else:
    print("\nNo files found to update")
    print("\nNOTE: Files may be in a different location on the host.")
    print("Please check if files exist in:")
    print("  - /home/ubuntu/Sales-Enablement/storage")
    print("  - /home/ubuntu/Sales-Enablement/backend/storage")
    print("  - Or another location")

db.close()
print("\nDone!")
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "Complete"
echo "=========================================="
