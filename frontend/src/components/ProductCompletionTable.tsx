import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Search, X, Check, Filter } from 'lucide-react'
import ProductIcon from './ProductIcon'

interface MaterialTypeCompletion {
  [key: string]: boolean
}

interface ProductCompletionRow {
  product_id: number
  product_name: string
  display_name: string
  universe: string | null
  universe_id: number | null
  material_types: MaterialTypeCompletion
  other_materials_count?: number
}

interface ProductCompletionTableProps {
  products: ProductCompletionRow[]
  materialTypes: string[]
  materialTypeLabels: { [key: string]: string }
}

export default function ProductCompletionTable({
  products,
  materialTypes,
  materialTypeLabels
}: ProductCompletionTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())

  // Fetch universes for filter
  const { data: universes } = useQuery({
    queryKey: ['universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  // Filter products based on search and universe
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by universe
    if (selectedUniverse) {
      filtered = filtered.filter(p => p.universe === selectedUniverse)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.product_name.toLowerCase().includes(query) ||
        p.display_name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [products, searchQuery, selectedUniverse])

  // Auto-complete suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    const matched = products
      .filter(p =>
        (p.product_name.toLowerCase().includes(query) ||
         p.display_name.toLowerCase().includes(query)) &&
        (!selectedUniverse || p.universe === selectedUniverse)
      )
      .slice(0, 10)
    
    return matched
  }, [products, searchQuery, selectedUniverse])

  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProductIds)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProductIds(newSelection)
  }

  const selectAllFiltered = () => {
    const allIds = new Set(filteredProducts.map(p => p.product_id))
    setSelectedProductIds(allIds)
  }

  const clearSelection = () => {
    setSelectedProductIds(new Set())
  }

  // Display products: selected first, then filtered
  const displayProducts = useMemo(() => {
    const selected = filteredProducts.filter(p => selectedProductIds.has(p.product_id))
    const unselected = filteredProducts.filter(p => !selectedProductIds.has(p.product_id))
    return [...selected, ...unselected]
  }, [filteredProducts, selectedProductIds])

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          
          {/* Auto-complete suggestions */}
          {suggestions.length > 0 && searchQuery.trim() && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((product) => (
                <button
                  key={product.product_id}
                  onClick={() => {
                    setSearchQuery(product.display_name)
                    toggleProductSelection(product.product_id)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <ProductIcon 
                        productName={product.display_name}
                        size={20}
                        className="text-slate-600"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{product.display_name}</div>
                      {product.universe && (
                        <div className="text-xs text-slate-500">{product.universe}</div>
                      )}
                    </div>
                  </div>
                  {selectedProductIds.has(product.product_id) && (
                    <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Universe Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <select
            value={selectedUniverse || ''}
            onChange={(e) => setSelectedUniverse(e.target.value || null)}
            className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
          >
            <option value="">All Universes</option>
            {universes?.map((universe: any) => (
              <option key={universe.id} value={universe.name}>
                {universe.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Selection Actions */}
        <div className="flex gap-2">
          <button
            onClick={selectAllFiltered}
            className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50"
          >
            Select All ({filteredProducts.length})
          </button>
          {selectedProductIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear ({selectedProductIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-ovh overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-30 min-w-[200px] border-r border-slate-200">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[150px]">
                  Universe
                </th>
                {materialTypes.map((type) => (
                  <th
                    key={type}
                    className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[140px]"
                  >
                    <div className="flex flex-col items-center">
                      <span>{materialTypeLabels[type] || type}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayProducts.length > 0 ? (
                displayProducts.map((product) => (
                  <tr
                    key={product.product_id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedProductIds.has(product.product_id) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 sticky left-0 z-10 bg-inherit border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(product.product_id)}
                          onChange={() => toggleProductSelection(product.product_id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div className="flex-shrink-0">
                          <ProductIcon 
                            productName={product.display_name}
                            size={20}
                            className="text-slate-600"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {product.display_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{product.product_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">
                        {product.universe || '—'}
                      </span>
                    </td>
                    {materialTypes.map((type) => (
                      <td key={type} className="px-4 py-3 text-center">
                        {type === 'other' ? (
                          <div className="flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-700">
                              {product.other_materials_count || 0}
                            </span>
                          </div>
                        ) : product.material_types[type] ? (
                          <div className="flex items-center justify-center">
                            <Check className="h-5 w-5 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <X className="h-5 w-5 text-red-400" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={materialTypes.length + 2}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {searchQuery || selectedUniverse
                      ? 'No products found matching your filters'
                      : 'No products available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {displayProducts.length > 0 && (
        <div className="text-sm text-slate-600">
          Showing {displayProducts.length} of {products.length} products
          {selectedProductIds.size > 0 && ` • ${selectedProductIds.size} selected`}
        </div>
      )}
    </div>
  )
}
