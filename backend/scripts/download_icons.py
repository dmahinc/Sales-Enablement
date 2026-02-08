"""
Script to download icons for universes and categories
Downloads icons from OVHcloud design system or creates placeholder icons
"""
import sys
import os
import requests
from pathlib import Path
from typing import Dict, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Icon mappings - using Lucide icon names (matching frontend)
UNIVERSE_ICONS = {
    "Public Cloud": {
        "icon_name": "Cloud",
        "icon_url": None,  # Will use Lucide icon
    },
    "Private Cloud": {
        "icon_name": "Server",
        "icon_url": None,
    },
    "Bare Metal": {
        "icon_name": "HardDrive",
        "icon_url": None,
    },
    "Hosting & Collaboration": {
        "icon_name": "Users",
        "icon_url": None,
    }
}

CATEGORY_ICONS = {
    "ai": "Brain",
    "analytics": "BarChart",
    "backup": "Archive",
    "collab": "Users",
    "compute": "Cpu",
    "databases": "Database",
    "gaming": "Gamepad2",
    "hosting": "Globe",
    "network": "Network",
    "storage": "HardDrive",
}

def create_icon_mapping_file(output_path: Path):
    """Create a JSON file mapping icons to use in frontend"""
    icon_mapping = {
        "universes": UNIVERSE_ICONS,
        "categories": CATEGORY_ICONS,
        "note": "These are Lucide React icon names. Import from 'lucide-react' in frontend."
    }
    
    import json
    with open(output_path, 'w') as f:
        json.dump(icon_mapping, f, indent=2)
    
    print(f"Icon mapping saved to {output_path}")

def main():
    """Main function"""
    script_dir = Path(__file__).parent
    # Go up two levels from backend/scripts to project root
    project_root = script_dir.parent.parent
    output_path = project_root / "frontend" / "src" / "data" / "icon-mapping.json"
    
    # Create directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print("Creating icon mapping file...")
    create_icon_mapping_file(output_path)
    
    print("\nIcon mapping created successfully!")
    print("\nNote: Icons are referenced by name and will be loaded from lucide-react in the frontend.")
    print("No actual icon files need to be downloaded - lucide-react provides them.")

if __name__ == "__main__":
    main()
