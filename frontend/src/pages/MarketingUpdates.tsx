import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Eye, Plus, Edit, Trash2, Calendar, User, X, Filter, Tag } from 'lucide-react'
import Modal from '../components/Modal'
import MultiSelect from '../components/MultiSelect'
import { useAuth } from '../contexts/AuthContext'
import DOMPurify from 'dompurify'

// Ensure DOMPurify is available (for SSR compatibility)
const sanitizeHTML = (html: string) => {
  if (typeof window !== 'undefined' && DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr', 'div', 'span', 'img'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style']
    })
  }
  return html
}

interface MarketingUpdate {
  id: number
  title: string
  short_description?: string
  content: string
  category: string
  subcategory?: string
  universe_id?: number
  category_id?: number
  product_id?: number
  universe_name?: string
  category_name?: string
  product_name?: string
  priority?: string
  target_audience?: string
  created_by_id: number
  created_by_name?: string
  created_by_email?: string
  published_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

interface CategoryInfo {
  label: string
  subcategories: string[]
}

interface CategoriesResponse {
  [key: string]: CategoryInfo
}

interface Universe {
  id: number
  name: string
  display_name: string
}

interface Category {
  id: number
  name: string
  display_name: string
  universe_id: number
}

interface Product {
  id: number
  name: string
  display_name: string
  category_id?: number
  universe_id: number
}

export default function MarketingUpdates() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedUpdate, setSelectedUpdate] = useState<MarketingUpdate | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<MarketingUpdate | null>(null)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<number[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all')

  const isAdmin = user?.role === 'admin' || user?.is_superuser
  const isDirector = user?.role === 'director'
  const isPMM = user?.role === 'pmm'
  const canEdit = isAdmin || isDirector || isPMM

  // Fetch categories and subcategories
  const { data: categoriesInfo = {}, error: categoriesError } = useQuery<CategoriesResponse>({
    queryKey: ['marketing-updates-categories'],
    queryFn: async () => {
      const response = await api.get('/marketing-updates/categories')
      return response.data
    },
    retry: false
  })

  // Fetch marketing updates
  const { data: updates = [], isLoading, error: updatesError } = useQuery<MarketingUpdate[]>({
    queryKey: ['marketing-updates'],
    queryFn: async () => {
      const response = await api.get('/marketing-updates')
      return response.data
    },
    retry: false
  })

  // Fetch product hierarchy
  const { data: universes = [] } = useQuery<Universe[]>({
    queryKey: ['universes'],
    queryFn: async () => {
      const response = await api.get('/products/universes')
      return response.data
    }
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/products/categories')
      return response.data
    }
  })

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products/')
      return response.data
    }
  })

  // Filter updates based on selected filters
  const filteredUpdates = useMemo(() => {
    let filtered = updates

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(update => update.category === selectedCategory)
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      filtered = filtered.filter(update => update.subcategory === selectedSubcategory)
    }

    // Filter by universe
    if (selectedUniverseIds.length > 0) {
      filtered = filtered.filter(update => {
        if (!update.universe_id) return false
        return selectedUniverseIds.includes(update.universe_id)
      })
    }

    // Filter by category (product hierarchy)
    if (selectedCategoryIds.length > 0) {
      filtered = filtered.filter(update => {
        if (!update.category_id) return false
        return selectedCategoryIds.includes(update.category_id)
      })
    }

    // Filter by product
    if (selectedProductIds.length > 0) {
      filtered = filtered.filter(update => {
        if (!update.product_id) return false
        return selectedProductIds.includes(update.product_id)
      })
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const daysAgo = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      filtered = filtered.filter(update => {
        const updateDate = update.published_at 
          ? new Date(update.published_at) 
          : new Date(update.created_at)
        return updateDate >= cutoffDate
      })
    }

    return filtered
  }, [updates, selectedCategory, selectedSubcategory, selectedUniverseIds, selectedCategoryIds, selectedProductIds, dateFilter])

  // Get filtered categories based on selected universes
  const filteredCategories = useMemo(() => {
    if (selectedUniverseIds.length === 0) return categories
    return categories.filter(cat => selectedUniverseIds.includes(cat.universe_id))
  }, [categories, selectedUniverseIds])

  // Get filtered products based on selected universes and categories
  const filteredProducts = useMemo(() => {
    let products = allProducts
    if (selectedUniverseIds.length > 0) {
      products = products.filter(prod => selectedUniverseIds.includes(prod.universe_id))
    }
    if (selectedCategoryIds.length > 0) {
      products = products.filter(prod => prod.category_id && selectedCategoryIds.includes(prod.category_id))
    }
    return products
  }, [allProducts, selectedUniverseIds, selectedCategoryIds])

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || !categoriesInfo[selectedCategory]) return []
    return categoriesInfo[selectedCategory].subcategories || []
  }, [selectedCategory, categoriesInfo])

  const clearAllFilters = () => {
    setSelectedCategory('')
    setSelectedSubcategory('')
    setSelectedUniverseIds([])
    setSelectedCategoryIds([])
    setSelectedProductIds([])
    setDateFilter('all')
  }

  const hasActiveFilters = selectedCategory !== '' || 
    selectedSubcategory !== '' ||
    selectedUniverseIds.length > 0 || 
    selectedCategoryIds.length > 0 || 
    selectedProductIds.length > 0 || 
    dateFilter !== 'all'

  const handleView = (update: MarketingUpdate) => {
    setSelectedUpdate(update)
  }

  const handleEdit = (update: MarketingUpdate) => {
    setEditingUpdate(update)
    setIsEditModalOpen(true)
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/marketing-updates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-updates'] })
    }
  })

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this marketing update?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  const getCategoryLabel = (categoryKey: string) => {
    return categoriesInfo[categoryKey]?.label || categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getHierarchyPath = (update: MarketingUpdate) => {
    const parts = []
    if (update.universe_name) parts.push(update.universe_name)
    if (update.category_name) parts.push(update.category_name)
    if (update.product_name) parts.push(update.product_name)
    return parts.length > 0 ? parts.join(' • ') : 'General'
  }

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'important':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  // Error handling
  if (categoriesError) {
    console.error('Error loading categories:', categoriesError)
  }
  if (updatesError) {
    console.error('Error loading updates:', updatesError)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading marketing updates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketing Updates</h1>
          <p className="mt-2 text-slate-600">Stay informed with the latest marketing news and insights for sales teams</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-ovh-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Update</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('') // Reset subcategory when category changes
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {Object.keys(categoriesInfo).map(key => (
                <option key={key} value={key}>
                  {categoriesInfo[key].label}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subcategory
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!selectedCategory || availableSubcategories.length === 0}
            >
              <option value="">All Subcategories</option>
              {availableSubcategories.map(sub => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Universe Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Universe
            </label>
            <MultiSelect
              options={universes.map(u => ({
                value: u.id,
                label: u.display_name || u.name
              }))}
              selectedValues={selectedUniverseIds}
              onChange={(selected) => {
                setSelectedUniverseIds(selected.map(s => typeof s === 'string' ? parseInt(s) : s))
                setSelectedCategoryIds([])
                setSelectedProductIds([])
              }}
              placeholder="All Universes"
            />
          </div>

          {/* Category Filter (Product Hierarchy) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Category
            </label>
            <MultiSelect
              options={filteredCategories.map(c => ({
                value: c.id,
                label: c.display_name || c.name
              }))}
              selectedValues={selectedCategoryIds}
              onChange={(selected) => {
                setSelectedCategoryIds(selected.map(s => typeof s === 'string' ? parseInt(s) : s))
                setSelectedProductIds([])
              }}
              placeholder="All Categories"
              disabled={selectedUniverseIds.length === 0}
            />
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product
            </label>
            <MultiSelect
              options={filteredProducts.map(p => ({
                value: p.id,
                label: p.display_name || p.name
              }))}
              selectedValues={selectedProductIds}
              onChange={(selected) => setSelectedProductIds(selected.map(s => typeof s === 'string' ? parseInt(s) : s))}
              placeholder="All Products"
              disabled={selectedUniverseIds.length === 0}
            />
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing {filteredUpdates.length} of {updates.length} marketing update{updates.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Grid of Marketing Update Cards */}
      {filteredUpdates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-500">No marketing updates yet.</p>
          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 btn-ovh-primary"
            >
              Create First Update
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUpdates.map((update) => (
            <div
              key={update.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadgeColor(update.priority)}`}>
                      {update.priority || 'informational'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                      {getCategoryLabel(update.category)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {update.title}
                  </h3>
                  {update.subcategory && (
                    <p className="text-xs text-slate-500 mb-2">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {update.subcategory}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mb-2">
                    {getHierarchyPath(update)}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleEdit(update)}
                      className="p-1 text-slate-400 hover:text-primary-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(update.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Short Description */}
              {update.short_description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {update.short_description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(update.published_at || update.created_at)}</span>
                  </div>
                  {update.created_by_name && (
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{update.created_by_name}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleView(update)}
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {selectedUpdate && (
        <Modal
          isOpen={!!selectedUpdate}
          onClose={() => setSelectedUpdate(null)}
          title={selectedUpdate.title}
          size="lg"
        >
          <div className="space-y-4">
            {/* Category and Priority */}
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadgeColor(selectedUpdate.priority)}`}>
                {selectedUpdate.priority || 'informational'}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                {getCategoryLabel(selectedUpdate.category)}
              </span>
              {selectedUpdate.subcategory && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                  <Tag className="w-3 h-3 inline mr-1" />
                  {selectedUpdate.subcategory}
                </span>
              )}
            </div>

            {/* Hierarchy Path */}
            <div className="text-sm text-slate-600">
              {getHierarchyPath(selectedUpdate)}
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-sm text-slate-500 pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(selectedUpdate.published_at || selectedUpdate.created_at)}</span>
              </div>
              {selectedUpdate.created_by_name && (
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{selectedUpdate.created_by_name}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-slate-700"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHTML(selectedUpdate.content)
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <MarketingUpdateForm
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            setEditingUpdate(null)
          }}
          update={editingUpdate || undefined}
          categoriesInfo={categoriesInfo}
          universes={universes}
          categories={categories}
          products={allProducts}
        />
      )}
    </div>
  )
}

interface MarketingUpdateFormProps {
  isOpen: boolean
  onClose: () => void
  update?: MarketingUpdate
  categoriesInfo: CategoriesResponse
  universes: Universe[]
  categories: Category[]
  products: Product[]
}

function MarketingUpdateForm({
  isOpen,
  onClose,
  update,
  categoriesInfo,
  universes,
  categories,
  products: allProducts
}: MarketingUpdateFormProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  
  // Helper function to format datetime-local value
  const formatDateTimeLocal = (dateString?: string): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }
  
  const [formData, setFormData] = useState({
    title: update?.title || '',
    short_description: update?.short_description || '',
    content: update?.content || '',
    category: update?.category || '',
    subcategory: update?.subcategory || '',
    universe_id: update?.universe_id || undefined,
    category_id: update?.category_id || undefined,
    product_id: update?.product_id || undefined,
    priority: update?.priority || 'informational',
    target_audience: update?.target_audience || '',
    published_at: formatDateTimeLocal(update?.published_at),
    expires_at: formatDateTimeLocal(update?.expires_at),
    send_notification: false
  })

  // Get subcategories for selected category
  const availableSubcategories = formData.category && categoriesInfo[formData.category]
    ? categoriesInfo[formData.category].subcategories || []
    : []

  // Fetch products dynamically based on universe/category selection
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products', 'list', formData.universe_id, formData.category_id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (formData.universe_id) params.append('universe_id', formData.universe_id.toString())
      if (formData.category_id) params.append('category_id', formData.category_id.toString())
      const response = await api.get(`/products/?${params.toString()}`)
      return response.data
    },
    enabled: !!formData.universe_id,
  })

  const filteredCategories = formData.universe_id
    ? categories.filter(cat => cat.universe_id === formData.universe_id)
    : []

  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/marketing-updates', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-updates'] })
      setError(null)
      onClose()
    },
    onError: (err: any) => {
      console.error('Error creating marketing update:', err)
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to create marketing update'
      setError(errorMessage)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await api.put(`/marketing-updates/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-updates'] })
      setError(null)
      onClose()
    },
    onError: (err: any) => {
      console.error('Error updating marketing update:', err)
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to update marketing update'
      setError(errorMessage)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) // Clear any previous errors
    
    // Prepare data
    const submitData: any = {
      title: formData.title,
      short_description: formData.short_description || null,
      content: formData.content,
      category: formData.category,
      subcategory: formData.subcategory || null,
      priority: formData.priority,
      target_audience: formData.target_audience || null,
      universe_id: formData.universe_id || null,
      category_id: formData.category_id || null,
      product_id: formData.product_id || null,
    }

    // Handle published_at
    if (formData.published_at) {
      const date = new Date(formData.published_at)
      if (!isNaN(date.getTime())) {
        submitData.published_at = date.toISOString()
      }
    }

    // Handle expires_at
    if (formData.expires_at) {
      const date = new Date(formData.expires_at)
      if (!isNaN(date.getTime())) {
        submitData.expires_at = date.toISOString()
      }
    }

    // Populate names if IDs are provided
    if (formData.universe_id) {
      const universe = universes.find(u => u.id === formData.universe_id)
      if (universe) submitData.universe_name = universe.display_name || universe.name
    }
    if (formData.category_id) {
      const category = categories.find(c => c.id === formData.category_id)
      if (category) submitData.category_name = category.display_name || category.name
    }
    if (formData.product_id) {
      const product = products.find(p => p.id === formData.product_id)
      if (product) submitData.product_name = product.display_name || product.name
    }

    // Only include send_notification if user is PMM/Director and creating (not updating)
    if (!update && (isDirector || isPMM) && formData.send_notification !== undefined) {
      submitData.send_notification = formData.send_notification
    }

    if (update) {
      updateMutation.mutate({ id: update.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleDateTimeChange = (field: 'published_at' | 'expires_at', value: string) => {
    // Ensure format is YYYY-MM-DDTHH:mm or empty
    if (!value) {
      setFormData({ ...formData, [field]: '' })
      return
    }
    
    // If only date part is provided, add default time
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormData({ ...formData, [field]: `${value}T00:00` })
    } else if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      setFormData({ ...formData, [field]: value })
    } else {
      // Invalid format, clear it
      setFormData({ ...formData, [field]: '' })
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={update ? 'Edit Marketing Update' : 'Create Marketing Update'}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter update title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Short Description
            </label>
            <textarea
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Brief description for card display"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    category: e.target.value,
                    subcategory: '' // Reset subcategory when category changes
                  })
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Category</option>
                {Object.keys(categoriesInfo).map(key => (
                  <option key={key} value={key}>
                    {categoriesInfo[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subcategory
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!formData.category || availableSubcategories.length === 0}
              >
                <option value="">Select Subcategory (Optional)</option>
                {availableSubcategories.map(sub => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="informational">Informational</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., all_sales, specific_role"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content * (HTML supported)
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder="Enter HTML content for the marketing update. You can use HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, etc."
            />
            <p className="mt-1 text-xs text-slate-500">
              HTML tags are supported. Use &lt;p&gt; for paragraphs, &lt;strong&gt; for bold, &lt;ul&gt; and &lt;li&gt; for lists, &lt;a href=&quot;...&quot;&gt; for links, etc.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Universe
              </label>
              <select
                value={formData.universe_id || ''}
                onChange={(e) => {
                  const universeId = e.target.value ? parseInt(e.target.value) : undefined
                  setFormData({ 
                    ...formData, 
                    universe_id: universeId,
                    category_id: undefined,
                    product_id: undefined
                  })
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All</option>
                {universes.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Category
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => {
                  const categoryId = e.target.value ? parseInt(e.target.value) : undefined
                  setFormData({ 
                    ...formData, 
                    category_id: categoryId,
                    product_id: undefined
                  })
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={!formData.universe_id}
              >
                <option value="">All</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product
              </label>
              <select
                value={formData.product_id || ''}
                onChange={(e) => {
                  const productId = e.target.value ? parseInt(e.target.value) : undefined
                  setFormData({ ...formData, product_id: productId })
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={productsLoading}
              >
                <option value="">All</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Published At (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.published_at}
                onChange={(e) => handleDateTimeChange('published_at', e.target.value)}
                onBlur={(e) => {
                  if (e.target.value && !e.target.value.includes('T')) {
                    handleDateTimeChange('published_at', `${e.target.value}T00:00`)
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty to publish immediately
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => handleDateTimeChange('expires_at', e.target.value)}
                onBlur={(e) => {
                  if (e.target.value && !e.target.value.includes('T')) {
                    handleDateTimeChange('expires_at', `${e.target.value}T00:00`)
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional expiration date
              </p>
            </div>
          </div>

          {/* Send Notification (only for PMM/Director, only on create) */}
          {!update && (isDirector || isPMM) && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="send_notification"
                checked={formData.send_notification}
                onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
              />
              <label htmlFor="send_notification" className="ml-2 text-sm text-slate-700">
                Send notification to all users about this update
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-ovh-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : update ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
