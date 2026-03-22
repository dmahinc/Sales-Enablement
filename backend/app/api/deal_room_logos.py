"""
Deal Room Logos API - serve customer logos for Digital Sales Room headers
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings

DEAL_ROOM_LOGOS_DIR = Path(settings.STORAGE_PATH) / "deal_room_logos"
DEAL_ROOM_LOGOS_DIR.mkdir(parents=True, exist_ok=True)


router = APIRouter(prefix="/api/deal-room-logos", tags=["deal-room-logos"])


@router.get("/{filename}")
async def get_deal_room_logo(filename: str):
    """Serve deal room logo image by filename (e.g. room_123.png)"""
    if not filename or not all(c.isalnum() or c in "._" for c in filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not filename.startswith("room_"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = DEAL_ROOM_LOGOS_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Logo not found")
    try:
        filepath.resolve().relative_to(DEAL_ROOM_LOGOS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    media_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml"}
    media_type = media_types.get(ext, "image/jpeg")
    return FileResponse(filepath, media_type=media_type)
