# Product Hierarchy System

## Overview

The Product Hierarchy system provides a structured way to organize OVHcloud products for the Sales Enablement Platform. Products are organized into **Universes** → **Categories** → **Products**.

## Structure

### Universes

The four main product universes:

1. **Public Cloud** - Scalable cloud infrastructure and services
2. **Private Cloud** - Dedicated private cloud infrastructure  
3. **Bare Metal** - Physical dedicated servers
4. **Hosting & Collaboration** - Web hosting and collaboration tools

### Categories

Categories group related products within each universe:

- **AI & Machine Learning** (Public Cloud)
- **Data Analytics** (Public Cloud)
- **Compute** (Public Cloud, Bare Metal)
- **Storage** (Public Cloud, Bare Metal)
- **Databases** (Public Cloud)
- **Network & Connectivity** (Public Cloud)
- **Backup and Disaster Recovery** (Private Cloud)
- **Gaming solutions** (Bare Metal)
- **Collaborative Tools** (Hosting & Collaboration)
- **Web Hosting** (Hosting & Collaboration)

### Products

Individual OVHcloud products (e.g., "VM instances", "AI Notebooks", "Dedicated servers")

## Database Schema

### Tables

- `universes` - Product universes
- `categories` - Product categories (belongs to a universe)
- `products` - Individual products (belongs to a universe and optionally a category)

### Relationships

```
Universe (1) ──→ (many) Category
Category (1) ──→ (many) Product
Universe (1) ──→ (many) Product (direct relationship)
```

## Setup

### 1. Run Database Migration

```bash
cd backend
alembic upgrade head
```

This creates the `universes`, `categories`, and `products` tables.

### 2. Import Product Hierarchy

#### Option A: Scrape from product-map.ovh (Recommended)

```bash
cd backend
pip install beautifulsoup4 requests  # If not already installed
python3 scripts/scrape_product_hierarchy.py
```

This will:
- Fetch product data from `https://www.product-map.ovh/product.datatable.html`
- Parse the HTML table
- Extract all products with their universe and category assignments
- Save to `product_hierarchy.json`

Then import to database:

```bash
python3 scripts/import_product_hierarchy.py
```

#### Option B: Manual Import

You can manually create universes, categories, and products through the API or by directly inserting into the database.

### 3. Generate Icon Mapping

```bash
cd backend
python3 scripts/download_icons.py
```

This creates `frontend/src/data/icon-mapping.json` with icon names for frontend use.

## API Endpoints

### Get All Universes

```http
GET /api/products/universes
```

Response:
```json
[
  {
    "id": 1,
    "name": "Public Cloud",
    "display_name": "Public Cloud",
    "description": "Scalable cloud infrastructure...",
    "icon_name": "Cloud",
    "color": "#0050d7",
    "display_order": 1,
    "product_count": 45
  }
]
```

### Get Categories by Universe

```http
GET /api/products/categories?universe_id=1
```

### Get All Products

```http
GET /api/products/?universe_id=1&category_id=5&search=AI
```

Query parameters:
- `universe_id` - Filter by universe
- `category_id` - Filter by category
- `search` - Search in product names
- `include_inactive` - Include inactive products

### Get Product Hierarchy Tree

```http
GET /api/products/hierarchy/tree
```

Returns complete hierarchy:
```json
{
  "hierarchy": [
    {
      "id": 1,
      "name": "Public Cloud",
      "display_name": "Public Cloud",
      "categories": [
        {
          "id": 1,
          "name": "ai",
          "display_name": "AI & Machine Learning",
          "products": [
            {
              "id": 1,
              "name": "AI Deploy",
              "display_name": "AI Deploy",
              "short_description": "Deploy AI applications...",
              "phase": "beta"
            }
          ]
        }
      ]
    }
  ]
}
```

## Integration with Materials

Materials can be associated with products using the `product_name` field. The product hierarchy provides:

1. **Validation** - Ensure product names match existing products
2. **Autocomplete** - Suggest products when uploading materials
3. **Filtering** - Filter materials by universe/category/product
4. **Analytics** - Track material coverage by product

### Future Enhancement

We can add a `product_id` foreign key to the `materials` table for direct relationships:

```sql
ALTER TABLE materials ADD COLUMN product_id INTEGER REFERENCES products(id);
```

## Frontend Integration

### Using Icons

Icons are mapped in `frontend/src/data/icon-mapping.json`. Use Lucide React icons:

```tsx
import { Cloud, Server, HardDrive, Users } from 'lucide-react'

const iconMap = {
  Cloud: Cloud,
  Server: Server,
  HardDrive: HardDrive,
  Users: Users
}

const UniverseIcon = iconMap[universe.icon_name]
```

### Product Selection Component

When uploading materials, use the product hierarchy API to:

1. Show universe selection
2. Filter categories by universe
3. Show products by category
4. Autocomplete product names

## Maintenance

### Updating Product Data

To update product data from product-map.ovh:

```bash
cd backend
python3 scripts/scrape_product_hierarchy.py
python3 scripts/import_product_hierarchy.py
```

### Adding New Products

Products can be added via:
1. API endpoints (requires authentication)
2. Database migration scripts
3. Admin interface (future)

## Notes

- Product data is sourced from `https://www.product-map.ovh/product.datatable.html`
- The original source page `https://rtstatic.ovhcloud.tools/product/static/map/univers.html` may require internal access
- Icons use Lucide React icon library (no files to download)
- Product hierarchy is used for classification, not as a strict requirement
