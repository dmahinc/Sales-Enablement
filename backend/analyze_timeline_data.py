from app.core.database import SessionLocal
from app.models.usage import MaterialUsage
from app.models.shared_link import SharedLink
from app.models.user import User
from datetime import datetime

db = SessionLocal()

print("=" * 80)
print("COMPLETE DATABASE ANALYSIS FOR TIMELINE")
print("=" * 80)

# Get all users
users = db.query(User).all()
user_map = {u.id: u.email for u in users}
print(f"\nUsers: {user_map}")

# Get ALL SharedLinks
print("\n" + "=" * 80)
print("ALL SHARED LINKS:")
print("=" * 80)
all_shared_links = db.query(SharedLink).order_by(SharedLink.created_at.desc()).all()
for sl in all_shared_links:
    print(f"ID: {sl.id}, Material: {sl.material_id}, Creator User: {sl.shared_by_user_id} ({user_map.get(sl.shared_by_user_id, 'N/A')}), "
          f"Customer: {sl.customer_email}, Created: {sl.created_at}, "
          f"Access Count: {sl.access_count}, Last Access: {sl.last_accessed_at}, "
          f"Download Count: {sl.download_count}, Last Download: {sl.last_downloaded_at}")

# Get ALL MaterialUsage events
print("\n" + "=" * 80)
print("ALL MATERIAL USAGE EVENTS:")
print("=" * 80)
all_usage = db.query(MaterialUsage).order_by(MaterialUsage.used_at.desc()).all()
for u in all_usage:
    print(f"ID: {u.id}, Material: {u.material_id}, User: {u.user_id} ({user_map.get(u.user_id, 'N/A')}), "
          f"Action: {u.action}, Used At: {u.used_at}")

# Analyze for user_id=8 (current user based on debug output)
print("\n" + "=" * 80)
print("ANALYSIS FOR USER_ID=8:")
print("=" * 80)
user_8_links = [sl for sl in all_shared_links if sl.shared_by_user_id == 8]
print(f"SharedLinks created by user 8: {len(user_8_links)}")
for sl in user_8_links:
    print(f"  Link {sl.id}: Material {sl.material_id}, Customer: {sl.customer_email}, "
          f"Access: {sl.access_count}, Last Access: {sl.last_accessed_at}, "
          f"Download: {sl.download_count}, Last Download: {sl.last_downloaded_at}")

# Find MaterialUsage events that should match user 8's shared links
user_8_material_ids = [sl.material_id for sl in user_8_links]
print(f"\nMaterial IDs for user 8's shared links: {user_8_material_ids}")

# MaterialUsage events for these materials
matching_usage = [u for u in all_usage if u.material_id in user_8_material_ids]
print(f"MaterialUsage events for these materials: {len(matching_usage)}")
for u in matching_usage:
    print(f"  Usage {u.id}: Material {u.material_id}, User: {u.user_id}, Action: {u.action}, Used: {u.used_at}")
    # Find matching SharedLinks
    matching_links = [sl for sl in user_8_links if sl.material_id == u.material_id]
    print(f"    Matches {len(matching_links)} SharedLink(s): {[sl.id for sl in matching_links]}")

# Check what events SHOULD appear in timeline
print("\n" + "=" * 80)
print("EVENTS THAT SHOULD APPEAR IN TIMELINE FOR USER 8:")
print("=" * 80)

# Shared events
print("\nSHARED EVENTS:")
for sl in user_8_links:
    print(f"  Shared: Material {sl.material_id}, Customer: {sl.customer_email}, Time: {sl.created_at}")

# View events from SharedLink tracking
print("\nVIEW EVENTS (from SharedLink.last_accessed_at):")
for sl in user_8_links:
    if sl.last_accessed_at:
        print(f"  Viewed: Material {sl.material_id}, Customer: {sl.customer_email}, Time: {sl.last_accessed_at}")

# Download events from SharedLink tracking
print("\nDOWNLOAD EVENTS (from SharedLink.last_downloaded_at):")
for sl in user_8_links:
    if sl.last_downloaded_at:
        print(f"  Downloaded: Material {sl.material_id}, Customer: {sl.customer_email}, Time: {sl.last_downloaded_at}")

# View events from MaterialUsage
print("\nVIEW EVENTS (from MaterialUsage):")
view_usage = [u for u in matching_usage if u.action == 'view']
for u in view_usage:
    matching_links = [sl for sl in user_8_links if sl.material_id == u.material_id]
    for sl in matching_links:
        print(f"  Viewed: Material {u.material_id}, Customer: {sl.customer_email}, Time: {u.used_at}")

# Download events from MaterialUsage
print("\nDOWNLOAD EVENTS (from MaterialUsage):")
download_usage = [u for u in matching_usage if u.action == 'download']
for u in download_usage:
    matching_links = [sl for sl in user_8_links if sl.material_id == u.material_id]
    for sl in matching_links:
        print(f"  Downloaded: Material {u.material_id}, Customer: {sl.customer_email}, Time: {u.used_at}")

db.close()
