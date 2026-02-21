import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Eye, Plus, Edit, Trash2, Calendar, User, X, Filter } from 'lucide-react'
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

interface ProductRelease {
  id: number
  title: string
  short_description?: string
  content: string
  universe_id?: number
  category_id?: number
  product_id?: number
  universe_name?: string
  category_name?: string
  product_name?: string
  created_by_id: number
  created_by_name?: string
  created_by_email?: string
  published_at?: string
  created_at: string
  updated_at: string
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

export default function ProductReleases() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRelease, setSelectedRelease] = useState<ProductRelease | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRelease, setEditingRelease] = useState<ProductRelease | null>(null)
  
  // Filter states
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<number[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all') // 'all', '7days', '30days', '90days'

  const isAdmin = user?.role === 'admin' || user?.is_superuser
  const isDirector = user?.role === 'director'
  const isPMM = user?.role === 'pmm'
  const canEdit = isAdmin || isDirector || isPMM

  // Fetch product releases
  const { data: releases = [], isLoading } = useQuery<ProductRelease[]>({
    queryKey: ['product-releases'],
    queryFn: async () => {
      const response = await api.get('/product-releases')
      return response.data
    }
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

  // Fetch products dynamically based on universe/category selection
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const response = await api.get('/products')
      return response.data
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/product-releases/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-releases'] })
    }
  })

  const handleView = (release: ProductRelease) => {
    setSelectedRelease(release)
  }

  const handleEdit = (release: ProductRelease) => {
    setEditingRelease(release)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product release?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getHierarchyPath = (release: ProductRelease) => {
    const parts: string[] = []
    if (release.universe_name) parts.push(release.universe_name)
    if (release.category_name) parts.push(release.category_name)
    if (release.product_name) parts.push(release.product_name)
    return parts.length > 0 ? parts.join(' • ') : 'General'
  }

  // Filter releases based on selected filters
  const filteredReleases = useMemo(() => {
    let filtered = releases

    // Filter by universe
    if (selectedUniverseIds.length > 0) {
      filtered = filtered.filter(release => {
        if (!release.universe_id) return false
        return selectedUniverseIds.includes(release.universe_id)
      })
    }

    // Filter by category
    if (selectedCategoryIds.length > 0) {
      filtered = filtered.filter(release => {
        if (!release.category_id) return false
        return selectedCategoryIds.includes(release.category_id)
      })
    }

    // Filter by product
    if (selectedProductIds.length > 0) {
      filtered = filtered.filter(release => {
        if (!release.product_id) return false
        return selectedProductIds.includes(release.product_id)
      })
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const daysAgo = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      filtered = filtered.filter(release => {
        const releaseDate = release.published_at 
          ? new Date(release.published_at) 
          : new Date(release.created_at)
        return releaseDate >= cutoffDate
      })
    }

    return filtered
  }, [releases, selectedUniverseIds, selectedCategoryIds, selectedProductIds, dateFilter])

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

  const clearAllFilters = () => {
    setSelectedUniverseIds([])
    setSelectedCategoryIds([])
    setSelectedProductIds([])
    setDateFilter('all')
  }

  const hasActiveFilters = selectedUniverseIds.length > 0 || 
    selectedCategoryIds.length > 0 || 
    selectedProductIds.length > 0 || 
    dateFilter !== 'all'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Latest Product Releases</h1>
          <p className="mt-2 text-slate-600">Stay updated with the latest product news and announcements</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-ovh-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Release</span>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                // Reset category and product filters when universe changes
                setSelectedCategoryIds([])
                setSelectedProductIds([])
              }}
              placeholder="All Universes"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <MultiSelect
              options={filteredCategories.map(c => ({
                value: c.id,
                label: c.display_name || c.name
              }))}
              selectedValues={selectedCategoryIds}
              onChange={(selected) => {
                setSelectedCategoryIds(selected.map(s => typeof s === 'string' ? parseInt(s) : s))
                // Reset product filter when category changes
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
              Showing {filteredReleases.length} of {releases.length} product release{releases.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Grid of Product Release Cards */}
      {filteredReleases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-500">No product releases yet.</p>
          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 btn-ovh-primary"
            >
              Create First Release
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReleases.map((release) => (
            <div
              key={release.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {release.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-2">
                    {getHierarchyPath(release)}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleEdit(release)}
                      className="p-1 text-slate-400 hover:text-primary-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(release.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Short Description */}
              {release.short_description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {release.short_description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(release.published_at || release.created_at)}</span>
                  </div>
                  {release.created_by_name && (
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{release.created_by_name}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleView(release)}
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
      {selectedRelease && (
        <Modal
          isOpen={!!selectedRelease}
          onClose={() => setSelectedRelease(null)}
          title={selectedRelease.title}
          size="lg"
        >
          <div className="space-y-4">
            {/* Hierarchy Path */}
            <div className="text-sm text-slate-600">
              {getHierarchyPath(selectedRelease)}
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-sm text-slate-500 pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(selectedRelease.published_at || selectedRelease.created_at)}</span>
              </div>
              {selectedRelease.created_by_name && (
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{selectedRelease.created_by_name}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-slate-700"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHTML(selectedRelease.content)
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <ProductReleaseForm
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            setEditingRelease(null)
          }}
          release={editingRelease || undefined}
          universes={universes}
          categories={categories}
          products={allProducts}
        />
      )}
    </div>
  )
}

interface ProductReleaseFormProps {
  isOpen: boolean
  onClose: () => void
  release?: ProductRelease
  universes: Universe[]
  categories: Category[]
  products: Product[]
}

function ProductReleaseForm({
  isOpen,
  onClose,
  release,
  universes,
  categories,
  products: allProducts
}: ProductReleaseFormProps) {
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
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
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
    title: release?.title || '',
    short_description: release?.short_description || '',
    content: release?.content || '',
    universe_id: release?.universe_id || undefined,
    category_id: release?.category_id || undefined,
    product_id: release?.product_id || undefined,
    published_at: formatDateTimeLocal(release?.published_at),
    send_notification: false
  })

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
    enabled: !!formData.universe_id, // Only fetch when universe is selected
  })

  const filteredCategories = formData.universe_id
    ? categories.filter(cat => cat.universe_id === formData.universe_id)
    : []

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Populate name fields from IDs
      let publishedAt: string | undefined = undefined
      if (data.published_at && data.published_at.trim()) {
        // Ensure datetime-local format is complete (YYYY-MM-DDTHH:mm)
        let dateValue = data.published_at.trim()
        if (dateValue.includes('T')) {
          const [datePart, timePart] = dateValue.split('T')
          if (datePart && (!timePart || timePart === '' || timePart === '--:--')) {
            dateValue = datePart + 'T00:00'
          }
        } else if (dateValue) {
          // If only date without T, add default time
          dateValue = dateValue + 'T00:00'
        }
        
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          publishedAt = date.toISOString()
        }
      }
      
      const payload: any = {
        ...data,
        published_at: publishedAt
      }
      
      if (data.universe_id) {
        const universe = universes.find(u => u.id === data.universe_id)
        if (universe) payload.universe_name = universe.display_name || universe.name
      }
      if (data.category_id) {
        const category = categories.find(c => c.id === data.category_id)
        if (category) payload.category_name = category.display_name || category.name
      }
      if (data.product_id) {
        const product = products.find(p => p.id === data.product_id)
        if (product) payload.product_name = product.display_name || product.name
      }
      
      // Only include send_notification if user is PMM/Director
      if ((isDirector || isPMM) && data.send_notification !== undefined) {
        payload.send_notification = data.send_notification
      }
      
      await api.post('/product-releases', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-releases'] })
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Populate name fields from IDs
      let publishedAt: string | undefined = undefined
      if (data.published_at && data.published_at.trim()) {
        // Ensure datetime-local format is complete (YYYY-MM-DDTHH:mm)
        let dateValue = data.published_at.trim()
        if (dateValue.includes('T')) {
          const [datePart, timePart] = dateValue.split('T')
          if (datePart && (!timePart || timePart === '' || timePart === '--:--')) {
            dateValue = datePart + 'T00:00'
          }
        } else if (dateValue) {
          // If only date without T, add default time
          dateValue = dateValue + 'T00:00'
        }
        
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          publishedAt = date.toISOString()
        }
      }
      
      const payload: any = {
        ...data,
        published_at: publishedAt
      }
      
      if (data.universe_id) {
        const universe = universes.find(u => u.id === data.universe_id)
        if (universe) payload.universe_name = universe.display_name || universe.name
      }
      if (data.category_id) {
        const category = categories.find(c => c.id === data.category_id)
        if (category) payload.category_name = category.display_name || category.name
      }
      if (data.product_id) {
        const product = products.find(p => p.id === data.product_id)
        if (product) payload.product_name = product.display_name || product.name
      }
      
      await api.put(`/product-releases/${release!.id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-releases'] })
      onClose()
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up published_at before submission
    const submitData = { ...formData }
    if (submitData.published_at) {
      let dateValue = submitData.published_at.trim()
      // Remove invalid datetime values
      if (dateValue.includes('--') || !dateValue.includes('T')) {
        // If invalid, clear it (backend will use current time)
        submitData.published_at = ''
      } else {
        // Ensure complete format
        const [datePart, timePart] = dateValue.split('T')
        if (datePart && (!timePart || timePart === '' || timePart.includes('--'))) {
          submitData.published_at = datePart + 'T00:00'
        }
      }
    }
    
    if (release) {
      await updateMutation.mutateAsync(submitData)
    } else {
      await createMutation.mutateAsync(submitData)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={release ? 'Edit Product Release' : 'New Product Release'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Short Description (for card display)
          </label>
          <textarea
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Brief description shown on the card..."
          />
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
            placeholder="Enter HTML content for the product release. You can use HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, etc."
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
                  category_id: undefined, // Reset category when universe changes
                  product_id: undefined // Reset product when universe changes
                })
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Universe</option>
              {universes.map((universe) => (
                <option key={universe.id} value={universe.id}>
                  {universe.display_name || universe.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => {
                const categoryId = e.target.value ? parseInt(e.target.value) : undefined
                setFormData({
                  ...formData,
                  category_id: categoryId,
                  product_id: undefined // Reset product when category changes
                })
              }}
              disabled={!formData.universe_id}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.display_name || category.name}
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
              disabled={!formData.universe_id || productsLoading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Product</option>
              {productsLoading ? (
                <option disabled>Loading products...</option>
              ) : (
                products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.display_name || product.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Published At (optional)
          </label>
          <input
            type="datetime-local"
            value={formData.published_at || ''}
            onChange={(e) => {
              let value = e.target.value
              // Clear if empty or invalid
              if (!value || value.trim() === '') {
                setFormData({ ...formData, published_at: '' })
                return
              }
              
              // Ensure complete datetime format
              if (value.includes('T')) {
                const [datePart, timePart] = value.split('T')
                if (datePart && (!timePart || timePart === '' || timePart.includes('--'))) {
                  // If date is set but time is missing or invalid, set to 00:00
                  value = datePart + 'T00:00'
                }
              } else if (value) {
                // If only date without T, add default time
                value = value + 'T00:00'
              }
              
              setFormData({ ...formData, published_at: value })
            }}
            onBlur={(e) => {
              // Clean up incomplete values on blur
              let value = e.target.value
              if (value && value.includes('T')) {
                const [datePart, timePart] = value.split('T')
                if (datePart && (!timePart || timePart === '' || timePart.includes('--'))) {
                  // If date is set but time is missing or invalid, set to 00:00
                  setFormData({ ...formData, published_at: datePart + 'T00:00' })
                } else if (!datePart || datePart.includes('--')) {
                  // If date is invalid, clear the field
                  setFormData({ ...formData, published_at: '' })
                }
              } else if (value && !value.includes('T')) {
                // If only date without T, add default time
                setFormData({ ...formData, published_at: value + 'T00:00' })
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Leave empty to use current date/time, or select a specific date and time
          </p>
        </div>

        {/* Send Notification (only for PMM/Director, only on create) */}
        {!release && (isDirector || isPMM) && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="send_notification"
              checked={formData.send_notification}
              onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
            />
            <label htmlFor="send_notification" className="ml-2 text-sm text-slate-700">
              Send notification to all users about this release
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
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-ovh-primary"
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : release ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
