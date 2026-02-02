"""
File storage service - handles file uploads and storage
"""
import os
import shutil
from pathlib import Path
from typing import Optional
from app.core.config import settings

class StorageService:
    """Handles file storage operations"""
    
    def __init__(self):
        self.storage_path = Path(settings.STORAGE_PATH)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Create folder structure
        self._create_folder_structure()
    
    def _create_folder_structure(self):
        """Create the folder structure for materials"""
        folders = [
            "01_Internal_Materials/Product_Briefs/By_Product",
            "01_Internal_Materials/Product_Briefs/By_Universe",
            "01_Internal_Materials/Sales_Enablement_Decks/By_Product",
            "01_Internal_Materials/Sales_Enablement_Decks/By_Universe",
            "01_Internal_Materials/Product_Portfolio",
            "02_Customer_Facing/Sales_Decks/Universe_Level",
            "02_Customer_Facing/Sales_Decks/Product_Level",
            "02_Customer_Facing/Datasheets/By_Product",
            "02_Customer_Facing/Product_Catalog",
            "03_Shared_Assets/Personas",
            "03_Shared_Assets/Content_Blocks/Narratives",
            "03_Shared_Assets/Content_Blocks/Value_Props",
            "03_Shared_Assets/Content_Blocks/Proof_Points",
            "03_Shared_Assets/Templates",
            "04_Archive/Deprecated_Materials"
        ]
        
        for folder in folders:
            (self.storage_path / folder).mkdir(parents=True, exist_ok=True)
    
    def get_folder_path(self, material_type: str, audience: str, product_name: Optional[str] = None, universe_name: Optional[str] = None) -> Path:
        """Get the folder path for a material based on type and audience"""
        if audience == "internal":
            if material_type == "product_brief":
                if product_name:
                    return self.storage_path / "01_Internal_Materials/Product_Briefs/By_Product" / product_name
                elif universe_name:
                    return self.storage_path / "01_Internal_Materials/Product_Briefs/By_Universe" / universe_name
            elif material_type == "sales_enablement_deck":
                if product_name:
                    return self.storage_path / "01_Internal_Materials/Sales_Enablement_Decks/By_Product" / product_name
                elif universe_name:
                    return self.storage_path / "01_Internal_Materials/Sales_Enablement_Decks/By_Universe" / universe_name
            elif material_type == "product_portfolio":
                return self.storage_path / "01_Internal_Materials/Product_Portfolio"
        
        elif audience == "customer_facing":
            if material_type == "sales_deck":
                if universe_name:
                    return self.storage_path / "02_Customer_Facing/Sales_Decks/Universe_Level" / universe_name
                elif product_name:
                    return self.storage_path / "02_Customer_Facing/Sales_Decks/Product_Level" / product_name
            elif material_type == "datasheet":
                if product_name:
                    return self.storage_path / "02_Customer_Facing/Datasheets/By_Product" / product_name
            elif material_type == "product_catalog":
                return self.storage_path / "02_Customer_Facing/Product_Catalog"
        
        # Default fallback
        return self.storage_path / "04_Archive/Deprecated_Materials"
    
    def save_file(self, file_content: bytes, file_name: str, folder_path: Path) -> str:
        """Save a file to storage"""
        folder_path.mkdir(parents=True, exist_ok=True)
        file_path = folder_path / file_name
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        return str(file_path.relative_to(self.storage_path))
    
    def get_file_path(self, relative_path: str) -> Path:
        """Get full file path from relative path"""
        return self.storage_path / relative_path
    
    def file_exists(self, relative_path: str) -> bool:
        """Check if file exists"""
        return (self.storage_path / relative_path).exists()
    
    def delete_file(self, relative_path: str) -> bool:
        """Delete a file"""
        file_path = self.storage_path / relative_path
        if file_path.exists():
            file_path.unlink()
            return True
        return False

storage_service = StorageService()
