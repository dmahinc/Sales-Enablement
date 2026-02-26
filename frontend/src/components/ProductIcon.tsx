/**
 * ProductIcon Component
 * 
 * Displays a product icon, falling back to a Lucide icon if the product icon is not found
 * Supports both static icons from JSON mapping and dynamically uploaded icons via API
 */

import React, { useState, useEffect } from 'react'
import { Package, LucideIcon } from 'lucide-react'
import { getProductIconInfo, getProductIconInfoAsync, clearIconCache } from '../utils/productIcons'

interface ProductIconProps {
  productName: string | null | undefined
  className?: string
  size?: number
  fallbackIcon?: LucideIcon
  showFallback?: boolean
}

export default function ProductIcon({
  productName,
  className = '',
  size = 24,
  fallbackIcon: FallbackIcon = Package,
  showFallback = true
}: ProductIconProps) {
  const [iconInfo, setIconInfo] = useState(getProductIconInfo(productName))
  const [imageError, setImageError] = useState(false)
  
  // Check for dynamic icons when component mounts or productName changes
  useEffect(() => {
    if (!productName) {
      setIconInfo({
        iconPath: null,
        iconFileName: null,
        category: null,
        hasIcon: false
      })
      setImageError(false)
      return
    }

    // First check static mapping (synchronous)
    const staticInfo = getProductIconInfo(productName)
    setIconInfo(staticInfo)
    setImageError(false)

    // If no static icon found, check API for dynamic icons
    if (!staticInfo.hasIcon) {
      getProductIconInfoAsync(productName).then(dynamicInfo => {
        if (dynamicInfo.hasIcon) {
          setIconInfo(dynamicInfo)
          setImageError(false)
        }
      }).catch(() => {
        // API call failed, keep static result
      })
    }
  }, [productName])
  
  // If we have a product icon path and no error, try to show it
  if (iconInfo.hasIcon && iconInfo.iconPath && !imageError) {
    return (
      <img
        src={iconInfo.iconPath}
        alt={productName || 'Product icon'}
        className={`${className} flex-shrink-0`}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`, 
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0
        }}
        onError={() => {
          setImageError(true)
        }}
      />
    )
  }
  
  // Show fallback icon only if product icon is not available or errored
  if (showFallback) {
    return (
      <FallbackIcon 
        className={`${className} flex-shrink-0`}
        size={size}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          display: 'block',
          flexShrink: 0
        }} 
      />
    )
  }
  
  return null
}

// Export function to clear cache (useful after icon upload)
export { clearIconCache }
