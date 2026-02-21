/**
 * ProductIcon Component
 * 
 * Displays a product icon, falling back to a Lucide icon if the product icon is not found
 */

import React from 'react'
import { Package, LucideIcon } from 'lucide-react'
import { getProductIconInfo } from '../utils/productIcons'

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
  const iconInfo = getProductIconInfo(productName)
  
  if (iconInfo.hasIcon && iconInfo.iconPath) {
    return (
      <img
        src={iconInfo.iconPath}
        alt={productName || 'Product icon'}
        className={className}
        style={{ width: size, height: size }}
        onError={(e) => {
          // If image fails to load, hide it and show fallback if enabled
          if (showFallback) {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement
            if (fallback) {
              fallback.style.display = 'block'
            }
          }
        }}
      />
    )
  }
  
  if (showFallback) {
    return (
      <FallbackIcon
        className={className}
        size={size}
        style={{ display: iconInfo.hasIcon ? 'none' : 'block' }}
      />
    )
  }
  
  return null
}
