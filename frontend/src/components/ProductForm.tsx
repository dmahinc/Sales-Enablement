import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { X, Plus, AlertCircle, FolderPlus } from 'lucide-react'

interface ProductFormProps {
  onClose: () => void
  onSuccess?: () => void
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

export default function ProductForm({ onClose, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    universe_id: null as number | null,
    category_id: null as number | null,
    short_description: '',
    description: '',
    phase: '',
    website_url: '',
    documentation_url: '',
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  })
  const [categoryErrors, setCategoryErrors] = useState<{ [key: string]: string }>({})

  // Fetch universes
  const { data: universes = [] } = useQuery<Universe[]>({
    queryKey: ['products', 'universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  // Fetch categories when universe is selected
  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ['products', 'categories', formData.universe_id],
    queryFn: () => api.get(`/products/categories?universe_id=${formData.universe_id}`).then(res => res.data),
    enabled: !!formData.universe_id,
  })

  const queryClient = useQueryClient()

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => api.post('/products/categories', data).then(res => res.data),
    onSuccess: (newCategory) => {
      // Invalidate categories query
      queryClient.invalidateQueries({ queryKey: ['products', 'categories', formData.universe_id] })
      // Select the newly created category
      setFormData(prev => ({ ...prev, category_id: newCategory.id }))
      // Reset and hide category form
      setCategoryFormData({ name: '', display_name: '', description: '' })
      setCategoryErrors({})
      setShowCategoryForm(false)
      // Refetch categories to update the list
      refetchCategories()
    },
    onError: (error: any) => {
      if (error.response?.data?.detail) {
        setCategoryErrors({ submit: error.response.data.detail })
      } else {
        setCategoryErrors({ submit: 'Failed to create category. Please try again.' })
      }
    },
  })

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCategoryErrors({})

    // Validation
    const newErrors: { [key: string]: string } = {}
    if (!categoryFormData.name.trim()) {
      newErrors.name = 'Category name is required'
    }
    if (!categoryFormData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }
    if (!formData.universe_id) {
      newErrors.submit = 'Please select a universe first'
    }

    if (Object.keys(newErrors).length > 0) {
      setCategoryErrors(newErrors)
      return
    }

    // Create category
    const submitData: any = {
      name: categoryFormData.name.trim(),
      display_name: categoryFormData.display_name.trim(),
      universe_id: formData.universe_id!,
    }

    if (categoryFormData.description.trim()) {
      submitData.description = categoryFormData.description.trim()
    }

    createCategoryMutation.mutate(submitData)
  }

  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['director-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['product-completion-matrix'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'universes'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail })
      } else {
        setErrors({ submit: 'Failed to create product. Please try again.' })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }
    if (!formData.universe_id) {
      newErrors.universe_id = 'Universe is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Prepare data (only send non-empty optional fields)
    const submitData: any = {
      name: formData.name.trim(),
      display_name: formData.display_name.trim(),
      universe_id: formData.universe_id!,
    }

    if (formData.category_id) {
      submitData.category_id = formData.category_id
    }
    if (formData.short_description.trim()) {
      submitData.short_description = formData.short_description.trim()
    }
    if (formData.description.trim()) {
      submitData.description = formData.description.trim()
    }
    if (formData.phase.trim()) {
      submitData.phase = formData.phase.trim()
    }
    if (formData.website_url.trim()) {
      submitData.website_url = formData.website_url.trim()
    }
    if (formData.documentation_url.trim()) {
      submitData.documentation_url = formData.documentation_url.trim()
    }

    createProductMutation.mutate(submitData)
  }

  // Reset category when universe changes
  useEffect(() => {
    if (formData.universe_id) {
      setFormData(prev => ({ ...prev, category_id: null }))
      setShowCategoryForm(false)
      setCategoryFormData({ name: '', display_name: '', description: '' })
      setCategoryErrors({})
    }
  }, [formData.universe_id])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-primary-700">Add New Product</h2>
            <p className="text-sm text-slate-500 mt-1">Add a product to track material completion</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., ai-deploy"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.name ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            <p className="mt-1 text-xs text-slate-500">Unique identifier (lowercase, hyphens)</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., AI Deploy"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.display_name ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {errors.display_name && <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>}
            <p className="mt-1 text-xs text-slate-500">Human-readable product name</p>
          </div>

          {/* Universe */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Universe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.universe_id || ''}
              onChange={(e) => setFormData({ ...formData, universe_id: e.target.value ? parseInt(e.target.value) : null })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.universe_id ? 'border-red-300' : 'border-slate-300'
              }`}
            >
              <option value="">Select a universe</option>
              {universes.map((universe) => (
                <option key={universe.id} value={universe.id}>
                  {universe.display_name}
                </option>
              ))}
            </select>
            {errors.universe_id && <p className="mt-1 text-sm text-red-600">{errors.universe_id}</p>}
          </div>

          {/* Category */}
          {formData.universe_id && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Category <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                {!showCategoryForm && (
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create New Category
                  </button>
                )}
              </div>
              
              {showCategoryForm ? (
                <div className="border border-primary-200 rounded-lg p-4 bg-primary-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary-700">Create New Category</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false)
                        setCategoryFormData({ name: '', display_name: '', description: '' })
                        setCategoryErrors({})
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {categoryErrors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                      {categoryErrors.submit}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder="e.g., ai-machine-learning"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        categoryErrors.name ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {categoryErrors.name && <p className="mt-1 text-xs text-red-600">{categoryErrors.name}</p>}
                    <p className="mt-1 text-xs text-slate-500">Unique identifier (lowercase, hyphens)</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={categoryFormData.display_name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, display_name: e.target.value })}
                      placeholder="e.g., AI & Machine Learning"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        categoryErrors.display_name ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {categoryErrors.display_name && <p className="mt-1 text-xs text-red-600">{categoryErrors.display_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Description <span className="text-slate-400 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      placeholder="Brief description of the category"
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false)
                        setCategoryFormData({ name: '', display_name: '', description: '' })
                        setCategoryErrors({})
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={createCategoryMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-1"
                    >
                      {createCategoryMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Create Category
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Short Description <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              placeholder="Brief description of the product"
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Phase */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phase <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <select
              value={formData.phase}
              onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select phase</option>
              <option value="general_avail">General Availability</option>
              <option value="beta">Beta</option>
              <option value="research_dev">Research & Development</option>
            </select>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Website URL <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Documentation URL <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.documentation_url}
                onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProductMutation.isPending}
              className="btn-ovh-primary flex items-center gap-2"
            >
              {createProductMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
