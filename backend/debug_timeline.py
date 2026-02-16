from app.core.database import SessionLocal
from app.models.usage import MaterialUsage
from app.models.shared_link import SharedLink

db = SessionLocal()
print('=== MaterialUsage Events ===')
for u in db.query(MaterialUsage).all():
    print(f'ID: {u.id}, Material: {u.material_id}, User: {u.user_id}, Action: {u.action}, Used: {u.used_at}')

print('\n=== SharedLinks ===')
for sl in db.query(SharedLink).limit(10).all():
    print(f'ID: {sl.id}, Material: {sl.material_id}, User: {sl.shared_by_user_id}, Customer: {sl.customer_email}, Access: {sl.access_count}, Download: {sl.download_count}, Last Access: {sl.last_accessed_at}, Last Download: {sl.last_downloaded_at}')

db.close()
