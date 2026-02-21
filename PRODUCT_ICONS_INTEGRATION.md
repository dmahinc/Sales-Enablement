# Product Icons Integration Guide

This guide explains how to use the product icons extracted from `All Products Icons.zip` in the Sales Enablement application.

## Overview

- **Total Icons**: 111 SVG icons organized into 17 categories
- **Icon Location**: `frontend/public/icons/products/`
- **Mapping Files**: 
  - `frontend/src/data/product-icon-mapping.json` - Complete icon mapping
  - `product_icon_mapping.json` - Root level mapping file

## Files Created

1. **`frontend/src/utils/productIcons.ts`** - Utility functions for icon lookup
2. **`frontend/src/components/ProductIcon.tsx`** - React component for displaying product icons
3. **`frontend/src/components/ProductIconExample.tsx`** - Usage examples
4. **`frontend/src/data/product-icon-mapping.ts`** - TypeScript export of mapping data

## Quick Start

### 1. Using the ProductIcon Component

The easiest way to display a product icon:

```tsx
import ProductIcon from '../components/ProductIcon'

function MyComponent() {
  return (
    <ProductIcon 
      productName="Managed Kubernetes Service"
      size={24}
      className="text-primary-500"
    />
  )
}
```

### 2. Using Utility Functions

Get icon path programmatically:

```tsx
import { getProductIconPath, getProductIconInfo } from '../utils/productIcons'

function MyComponent({ product }) {
  const iconPath = getProductIconPath(product.display_name)
  const iconInfo = getProductIconInfo(product.display_name)
  
  if (iconPath) {
    return <img src={iconPath} alt={product.display_name} />
  }
  
  return <DefaultIcon />
}
```

## API Reference

### ProductIcon Component

```tsx
<ProductIcon
  productName={string | null | undefined}  // Product display name or name
  className?: string                       // CSS classes
  size?: number                           // Icon size in pixels (default: 24)
  fallbackIcon?: LucideIcon               // Fallback icon component (default: Package)
  showFallback?: boolean                  // Show fallback if icon not found (default: true)
/>
```

### Utility Functions

#### `getProductIconPath(productName: string | null | undefined): string | null`

Returns the public path to the icon SVG file, or `null` if not found.

```tsx
const iconPath = getProductIconPath("Managed Kubernetes Service")
// Returns: "/icons/products/Containers/Managed Kubernetes Service.svg"
```

#### `getProductIconInfo(productName: string | null | undefined): ProductIconInfo`

Returns detailed icon information:

```tsx
interface ProductIconInfo {
  iconPath: string | null      // Public path to icon
  iconFileName: string | null   // Icon file name
  category: string | null       // Icon category
  hasIcon: boolean             // Whether icon was found
}
```

#### `getProductsByCategory(categoryName: string): Array<{ name: string; iconPath: string }>`

Get all products with icons in a specific category.

#### `getAvailableCategories(): string[]`

Get list of all available icon categories.

## Integration Examples

### Example 1: Product Card

```tsx
import ProductIcon from '../components/ProductIcon'

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <ProductIcon 
        productName={product.display_name}
        size={48}
        className="mb-2"
      />
      <h3>{product.display_name}</h3>
    </div>
  )
}
```

### Example 2: Product List

```tsx
import ProductIcon from '../components/ProductIcon'

function ProductList({ products }) {
  return (
    <ul>
      {products.map(product => (
        <li key={product.id} className="flex items-center space-x-2">
          <ProductIcon 
            productName={product.display_name}
            size={20}
          />
          <span>{product.display_name}</span>
        </li>
      ))}
    </ul>
  )
}
```

### Example 3: Custom Icon Display

```tsx
import { getProductIconPath } from '../utils/productIcons'
import { Database } from 'lucide-react'

function CustomProductIcon({ product }) {
  const iconPath = getProductIconPath(product.display_name)
  
  return (
    <div>
      {iconPath ? (
        <img 
          src={iconPath} 
          alt={product.display_name}
          className="w-8 h-8"
          onError={(e) => {
            // Handle error
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <Database className="w-8 h-8 text-slate-400" />
      )}
    </div>
  )
}
```

### Example 4: Product Hierarchy Selector Integration

Update `ProductHierarchySelector.tsx` to show icons:

```tsx
import ProductIcon from './ProductIcon'

// In the product dropdown:
{filteredProducts.map((product) => (
  <button
    key={product.id}
    className="flex items-center space-x-2 px-3 py-2"
  >
    <ProductIcon 
      productName={product.display_name}
      size={16}
    />
    <span>{product.display_name}</span>
  </button>
))}
```

## Icon Categories

The icons are organized into the following categories:

1. **AI & Machine Learning** (4 products)
2. **Backup and Disaster Recovery** (4 products)
3. **Compute** (18 products)
4. **Connectivity** (2 products)
5. **Containers** (3 products)
6. **Data Analytics** (7 products)
7. **Data Platform Components** (8 products)
8. **Databases** (7 products)
9. **Developer Tools** (6 products)
10. **Domain & DNS** (2 products)
11. **Identity, Security & Operations** (7 products)
12. **Mail & Collaboration** (9 products)
13. **Managed Hosting** (2 products)
14. **Network** (13 products)
15. **Observability** (1 product)
16. **Storage** (13 products)
17. **Telephony** (6 products)

## Matching Logic

The icon matching uses fuzzy name matching:

1. **Exact Match**: Normalized product names match exactly
2. **Partial Match**: One normalized name contains the other
3. **Fallback**: If no match found, uses Lucide React icon

Normalization removes:
- Common prefixes: "Managed", "OVHcloud", "OVH", "for", "on", "service", "platform", "the"
- Special characters
- Extra whitespace

## File Structure

```
frontend/
├── public/
│   └── icons/
│       └── products/
│           ├── AI & Machine Learning/
│           ├── Compute/
│           ├── Containers/
│           └── ... (other categories)
├── src/
│   ├── components/
│   │   ├── ProductIcon.tsx
│   │   └── ProductIconExample.tsx
│   ├── data/
│   │   ├── product-icon-mapping.json
│   │   └── product-icon-mapping.ts
│   └── utils/
│       └── productIcons.ts
```

## Troubleshooting

### Icon Not Found

If an icon is not found:

1. Check the product name matches exactly (case-insensitive)
2. Verify the icon file exists in `frontend/public/icons/products/`
3. Check browser console for 404 errors
4. Use `getProductIconInfo()` to debug matching

### Icon Not Displaying

1. Verify the icon file path is correct
2. Check that the SVG file is valid
3. Ensure the public folder is being served correctly
4. Check browser console for errors

### Performance

- Icons are SVG files, so they scale well
- Consider lazy loading for large product lists
- Use React.memo() for ProductIcon if rendering many icons

## Next Steps

1. **Update ProductHierarchySelector**: Add icons to product dropdowns
2. **Update Material Cards**: Show product icons when materials are associated with products
3. **Update Product Pages**: Display icons in product detail views
4. **Create Icon Gallery**: Build a page to browse all available icons

## Related Files

- `PRODUCT_ICON_CORRESPONDENCE.md` - Complete correspondence table
- `product_icon_mapping.json` - Root level mapping file
- `product_icon_correspondence.json` - Raw correspondence data
