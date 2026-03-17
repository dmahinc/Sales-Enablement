"""
Thumbnail service - extracts first page of PDFs/PPTX as small PNG for fast loading.
PPTX: converts to PDF via LibreOffice, then extracts first page.
"""
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from app.services.storage import storage_service

logger = logging.getLogger(__name__)

THUMBNAILS_DIR = "thumbnails"
THUMB_WIDTH = 192  # 2x display size for retina
THUMB_HEIGHT = 256

# LibreOffice/soffice executable (Debian/Ubuntu)
SOFFICE_CMD = "libreoffice"


def get_thumbnail_path(material_id: int) -> Path:
    """Get path for a material's thumbnail PNG."""
    thumb_dir = storage_service.storage_path / THUMBNAILS_DIR
    thumb_dir.mkdir(parents=True, exist_ok=True)
    return thumb_dir / f"{material_id}.png"


def generate_pdf_thumbnail(source_path: Path, material_id: int) -> Optional[Path]:
    """
    Extract first page of PDF as PNG. Returns path to thumbnail or None on failure.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(source_path))
        if len(doc) == 0:
            doc.close()
            return None

        page = doc[0]
        # Scale to fit within thumbnail size, keep aspect ratio
        scale = min(THUMB_WIDTH / page.rect.width, THUMB_HEIGHT / page.rect.height)
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        doc.close()

        out_path = get_thumbnail_path(material_id)
        pix.save(str(out_path))
        return out_path
    except Exception as e:
        logger.warning(f"Failed to generate thumbnail for material {material_id}: {e}")
        return None


def _pptx_to_pdf(source_path: Path) -> Optional[Path]:
    """
    Convert PPTX to PDF using LibreOffice headless. Returns path to temp PDF or None.
    Caller must unlink the returned path when done.
    """
    import shutil

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            args = [
                SOFFICE_CMD,
                "--headless",
                "--invisible",
                "--norestore",
                "--nofirststartwizard",
                "--convert-to",
                "pdf",
                "--outdir",
                str(out_dir),
                str(source_path),
            ]
            result = subprocess.run(
                args,
                capture_output=True,
                timeout=60,
                cwd=str(source_path.parent),
            )
            if result.returncode != 0:
                logger.warning(f"LibreOffice conversion failed: {result.stderr.decode()[:500]}")
                return None

            # LibreOffice outputs PDF with same base name
            pdf_name = source_path.stem + ".pdf"
            pdf_path = out_dir / pdf_name
            if not pdf_path.exists():
                return None

            # Copy to persistent temp file (temp dir is deleted when we exit 'with')
            fd, persistent_path = tempfile.mkstemp(suffix=".pdf")
            try:
                shutil.copy2(pdf_path, persistent_path)
                return Path(persistent_path)
            finally:
                import os

                try:
                    os.close(fd)
                except OSError:
                    pass
    except subprocess.TimeoutExpired:
        logger.warning("LibreOffice conversion timed out")
        return None
    except Exception as e:
        logger.warning(f"PPTX to PDF conversion failed: {e}")
        return None


def generate_pptx_thumbnail(source_path: Path, material_id: int) -> Optional[Path]:
    """
    Convert PPTX first slide to PNG via LibreOffice -> PDF -> PyMuPDF.
    Returns path to thumbnail or None on failure.
    """
    pdf_path = _pptx_to_pdf(source_path)
    if not pdf_path:
        return None
    try:
        result = generate_pdf_thumbnail(pdf_path, material_id)
        return result
    finally:
        try:
            pdf_path.unlink(missing_ok=True)
        except OSError:
            pass


def ensure_thumbnail(material_id: int, source_path: Path, file_format: str) -> Optional[Path]:
    """
    Return thumbnail path if available. For PDFs/PPTX, generate on first access.
    Returns None for unsupported formats or on failure.
    """
    out_path = get_thumbnail_path(material_id)
    if out_path.exists():
        return out_path

    if not source_path.exists():
        return None

    fmt = (file_format or "").lower()
    if fmt == "pdf":
        return generate_pdf_thumbnail(source_path, material_id)
    if fmt in ("pptx", "ppt"):
        return generate_pptx_thumbnail(source_path, material_id)
    return None
