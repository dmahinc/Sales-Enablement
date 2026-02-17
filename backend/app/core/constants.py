"""
Application constants
"""
# File upload limits
MAX_FILE_SIZE = 60 * 1024 * 1024 * 1024  # 60GB in bytes
ALLOWED_FILE_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.docx', '.doc']
ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',  # .pptx
    'application/vnd.ms-powerpoint',  # .ppt
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'application/msword',  # .doc
]

# Pagination defaults
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Product Universes
VALID_UNIVERSES = [
    "Public Cloud",
    "Private Cloud",
    "Bare Metal",
    "Hosting & Collaboration"
]

# Material Statuses
MATERIAL_STATUSES = [
    "draft",
    "review",
    "published",
    "archived"
]
