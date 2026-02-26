/**
 * Product Icon Utilities
 * 
 * Provides functions to get product icon paths and display product icons
 * Uses the extracted SVG icons from All Products Icons.zip and dynamically uploaded icons
 */

import iconMapping from '../data/product-icon-mapping.json'
import { api } from '../services/api'

export interface ProductIconInfo {
  iconPath: string | null
  iconFileName: string | null
  category: string | null
  hasIcon: boolean
}

// Cache for dynamic icon lookups to avoid repeated API calls
const iconCache = new Map<string, ProductIconInfo>()

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
 * First checks static mapping, then queries API for dynamically uploaded icons
 * 
 * @param productName - The display name or name of the product
 * @returns ProductIconInfo with icon path and metadata
 */
export async function getProductIconInfoAsync(productName: string | null | undefined): Promise<ProductIconInfo> {
  if (!productName) {
    return {
      iconPath: null,
      iconFileName: null,
      category: null,
      hasIcon: false
    }
  }

  // Check cache first
  const cacheKey = normalizeProductName(productName)
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!
  }

  const normalized = normalizeProductName(productName)
  
  // Try static mapping first (exact match)
  for (const [iconProductName, data] of Object.entries(iconMapping.by_product)) {
    const iconData = data as any
    const iconNormalized = normalizeProductName(iconProductName)
    
    if (normalized === iconNormalized) {
      const publicPath = iconData.icon_path
        .replace('All Products Icons/', '/icons/products/')
        .replace(/\\/g, '/')
      
      const result = {
        iconPath: publicPath,
        iconFileName: iconData.icon_file_name,
        category: iconData.category,
        hasIcon: true
      }
      iconCache.set(cacheKey, result)
      return result
    }
  }
  
  // Try static mapping (partial match)
  for (const [iconProductName, data] of Object.entries(iconMapping.by_product)) {
    const iconData = data as any
    const iconNormalized = normalizeProductName(iconProductName)
    
    if (normalized.includes(iconNormalized) || iconNormalized.includes(normalized)) {
      const publicPath = iconData.icon_path
        .replace('All Products Icons/', '/icons/products/')
        .replace(/\\/g, '/')
      
      const result = {
        iconPath: publicPath,
        iconFileName: iconData.icon_file_name,
        category: iconData.category,
        hasIcon: true
      }
      iconCache.set(cacheKey, result)
      return result
    }
  }
  
  // Try API for dynamically uploaded icons
  try {
    const response = await api.get(`/products/icons/${encodeURIComponent(productName)}`)
    const apiResult = response.data
    
    if (apiResult.hasIcon && apiResult.iconPath) {
      const result = {
        iconPath: apiResult.iconPath,
        iconFileName: apiResult.iconPath.split('/').pop() || null,
        category: null,
        hasIcon: true
      }
      iconCache.set(cacheKey, result)
      return result
    }
  } catch (error) {
    // API call failed, continue to return no icon
    console.debug('Failed to fetch icon from API:', error)
  }
  
  const result = {
    iconPath: null,
    iconFileName: null,
    category: null,
    hasIcon: false
  }
  iconCache.set(cacheKey, result)
  return result
}

/**
 * Synchronous version that checks static mapping only
 * Use this for initial render, then update with async version
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
 * Clear the icon cache (useful after uploading a new icon)
 */
export function clearIconCache() {
  iconCache.clear()
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
