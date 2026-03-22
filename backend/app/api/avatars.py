"""
Avatars API - serve user profile pictures
"""
import base64
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings

AVATARS_DIR = Path(settings.STORAGE_PATH) / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)


def get_avatar_data_url(user) -> str | None:
    """Read avatar file and return as data URL, or None if file missing."""
    if not user or not user.avatar_url:
        return None
    filename = user.avatar_url.split("/")[-1] if "/" in (user.avatar_url or "") else None
    if not filename:
        return None
    # Check both storage/avatars and legacy /app/avatars
    for base in (AVATARS_DIR, Path("/app/avatars")):
        path = base / filename
        if path.exists() and path.is_file():
            try:
                data = path.read_bytes()
                ext = path.suffix.lower()
                mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}.get(ext.lstrip("."), "image/jpeg")
                b64 = base64.b64encode(data).decode("ascii")
                return f"data:{mime};base64,{b64}"
            except Exception:
                pass
    return None


router = APIRouter(prefix="/api/avatars", tags=["avatars"])


@router.get("/{filename}")
async def get_avatar(filename: str):
    """Serve avatar image by filename (e.g. 123.png)"""
    # Sanitize: only allow alphanumeric, dot
    if not filename or not all(c.isalnum() or c == "." for c in filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    # Check both storage/avatars and legacy /app/avatars
    for base in (AVATARS_DIR, Path("/app/avatars")):
        filepath = base / filename
        if filepath.exists() and filepath.is_file():
            break
    else:
        raise HTTPException(status_code=404, detail="Avatar not found")
    # Prevent path traversal - ensure file is under an allowed dir
    try:
        filepath.resolve().relative_to(Path("/app/avatars").resolve())
    except ValueError:
        try:
            filepath.resolve().relative_to(AVATARS_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path")
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    media_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}
    media_type = media_types.get(ext, "image/jpeg")
    return FileResponse(filepath, media_type=media_type)
