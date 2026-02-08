import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { ChevronDown, Search, X } from 'lucide-react'

interface Universe {
  id: number
  name: string
  display_name: string
  icon_name: string | null
  color: string | null
}

interface Category {
  id: number
  name: string
  display_name: string
  universe_id: number
  universe_name: string
}

interface Product {
  id: number
  name: string
  display_name: string
  short_description?: string | null
  universe_id: number
  universe_name: string
  category_id: number | null
  category_name: string | null
}

interface ProductHierarchySelectorProps {
  universeId: number | null
  categoryId: number | null
  productId: number | null
  onUniverseChange: (universeId: number | null) => void
  onCategoryChange: (categoryId: number | null) => void
  onProductChange: (productId: number | null) => void
  required?: boolean
  showLabels?: boolean
  renderBetweenUniverseAndCategory?: React.ReactNode
  categoryLabelAction?: React.ReactNode
  productLabelAction?: React.ReactNode
}

export default function ProductHierarchySelector({
  universeId,
  categoryId,
  productId,
  onUniverseChange,
  onCategoryChange,
  onProductChange,
  required = true,
  showLabels = true,
  renderBetweenUniverseAndCategory,
  categoryLabelAction,
  productLabelAction,
}: ProductHierarchySelectorProps) {
  const [universeSearch, setUniverseSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [universeDropdownOpen, setUniverseDropdownOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)

  // Fetch universes
  const { data: universes = [] } = useQuery<Universe[]>({
    queryKey: ['products', 'universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  // Fetch categories when universe is selected
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['products', 'categories', universeId],
    queryFn: () => api.get(`/products/categories?universe_id=${universeId}`).then(res => res.data),
    enabled: !!universeId,
  })

  // Fetch products when universe is selected (can filter by category if selected)
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<Product[]>({
    queryKey: ['products', 'list', universeId, categoryId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (universeId) params.append('universe_id', universeId.toString())
      if (categoryId) params.append('category_id', categoryId.toString())
      return api.get(`/products/?${params.toString()}`).then(res => res.data)
    },
    enabled: !!universeId,
  })

  // Filtered options based on search
  const filteredUniverses = useMemo(() => {
    if (!universeSearch) return universes
    const search = universeSearch.toLowerCase()
    return universes.filter(u => 
      u.display_name.toLowerCase().includes(search) ||
      u.name.toLowerCase().includes(search)
    )
  }, [universes, universeSearch])

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories
    const search = categorySearch.toLowerCase()
    return categories.filter(c => 
      c.display_name.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search)
    )
  }, [categories, categorySearch])

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products
    const search = productSearch.toLowerCase()
    return products.filter(p => 
      p.display_name.toLowerCase().includes(search) ||
      p.name.toLowerCase().includes(search) ||
      (p.short_description && p.short_description.toLowerCase().includes(search))
    )
  }, [products, productSearch])

  // Get selected values
  const selectedUniverse = universes.find(u => u.id === universeId)
  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedProduct = products.find(p => p.id === productId)

  // Reset category and product when universe changes
  // Only reset if categories have loaded and the category doesn't exist or doesn't belong to universe
  useEffect(() => {
    if (universeId && categoryId && !categoriesLoading && categories.length > 0) {
      const category = categories.find(c => c.id === categoryId)
      if (!category || category.universe_id !== universeId) {
        onCategoryChange(null)
        onProductChange(null)
      }
    }
  }, [universeId, categoryId, categories, categoriesLoading, onCategoryChange, onProductChange])

  // Reset product when category changes
  // Only reset if products have loaded and the product doesn't exist or doesn't belong to category
  useEffect(() => {
    if (categoryId && productId && !productsLoading && products.length > 0) {
      const product = products.find(p => p.id === productId)
      if (!product || product.category_id !== categoryId) {
        onProductChange(null)
      }
    }
  }, [categoryId, productId, products, productsLoading, onProductChange])

  return (
    <div className="space-y-4">
      {/* Universe Selector */}
      <div>
        {showLabels && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Universe {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUniverseDropdownOpen(!universeDropdownOpen)
              setCategoryDropdownOpen(false)
              setProductDropdownOpen(false)
            }}
            className={`w-full input-ovh flex items-center justify-between ${
              !selectedUniverse && required ? 'border-red-300' : ''
            }`}
          >
            <span className={selectedUniverse ? 'text-slate-900' : 'text-slate-400'}>
              {selectedUniverse ? selectedUniverse.display_name : 'Select Universe'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${universeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {universeDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-2 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search universes..."
                    value={universeSearch}
                    onChange={(e) => setUniverseSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="py-1">
                {filteredUniverses.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No universes found</div>
                ) : (
                  filteredUniverses.map((universe) => (
                    <button
                      key={universe.id}
                      type="button"
                      onClick={() => {
                        onUniverseChange(universe.id)
                        onCategoryChange(null)
                        onProductChange(null)
                        setUniverseDropdownOpen(false)
                        setUniverseSearch('')
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${
                        universeId === universe.id ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {universe.display_name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optional content between Universe and Category */}
      {renderBetweenUniverseAndCategory}

      {/* Category Selector - Always visible */}
      <div>
        {showLabels && (
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Category {required && <span className="text-red-500">*</span>}
            </label>
            {categoryLabelAction && (
              <div>{categoryLabelAction}</div>
            )}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (universeId) {
                setCategoryDropdownOpen(!categoryDropdownOpen)
                setProductDropdownOpen(false)
              }
            }}
            disabled={!universeId}
            className={`w-full input-ovh flex items-center justify-between ${
              !selectedCategory && required ? 'border-red-300' : ''
            } ${!universeId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={selectedCategory ? 'text-slate-900' : 'text-slate-400'}>
              {!universeId 
                ? 'Select Universe first' 
                : categoriesLoading 
                  ? 'Loading categories...' 
                  : selectedCategory 
                    ? selectedCategory.display_name 
                    : 'Select Category'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
            
            {categoryDropdownOpen && universeId && (
              <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-2 border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="py-1">
                  {categoriesError ? (
                    <div className="px-3 py-2 text-sm text-red-500">Error loading categories</div>
                  ) : categoriesLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No categories found</div>
                  ) : (
                    filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          onCategoryChange(category.id)
                          onProductChange(null)
                          setCategoryDropdownOpen(false)
                          setCategorySearch('')
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${
                          categoryId === category.id ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-700'
                        }`}
                      >
                        {category.display_name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Product Selector - Always visible */}
      <div>
        {showLabels && (
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Product {required && <span className="text-red-500">*</span>}
            </label>
            {productLabelAction && (
              <div>{productLabelAction}</div>
            )}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (universeId) {
                setProductDropdownOpen(!productDropdownOpen)
              }
            }}
            disabled={!universeId}
            className={`w-full input-ovh flex items-center justify-between ${
              !selectedProduct && required ? 'border-red-300' : ''
            } ${!universeId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={selectedProduct ? 'text-slate-900' : 'text-slate-400'}>
              {!universeId 
                ? 'Select Universe first' 
                : productsLoading 
                  ? 'Loading products...' 
                  : selectedProduct 
                    ? selectedProduct.display_name 
                    : 'Select Product'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
            
            {productDropdownOpen && universeId && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-2 border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="py-1">
                  {productsError ? (
                    <div className="px-3 py-2 text-sm text-red-500">Error loading products</div>
                  ) : productsLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No products found</div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          onProductChange(product.id)
                          setProductDropdownOpen(false)
                          setProductSearch('')
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${
                          productId === product.id ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{product.display_name}</div>
                          {product.short_description && (
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {product.short_description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Click outside to close dropdowns */}
      {(universeDropdownOpen || categoryDropdownOpen || productDropdownOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setUniverseDropdownOpen(false)
            setCategoryDropdownOpen(false)
            setProductDropdownOpen(false)
            setUniverseSearch('')
            setCategorySearch('')
            setProductSearch('')
          }}
        />
      )}
    </div>
  )
}
