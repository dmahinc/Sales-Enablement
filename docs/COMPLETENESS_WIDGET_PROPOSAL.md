# Product-Material Type Completeness Widget Proposal

## Overview

This proposal outlines a new completeness measurement system that tracks material coverage across the product hierarchy. Instead of measuring metadata completeness, this widget measures **how many material types are covered for each product**.

## Concept

### Current Completeness Score
- Measures metadata completeness (description, tags, keywords, etc.)
- Individual material-level metric

### New Completeness Score
- Measures product coverage completeness
- Matrix-based: Products × Material Types
- Shows which products have which material types

## Calculation Logic

### Formula
```
Completeness Score = (Number of Product-Material Type combinations with materials) / (Total possible combinations) × 100
```

### Example
- **Total Products**: 50
- **Essential Material Types**: 4 (Product Brief, Sales Enablement Deck, Sales Deck, Datasheet)
- **Total Possible Combinations**: 50 × 4 = 200
- **Filled Combinations**: 120 (products that have materials for specific types)
- **Completeness Score**: 120 / 200 = 60%

## Data Structure

### Essential Material Types (4 core types)
1. `PRODUCT_BRIEF` - Product overview document
2. `PRODUCT_SALES_ENABLEMENT_DECK` - Sales training presentation (internal)
3. `PRODUCT_SALES_DECK` - Customer-facing sales deck
4. `PRODUCT_DATASHEET` - Technical specifications

### Product Hierarchy
- **Universe** → **Category** → **Product**
- Materials link to products via `product_name` field

## Widget Design

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Product-Material Type Completeness                              │
│ Overall Score: 60% (120/200 combinations)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [All Universes ▼] [All Categories ▼] [Search...]      │
│                                                                 │
│  ┌─────────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Product     │ Product  │ Sales    │ Sales    │ Data    │   │
│  │             │ Brief    │ Enable   │ Deck     │ sheet   │   │
│  ├─────────────┼──────────┼──────────┼──────────┼──────────┤   │
│  │ VM Instances│    ✓     │    ✓     │    ✓     │    ✗     │   │
│  │ AI Notebooks│    ✓     │    ✗     │    ✓     │    ✓     │   │
│  │ Object Store│    ✓     │    ✓     │    ✓     │    ✓     │   │
│  │ ...         │          │          │          │          │   │
│  └─────────────┴──────────┴──────────┴──────────┴──────────┘   │
│                                                                 │
│  Legend: ✓ = Has material  ✗ = Missing                          │
│                                                                 │
│  Summary by Universe:                                           │
│  • Public Cloud: 52% (42/80)                                    │
│  • Private Cloud: 67% (27/40)                                   │
│  • Bare Metal: 45% (18/40)                                      │
│  • Hosting & Collaboration: 82% (33/40)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Features

1. **Matrix View**
   - Rows: Products (grouped by Universe/Category)
   - Columns: Material Types
   - Cells: Checkmark (✓) if product has that material type, cross (✗) if missing
   - Clickable cells to view materials or create new ones

2. **Aggregated Scores**
   - Overall completeness percentage
   - By Universe
   - By Category
   - By Product (row-level)

3. **Filtering & Search**
   - Filter by Universe
   - Filter by Category
   - Search products by name
   - Show only incomplete products

4. **Interactive Actions**
   - Click empty cell → Quick create material modal
   - Click filled cell → View materials for that product-type combination
   - Hover → Show material count and last updated date

## API Endpoint Design

### Endpoint: `GET /api/health/completeness-matrix`

#### Query Parameters
- `universe_id` (optional): Filter by universe
- `category_id` (optional): Filter by category
- `product_id` (optional): Filter by specific product
- `include_inactive` (optional, default: false): Include inactive products

#### Response Structure
```json
{
  "overall_score": 40.0,
  "total_products": 50,
  "total_material_types": 4,
  "total_combinations": 300,
  "filled_combinations": 120,
  "by_universe": [
    {
      "universe_id": 1,
      "universe_name": "Public Cloud",
      "score": 35.0,
      "total_products": 20,
      "filled_combinations": 42,
      "total_combinations": 120
    }
  ],
  "by_category": [
    {
      "category_id": 1,
      "category_name": "AI & Machine Learning",
      "universe_id": 1,
      "score": 45.0,
      "total_products": 5,
      "filled_combinations": 13.5,
      "total_combinations": 30
    }
  ],
  "matrix": [
    {
      "product_id": 1,
      "product_name": "VM Instances",
      "product_display_name": "VM Instances",
      "universe_id": 1,
      "universe_name": "Public Cloud",
      "category_id": 2,
      "category_name": "Compute",
      "material_types": {
        "PRODUCT_BRIEF": {
          "has_material": true,
          "material_count": 2,
          "latest_material_date": "2026-01-15T10:30:00Z"
        },
        "PRODUCT_SALES_ENABLEMENT_DECK": {
          "has_material": true,
          "material_count": 1,
          "latest_material_date": "2025-12-20T14:20:00Z"
        },
        "PRODUCT_SALES_DECK": {
          "has_material": true,
          "material_count": 3,
          "latest_material_date": "2026-02-01T09:15:00Z"
        },
        "PRODUCT_DATASHEET": {
          "has_material": false,
          "material_count": 0,
          "latest_material_date": null
        }
      },
      "product_completeness": 50.0
    }
  ]
}
```

## Implementation Plan

### Phase 1: Backend API
1. Create new endpoint `/api/health/completeness-matrix`
2. Query all active products from product hierarchy
3. Query all materials grouped by product_name and material_type
4. Build matrix data structure
5. Calculate aggregated scores

### Phase 2: Frontend Widget Component
1. Create `ProductCompletenessMatrix.tsx` component
2. Fetch data from new API endpoint
3. Render matrix table with checkmarks/crosses
4. Add filtering and search functionality
5. Add interactive cell actions

### Phase 3: Integration
1. Replace or supplement existing completeness widget in HealthDashboard
2. Add navigation/routing to detailed views
3. Add quick-create material modal from empty cells

### Phase 4: Enhancements
1. Export matrix to CSV/Excel
2. Historical tracking (completeness over time)
3. Alerts for products below threshold
4. Bulk material creation workflows

## Benefits

1. **Clear Visibility**: Directors can immediately see which products need which material types
2. **Actionable**: Empty cells provide clear action items
3. **Scalable**: Works with any number of products and material types
4. **Hierarchical**: Supports filtering by universe/category
5. **Quantifiable**: Provides concrete percentage scores

## Considerations

1. **Product Name Matching**: Materials use `product_name` (string) while products have `name` and `display_name`. Need robust matching logic.
2. **Multiple Materials**: A product can have multiple materials of the same type. Widget shows count.
3. **Material Status**: Should we count only "published" materials or all statuses?
4. **Performance**: With many products, matrix could be large. Consider pagination or virtualization.

## Next Steps

1. Review and approve proposal
2. Implement backend API endpoint
3. Create frontend widget component
4. Test with sample data
5. Deploy and gather feedback
