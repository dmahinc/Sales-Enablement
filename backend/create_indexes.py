from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_material_usage_action_material_user_used 
        ON material_usage (action, material_id, user_id, used_at)
    """))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_material_usage_material_user_used 
        ON material_usage (material_id, user_id, used_at)
    """))
    conn.commit()
    print("Indexes created successfully")
