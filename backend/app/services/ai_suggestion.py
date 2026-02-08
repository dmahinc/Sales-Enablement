"""
AI suggestion service using OVHcloud AI Endpoints
"""
import json
import httpx
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.services.file_extraction import extract_file_content
from app.core.database import SessionLocal
from app.models.product import Universe, Category, Product


class AISuggestionService:
    """Service for generating AI-powered suggestions for material metadata"""
    
    def __init__(self):
        self.enabled = settings.OVH_AI_ENABLED and bool(settings.OVH_AI_ENDPOINT_URL)
        self.endpoint_url = settings.OVH_AI_ENDPOINT_URL
        self.api_key = settings.OVH_AI_API_KEY
        self.model = settings.OVH_AI_MODEL
        self.confidence_threshold = settings.OVH_AI_CONFIDENCE_THRESHOLD
    
    async def suggest_product_hierarchy(
        self,
        file_content: bytes,
        filename: str,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate suggestions for universe, category, and product based on file content
        
        Returns:
            dict with keys: universe_id, category_id, product_id, confidence, reasoning
        """
        if not self.enabled:
            # Fallback to filename-based suggestions
            return self._suggest_from_filename(filename)
        
        # Extract file content
        extracted = extract_file_content(file_content, filename)
        
        # Get product catalog for context
        db = SessionLocal()
        try:
            universes = db.query(Universe).all()
            products = db.query(Product).all()
            
            # Build context for AI
            product_catalog = self._build_product_catalog(universes, products)
            
            # Call AI endpoint
            suggestion = await self._call_ai_endpoint(
                filename=filename,
                file_text=extracted["text"],
                file_metadata=extracted["metadata"],
                product_catalog=product_catalog,
                user_history=self._get_user_history(user_id) if user_id else None
            )
            
            return suggestion
        finally:
            db.close()
    
    def _build_product_catalog(self, universes: List[Universe], products: List[Product]) -> str:
        """Build a text representation of the product catalog for AI context"""
        catalog_parts = []
        
        for universe in universes:
            universe_products = [p for p in products if p.universe_id == universe.id]
            if universe_products:
                catalog_parts.append(f"\nUniverse: {universe.display_name or universe.name}")
                
                # Group by category
                categories = {}
                for product in universe_products:
                    cat_id = product.category_id
                    if cat_id not in categories:
                        categories[cat_id] = []
                    categories[cat_id].append(product)
                
                for cat_id, cat_products in categories.items():
                    if cat_id:
                        category = next((c for c in [p.category for p in cat_products if p.category]), None)
                        if category:
                            catalog_parts.append(f"  Category: {category.display_name or category.name}")
                    for product in cat_products:
                        catalog_parts.append(f"    - {product.display_name or product.name}")
        
        return "\n".join(catalog_parts)
    
    def _get_user_history(self, user_id: int) -> Optional[str]:
        """Get user's upload history for context"""
        db = SessionLocal()
        try:
            from app.models.material import Material
            recent_materials = db.query(Material).filter(
                Material.owner_id == user_id
            ).order_by(Material.created_at.desc()).limit(10).all()
            
            if not recent_materials:
                return None
            
            history = []
            for mat in recent_materials:
                history.append(f"- {mat.name} → {mat.universe_name} / {mat.product_name}")
            
            return "\n".join(history)
        finally:
            db.close()
    
    async def _call_ai_endpoint(
        self,
        filename: str,
        file_text: str,
        file_metadata: Dict[str, Any],
        product_catalog: str,
        user_history: Optional[str] = None
    ) -> Dict[str, Any]:
        """Call OVHcloud AI Endpoint to get suggestions"""
        
        # Build prompt
        prompt = self._build_prompt(
            filename=filename,
            file_text=file_text[:5000],  # Limit text length
            file_metadata=file_metadata,
            product_catalog=product_catalog,
            user_history=user_history
        )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an assistant that helps categorize sales materials for OVHcloud products. Analyze the file and suggest the most appropriate universe, category, and product."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,  # Lower temperature for more consistent results
                        "max_tokens": 500
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return self._parse_ai_response(ai_response)
                else:
                    # Fallback on API error
                    return self._suggest_from_filename(filename)
        except Exception as e:
            # Fallback on any error
            return self._suggest_from_filename(filename)
    
    def _build_prompt(
        self,
        filename: str,
        file_text: str,
        file_metadata: Dict[str, Any],
        product_catalog: str,
        user_history: Optional[str] = None
    ) -> str:
        """Build the prompt for AI"""
        
        prompt_parts = [
            "Analyze this sales material file and suggest the most appropriate product hierarchy.",
            "",
            f"Filename: {filename}",
        ]
        
        if file_metadata.get("title"):
            prompt_parts.append(f"Document Title: {file_metadata['title']}")
        if file_metadata.get("subject"):
            prompt_parts.append(f"Subject: {file_metadata['subject']}")
        
        if file_text:
            prompt_parts.append(f"\nFile Content (first 5000 chars):\n{file_text}")
        
        prompt_parts.append(f"\nAvailable Product Catalog:\n{product_catalog}")
        
        if user_history:
            prompt_parts.append(f"\nUser's Recent Uploads (for context):\n{user_history}")
        
        prompt_parts.extend([
            "",
            "Respond with a JSON object containing:",
            "- universe_name: The universe name (exact match from catalog)",
            "- category_name: The category name (exact match from catalog)",
            "- product_name: The product name (exact match from catalog)",
            "- confidence: A number between 0.0 and 1.0 indicating confidence",
            "- reasoning: Brief explanation of why these were suggested",
            "",
            "Example response:",
            '{"universe_name": "Public Cloud", "category_name": "AI & Machine Learning", "product_name": "AI Deploy", "confidence": 0.95, "reasoning": "The document mentions AI Deploy features and is clearly related to Public Cloud AI services."}'
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """Parse AI response and match to database IDs"""
        try:
            # Try to extract JSON from response
            json_start = ai_response.find("{")
            json_end = ai_response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = ai_response[json_start:json_end]
                parsed = json.loads(json_str)
                
                # Match to database IDs
                db = SessionLocal()
                try:
                    universe = None
                    category = None
                    product = None
                    
                    if parsed.get("universe_name"):
                        universe = db.query(Universe).filter(
                            (Universe.name == parsed["universe_name"]) |
                            (Universe.display_name == parsed["universe_name"])
                        ).first()
                    
                    if universe and parsed.get("category_name"):
                        category = db.query(Category).filter(
                            Category.universe_id == universe.id,
                            ((Category.name == parsed["category_name"]) |
                             (Category.display_name == parsed["category_name"]))
                        ).first()
                    
                    if universe and parsed.get("product_name"):
                        product = db.query(Product).filter(
                            Product.universe_id == universe.id,
                            ((Product.name == parsed["product_name"]) |
                             (Product.display_name == parsed["product_name"]))
                        ).first()
                        
                        # If product has a category, ensure it matches
                        if product and category and product.category_id != category.id:
                            category = None  # Reset if mismatch
                    
                    return {
                        "universe_id": universe.id if universe else None,
                        "category_id": category.id if category else None,
                        "product_id": product.id if product else None,
                        "universe_name": universe.display_name or universe.name if universe else parsed.get("universe_name"),
                        "category_name": category.display_name or category.name if category else parsed.get("category_name"),
                        "product_name": product.display_name or product.name if product else parsed.get("product_name"),
                        "confidence": float(parsed.get("confidence", 0.5)),
                        "reasoning": parsed.get("reasoning", "")
                    }
                finally:
                    db.close()
        except Exception:
            pass
        
        # Fallback
        return self._suggest_from_filename("")
    
    def _suggest_from_filename(self, filename: str) -> Dict[str, Any]:
        """Fallback: suggest based on filename patterns"""
        # Simple keyword matching as fallback
        filename_lower = filename.lower()
        
        # Try to match universe keywords
        universe_keywords = {
            "public cloud": ["public", "cloud"],
            "private cloud": ["private", "dedicated"],
            "bare metal": ["bare", "metal", "bm"],
            "hosting & collaboration": ["hosting", "collaboration", "web"]
        }
        
        suggested_universe = None
        for universe_name, keywords in universe_keywords.items():
            if any(kw in filename_lower for kw in keywords):
                suggested_universe = universe_name
                break
        
        return {
            "universe_id": None,
            "category_id": None,
            "product_id": None,
            "universe_name": suggested_universe,
            "category_name": None,
            "product_name": None,
            "confidence": 0.3,
            "reasoning": "Suggestion based on filename keywords (low confidence)"
        }


# Singleton instance
ai_suggestion_service = AISuggestionService()
