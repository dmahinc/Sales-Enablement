/**
 * Example usage of ProductIcon component
 * 
 * This file demonstrates how to use the ProductIcon component
 * in various scenarios throughout the application.
 */

import React from 'react'
import ProductIcon from './ProductIcon'
import { getProductIconPath, getProductIconInfo } from '../utils/productIcons'
import { Database, Server, Cloud } from 'lucide-react'

interface Product {
  id: number
  name: string
  display_name: string
}

interface ProductIconExampleProps {
  product: Product
}

/**
 * Example 1: Basic usage with ProductIcon component
 */
export function BasicProductIconExample({ product }: ProductIconExampleProps) {
  return (
    <div className="flex items-center space-x-2">
      <ProductIcon 
        productName={product.display_name}
        size={24}
        className="text-slate-600"
      />
      <span>{product.display_name}</span>
    </div>
  )
}

/**
 * Example 2: Product icon with custom fallback
 */
export function CustomFallbackExample({ product }: ProductIconExampleProps) {
  return (
    <div className="flex items-center space-x-2">
      <ProductIcon 
        productName={product.display_name}
        size={32}
        fallbackIcon={Database}
        className="text-primary-500"
      />
      <span className="font-medium">{product.display_name}</span>
    </div>
  )
}

/**
 * Example 3: Using utility function to get icon path
 */
export function UtilityFunctionExample({ product }: ProductIconExampleProps) {
  const iconPath = getProductIconPath(product.display_name)
  const iconInfo = getProductIconInfo(product.display_name)
  
  return (
    <div className="flex items-center space-x-3">
      {iconPath ? (
        <img 
          src={iconPath} 
          alt={product.display_name}
          className="w-8 h-8"
        />
      ) : (
        <Server className="w-8 h-8 text-slate-400" />
      )}
      <div>
        <div className="font-medium">{product.display_name}</div>
        {iconInfo.category && (
          <div className="text-xs text-slate-500">{iconInfo.category}</div>
        )}
      </div>
    </div>
  )
}

/**
 * Example 4: Product card with icon
 */
export function ProductCardExample({ product }: ProductIconExampleProps) {
  const iconInfo = getProductIconInfo(product.display_name)
  
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <ProductIcon 
            productName={product.display_name}
            size={48}
            className="text-primary-500"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-900">{product.display_name}</h3>
          {iconInfo.category && (
            <p className="text-sm text-slate-500 mt-1">{iconInfo.category}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Example 5: Product list with icons
 */
export function ProductListExample({ products }: { products: Product[] }) {
  return (
    <div className="space-y-2">
      {products.map((product) => (
        <div key={product.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded">
          <ProductIcon 
            productName={product.display_name}
            size={20}
            className="text-slate-600"
          />
          <span className="text-sm">{product.display_name}</span>
        </div>
      ))}
    </div>
  )
}
