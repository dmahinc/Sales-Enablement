"""
File content extraction utilities for AI analysis
"""
import io
from typing import Optional, Dict, Any
from pathlib import Path

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


def extract_file_content(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text content and metadata from various file types
    
    Returns:
        dict with keys: text, metadata, file_type
    """
    file_ext = Path(filename).suffix.lower()
    result = {
        "text": "",
        "metadata": {},
        "file_type": file_ext,
        "filename": filename
    }
    
    try:
        if file_ext == '.pdf' and PDF_AVAILABLE:
            result.update(_extract_pdf(file_content))
        elif file_ext in ['.pptx', '.ppt'] and PPTX_AVAILABLE:
            result.update(_extract_pptx(file_content))
        elif file_ext in ['.docx', '.doc'] and DOCX_AVAILABLE:
            result.update(_extract_docx(file_content))
        else:
            # Fallback: try to extract from filename
            result["text"] = _extract_from_filename(filename)
    except Exception as e:
        # If extraction fails, fall back to filename analysis
        result["text"] = _extract_from_filename(filename)
        result["metadata"]["extraction_error"] = str(e)
    
    return result


def _extract_pdf(file_content: bytes) -> Dict[str, Any]:
    """Extract text from PDF"""
    text_parts = []
    metadata = {}
    
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract metadata
        if pdf_reader.metadata:
            metadata = {
                "title": pdf_reader.metadata.get("/Title", ""),
                "author": pdf_reader.metadata.get("/Author", ""),
                "subject": pdf_reader.metadata.get("/Subject", ""),
            }
        
        # Extract text from all pages (limit to first 10 pages for performance)
        for page_num, page in enumerate(pdf_reader.pages[:10]):
            try:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            except Exception:
                continue
        
        return {
            "text": "\n\n".join(text_parts),
            "metadata": metadata
        }
    except Exception as e:
        return {
            "text": "",
            "metadata": {"error": str(e)}
        }


def _extract_pptx(file_content: bytes) -> Dict[str, Any]:
    """Extract text from PowerPoint"""
    text_parts = []
    metadata = {}
    
    try:
        pptx_file = io.BytesIO(file_content)
        presentation = Presentation(pptx_file)
        
        # Extract metadata
        if presentation.core_properties:
            metadata = {
                "title": presentation.core_properties.title or "",
                "author": presentation.core_properties.author or "",
                "subject": presentation.core_properties.subject or "",
            }
        
        # Extract text from slides (limit to first 20 slides)
        for slide_num, slide in enumerate(presentation.slides[:20]):
            slide_text = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    slide_text.append(shape.text)
            if slide_text:
                text_parts.append("\n".join(slide_text))
        
        return {
            "text": "\n\n".join(text_parts),
            "metadata": metadata
        }
    except Exception as e:
        return {
            "text": "",
            "metadata": {"error": str(e)}
        }


def _extract_docx(file_content: bytes) -> Dict[str, Any]:
    """Extract text from Word document"""
    text_parts = []
    metadata = {}
    
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)
        
        # Extract metadata
        if doc.core_properties:
            metadata = {
                "title": doc.core_properties.title or "",
                "author": doc.core_properties.author or "",
                "subject": doc.core_properties.subject or "",
            }
        
        # Extract text from paragraphs
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        return {
            "text": "\n\n".join(text_parts),
            "metadata": metadata
        }
    except Exception as e:
        return {
            "text": "",
            "metadata": {"error": str(e)}
        }


def _extract_from_filename(filename: str) -> str:
    """Extract information from filename as fallback"""
    # Remove extension
    name_without_ext = Path(filename).stem
    # Replace underscores and hyphens with spaces
    return name_without_ext.replace("_", " ").replace("-", " ")
