/**
 * Product Icon Utilities
 * 
 * Provides functions to get product icon paths and display product icons
 * Uses the extracted SVG icons from All Products Icons.zip
 */

import iconMapping from '../data/product-icon-mapping.json'

export interface ProductIconInfo {
  iconPath: string | null
  iconFileName: string | null
  category: string | null
  hasIcon: boolean
}

/**
 * Normalize product name for matching
 */
function normalizeProductName(name: string): string {
  if (!name) return ''
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Get product icon information by product name
 * 
 * @param productName - The display name or name of the product
 * @returns ProductIconInfo with icon path and metadata
 */
export function getProductIconInfo(productName: string | null | undefined): ProductIconInfo {
  if (!productName) {
    return {
      iconPath: null,
      iconFileName: null,
      category: null,
      hasIcon: false
    }
  }

  const normalized = normalizeProductName(productName)
  
  // Try exact match first
  for (const [iconProductName, data] of Object.entries(iconMapping.by_product)) {
    const iconData = data as any
    const iconNormalized = normalizeProductName(iconProductName)
    
    if (normalized === iconNormalized) {
      // Convert zip path to public path
      const publicPath = iconData.icon_path
        .replace('All Products Icons/', '/icons/products/')
        .replace(/\\/g, '/')
      
      return {
        iconPath: publicPath,
        iconFileName: iconData.icon_file_name,
        category: iconData.category,
        hasIcon: true
      }
    }
  }
  
  // Try partial match
  for (const [iconProductName, data] of Object.entries(iconMapping.by_product)) {
    const iconData = data as any
    const iconNormalized = normalizeProductName(iconProductName)
    
    // Check if normalized name contains icon name or vice versa
    if (normalized.includes(iconNormalized) || iconNormalized.includes(normalized)) {
      const publicPath = iconData.icon_path
        .replace('All Products Icons/', '/icons/products/')
        .replace(/\\/g, '/')
      
      return {
        iconPath: publicPath,
        iconFileName: iconData.icon_file_name,
        category: iconData.category,
        hasIcon: true
      }
    }
  }
  
  
  return {
    iconPath: null,
    iconFileName: null,
    category: null,
    hasIcon: false
  }
}

/**
 * Get product icon path by product name
 * 
 * @param productName - The display name or name of the product
 * @returns The public path to the icon SVG file, or null if not found
 */
export function getProductIconPath(productName: string | null | undefined): string | null {
  return getProductIconInfo(productName).iconPath
}

/**
 * Get all products in a category
 * 
 * @param categoryName - The category name
 * @returns Array of product names with icons in that category
 */
export function getProductsByCategory(categoryName: string): Array<{ name: string; iconPath: string }> {
  const category = iconMapping.by_category[categoryName]
  if (!category) return []
  
  return category.map((product: any) => ({
    name: product.product_name,
    iconPath: product.icon_path
      .replace('All Products Icons/', '/icons/products/')
      .replace(/\\/g, '/')
  }))
}

/**
 * Get all available categories
 * 
 * @returns Array of category names
 */
export function getAvailableCategories(): string[] {
  return Object.keys(iconMapping.by_category)
}
