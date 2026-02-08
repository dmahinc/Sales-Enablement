import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import ProductHierarchySelector from './ProductHierarchySelector'
import { useAuth } from '../contexts/AuthContext'
import { FolderPlus, Plus, X } from 'lucide-react'

interface MaterialFormProps {
  material?: any
  onClose: () => void
}

export default function MaterialForm({ material, onClose }: MaterialFormProps) {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  const canEditFreshness = isDirector || isPMM

  // Helper function to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    name: '',
    material_type: 'product_brief',
    other_type_description: '',
    audience: 'internal',
    freshness_date: '',
    universe_id: null as number | null,
    category_id: null as number | null,
    product_id: null as number | null,
    product_name: '',
    universe_name: '',
    status: 'draft',
    description: '',
    tags: '',
    keywords: '',
    use_cases: '',
    pain_points: '',
  })
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  })
  const [categoryErrors, setCategoryErrors] = useState<{ [key: string]: string }>({})
  const [showProductForm, setShowProductForm] = useState(false)
  const [productFormData, setProductFormData] = useState({
    name: '',
    display_name: '',
    short_description: '',
    phase: '',
    website_url: '',
    documentation_url: '',
  })
  const [productErrors, setProductErrors] = useState<{ [key: string]: string }>({})

  // Fetch product details when editing
  const { data: productData } = useQuery({
    queryKey: ['product', formData.product_id],
    queryFn: () => api.get(`/products/${formData.product_id}`).then(res => res.data),
    enabled: !!formData.product_id,
  })

  // Fetch universe/category/product IDs from names when editing existing material
  useEffect(() => {
    if (material) {
      // Prefill all material fields
      setFormData(prev => ({
        ...prev,
        name: material.name || '',
        material_type: material.material_type || 'product_brief',
        other_type_description: material.other_type_description || '',
        audience: material.audience || 'internal',
        freshness_date: formatDateForInput(material.last_updated),
        status: material.status || 'draft',
        description: material.description || '',
        tags: Array.isArray(material.tags) ? material.tags.join(', ') : (material.tags || ''),
        keywords: Array.isArray(material.keywords) ? material.keywords.join(', ') : (material.keywords || ''),
        use_cases: Array.isArray(material.use_cases) ? material.use_cases.join(', ') : (material.use_cases || ''),
        pain_points: Array.isArray(material.pain_points) ? material.pain_points.join(', ') : (material.pain_points || ''),
        product_name: material.product_name || '',
        universe_name: material.universe_name || '',
      }))

      // Look up universe/category/product IDs if universe_name exists
      if (material.universe_name) {
        // Look up universe ID from name
        api.get('/products/universes').then(res => {
          const universe = res.data.find((u: any) => u.name === material.universe_name || u.display_name === material.universe_name)
          if (universe) {
            // Set universe_id first, then wait a bit for ProductHierarchySelector to start loading categories
            setFormData(prev => ({ ...prev, universe_id: universe.id }))
            
            // Look up product if product_name exists
            if (material.product_name) {
              // Use Promise.all to fetch both categories and products
              Promise.all([
                api.get(`/products/categories?universe_id=${universe.id}`),
                api.get(`/products/?universe_id=${universe.id}&search=${encodeURIComponent(material.product_name)}`)
              ]).then(([categoriesRes, productsRes]) => {
                // Try to find product by name or display_name
                const product = productsRes.data.find((p: any) => 
                  p.name === material.product_name || 
                  p.display_name === material.product_name ||
                  p.name.toLowerCase().includes(material.product_name.toLowerCase()) ||
                  p.display_name.toLowerCase().includes(material.product_name.toLowerCase())
                )
                if (product) {
                  // Verify category exists in the loaded categories
                  const category = categoriesRes.data.find((c: any) => c.id === product.category_id)
                  if (category) {
                    // Set both category_id and product_id together after a small delay to ensure ProductHierarchySelector has processed universe_id
                    setTimeout(() => {
                      setFormData(prev => ({
                        ...prev,
                        category_id: product.category_id,
                        product_id: product.id,
                        product_name: product.display_name || product.name,
                        universe_name: universe.name
                      }))
                    }, 100)
                  }
                }
              }).catch(() => {
                // If search fails, try without search parameter
                Promise.all([
                  api.get(`/products/categories?universe_id=${universe.id}`),
                  api.get(`/products/?universe_id=${universe.id}`)
                ]).then(([categoriesRes, productsRes]) => {
                  const product = productsRes.data.find((p: any) => 
                    p.name === material.product_name || 
                    p.display_name === material.product_name
                  )
                  if (product) {
                    const category = categoriesRes.data.find((c: any) => c.id === product.category_id)
                    if (category) {
                      setTimeout(() => {
                        setFormData(prev => ({
                          ...prev,
                          category_id: product.category_id,
                          product_id: product.id,
                          product_name: product.display_name || product.name,
                          universe_name: universe.name
                        }))
                      }, 100)
                    }
                  }
                })
              })
            }
          }
        }).catch(err => {
          console.error('Failed to load universes:', err)
        })
      } else {
        // Reset form if material has no universe
        setFormData(prev => ({
          ...prev,
          universe_id: null,
          category_id: null,
          product_id: null,
        }))
      }
    } else {
      // Reset form when material is cleared
      setFormData(prev => ({
        ...prev,
        universe_id: null,
        category_id: null,
        product_id: null,
        product_name: '',
        universe_name: '',
      }))
    }
  }, [material])

  const queryClient = useQueryClient()

  // Fetch categories for refetch after creation
  const { refetch: refetchCategories } = useQuery({
    queryKey: ['products', 'categories', formData.universe_id],
    queryFn: () => api.get(`/products/categories?universe_id=${formData.universe_id}`).then(res => res.data),
    enabled: !!formData.universe_id && isDirector,
  })

  // Fetch products for refetch after creation
  const { refetch: refetchProducts } = useQuery({
    queryKey: ['products', 'list', formData.universe_id, formData.category_id],
    queryFn: () => {
      const params = new URLSearchParams()
      if (formData.universe_id) params.append('universe_id', formData.universe_id.toString())
      if (formData.category_id) params.append('category_id', formData.category_id.toString())
      return api.get(`/products/?${params.toString()}`).then(res => res.data)
    },
    enabled: !!formData.universe_id && isDirector,
  })

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => api.post('/products/categories', data).then(res => res.data),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'categories', formData.universe_id] })
      setFormData(prev => ({ ...prev, category_id: newCategory.id }))
      setCategoryFormData({ name: '', display_name: '', description: '' })
      setCategoryErrors({})
      setShowCategoryForm(false)
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

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data).then(res => res.data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setFormData(prev => ({
        ...prev,
        product_id: newProduct.id,
        product_name: newProduct.display_name || newProduct.name,
        universe_name: newProduct.universe_name
      }))
      setProductFormData({
        name: '',
        display_name: '',
        short_description: '',
        phase: '',
        website_url: '',
        documentation_url: '',
      })
      setProductErrors({})
      setShowProductForm(false)
      refetchProducts()
    },
    onError: (error: any) => {
      if (error.response?.data?.detail) {
        setProductErrors({ submit: error.response.data.detail })
      } else {
        setProductErrors({ submit: 'Failed to create product. Please try again.' })
      }
    },
  })

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCategoryErrors({})

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

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setProductErrors({})

    const newErrors: { [key: string]: string } = {}
    if (!productFormData.name.trim()) {
      newErrors.name = 'Product name is required'
    }
    if (!productFormData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }
    if (!formData.universe_id) {
      newErrors.submit = 'Please select a universe first'
    }

    if (Object.keys(newErrors).length > 0) {
      setProductErrors(newErrors)
      return
    }

    const submitData: any = {
      name: productFormData.name.trim(),
      display_name: productFormData.display_name.trim(),
      universe_id: formData.universe_id!,
    }

    if (formData.category_id) {
      submitData.category_id = formData.category_id
    }
    if (productFormData.short_description.trim()) {
      submitData.short_description = productFormData.short_description.trim()
    }
    if (productFormData.phase.trim()) {
      submitData.phase = productFormData.phase.trim()
    }
    if (productFormData.website_url.trim()) {
      submitData.website_url = productFormData.website_url.trim()
    }
    if (productFormData.documentation_url.trim()) {
      submitData.documentation_url = productFormData.documentation_url.trim()
    }

    createProductMutation.mutate(submitData)
  }

  // Update product_name and universe_name when IDs change
  useEffect(() => {
    if (productData) {
      setFormData(prev => ({
        ...prev,
        product_name: productData.display_name || productData.name,
        universe_name: productData.universe_name,
      }))
    }
  }, [productData])

  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [existingMaterial, setExistingMaterial] = useState<any>(null)
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null)

  const checkDuplicateMutation = useMutation({
    mutationFn: async (data: any) => {
      const product = await api.get(`/products/${data.product_id}`).then(res => res.data)
      const productName = product.display_name || product.name
      return api.get(`/materials/check-duplicate?product_name=${encodeURIComponent(productName)}&material_type=${encodeURIComponent(data.material_type)}`).then(res => res.data)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Create error:', error)
      // Handle 409 conflict (duplicate)
      if (error.response?.status === 409) {
        const detail = error.response?.data?.detail
        if (detail && typeof detail === 'object' && detail.existing_material) {
          setExistingMaterial(detail.existing_material)
          setShowReplaceDialog(true)
          return
        }
      }
      const errorMessage = error.response?.data?.detail?.message || error.response?.data?.detail || error.message || 'Failed to create material'
      alert(`Create failed: ${errorMessage}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/materials/${material.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      // Also invalidate health dashboard cache to reflect freshness changes
      queryClient.invalidateQueries({ queryKey: ['health-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update material'
      alert(`Update failed: ${errorMessage}`)
    },
  })

  const handleReplaceConfirm = () => {
    if (pendingSubmitData) {
      createMutation.mutate({ ...pendingSubmitData, replace_existing: true })
    }
    setShowReplaceDialog(false)
    setExistingMaterial(null)
    setPendingSubmitData(null)
  }

  const handleReplaceCancel = () => {
    setShowReplaceDialog(false)
    setExistingMaterial(null)
    setPendingSubmitData(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.universe_id) {
      alert('Please select Universe')
      return
    }
    if (!formData.category_id) {
      alert('Please select Category')
      return
    }
    if (!formData.product_id) {
      alert('Please select Product')
      return
    }
    
    const submitData: any = {
      name: formData.name,
      material_type: formData.material_type,
      audience: formData.audience,
      universe_id: formData.universe_id,
      category_id: formData.category_id,
      product_id: formData.product_id,
      product_name: formData.product_name,
      universe_name: formData.universe_name,
      status: formData.status,
      description: formData.description,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
      use_cases: formData.use_cases ? formData.use_cases.split(',').map(uc => uc.trim()).filter(uc => uc) : [],
      pain_points: formData.pain_points ? formData.pain_points.split(',').map(pp => pp.trim()).filter(pp => pp) : [],
    }
    
    if (formData.material_type === 'other' && formData.other_type_description) {
      submitData.other_type_description = formData.other_type_description
    }
    
    // Include freshness_date only when editing and user has permission
    if (material && canEditFreshness && formData.freshness_date) {
      submitData.freshness_date = formData.freshness_date
    }
    
    if (material) {
      updateMutation.mutate(submitData)
    } else {
      // Check for duplicates first (skip for 'other' type)
      if (formData.material_type !== 'other') {
        try {
          const duplicateCheck = await checkDuplicateMutation.mutateAsync(submitData)
          if (duplicateCheck.exists) {
            setExistingMaterial(duplicateCheck.material)
            setPendingSubmitData(submitData)
            setShowReplaceDialog(true)
            return
          }
        } catch (error) {
          // If check fails, proceed with creation
          console.error('Duplicate check failed:', error)
        }
      }
      createMutation.mutate(submitData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-ovh"
          placeholder="Enter material name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Material Type *</label>
          <select
            required
            value={formData.material_type}
            onChange={(e) => {
              const newMaterialType = e.target.value
              // Auto-set audience based on material type
              let newAudience = formData.audience
              if (newMaterialType === 'product_brief' || newMaterialType === 'sales_enablement_deck') {
                newAudience = 'internal'
              } else if (newMaterialType === 'datasheet' || newMaterialType === 'sales_deck') {
                newAudience = 'customer_facing'
              }
              setFormData({ 
                ...formData, 
                material_type: newMaterialType, 
                audience: newAudience,
                other_type_description: newMaterialType === 'other' ? formData.other_type_description : '' 
              })
            }}
            className="input-ovh"
          >
            <option value="product_brief">Product Brief</option>
            <option value="sales_enablement_deck">Sales Enablement Deck</option>
            <option value="sales_deck">Sales Deck</option>
            <option value="datasheet">Datasheet</option>
            <option value="other">Other</option>
          </select>
          {formData.material_type === 'other' && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Describe the material type *
              </label>
              <input
                type="text"
                required={formData.material_type === 'other'}
                value={formData.other_type_description}
                onChange={(e) => setFormData({ ...formData, other_type_description: e.target.value })}
                placeholder="e.g., Case Study, Whitepaper, Video"
                className="input-ovh text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Audience *</label>
          <select
            required
            value={formData.audience}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            disabled={formData.material_type !== 'other'}
            className={`input-ovh ${formData.material_type !== 'other' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          >
            <option value="internal">Internal</option>
            <option value="customer_facing">Customer Facing</option>
          </select>
          {formData.material_type !== 'other' && (
            <p className="mt-1 text-xs text-slate-500">
              Automatically set based on material type
            </p>
          )}
        </div>
      </div>

      {/* Product Hierarchy Selection */}
      <ProductHierarchySelector
        universeId={formData.universe_id}
        categoryId={formData.category_id}
        productId={formData.product_id}
        onUniverseChange={(id) => {
          setFormData(prev => ({
            ...prev,
            universe_id: id,
            category_id: null,
            product_id: null,
            product_name: '',
            universe_name: ''
          }))
          setShowCategoryForm(false)
          setCategoryFormData({ name: '', display_name: '', description: '' })
          setCategoryErrors({})
          setShowProductForm(false)
          setProductFormData({
            name: '',
            display_name: '',
            short_description: '',
            phase: '',
            website_url: '',
            documentation_url: '',
          })
          setProductErrors({})
          // Fetch universe name
          if (id) {
            api.get(`/products/universes/${id}`).then(res => {
              setFormData(prev => ({ ...prev, universe_name: res.data.name }))
            })
          }
        }}
        onCategoryChange={(id) => {
          setFormData(prev => ({
            ...prev,
            category_id: id,
            product_id: null,
            product_name: ''
          }))
          setShowProductForm(false)
          setProductFormData({
            name: '',
            display_name: '',
            short_description: '',
            phase: '',
            website_url: '',
            documentation_url: '',
          })
          setProductErrors({})
        }}
        onProductChange={(id) => {
          setFormData(prev => ({ ...prev, product_id: id }))
          // Fetch product details to get name
          if (id) {
            api.get(`/products/${id}`).then(res => {
              setFormData(prev => ({
                ...prev,
                product_name: res.data.display_name || res.data.name,
                universe_name: res.data.universe_name
              }))
            })
          }
        }}
        required={true}
        categoryLabelAction={
          isDirector && formData.universe_id && !showCategoryForm ? (
            <button
              type="button"
              onClick={() => setShowCategoryForm(true)}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <FolderPlus className="h-3 w-3" />
              Create New
            </button>
          ) : null
        }
        productLabelAction={
          isDirector && formData.universe_id && !showProductForm ? (
            <button
              type="button"
              onClick={() => setShowProductForm(true)}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Create New
            </button>
          ) : null
        }
        renderBetweenUniverseAndCategory={
          isDirector && formData.universe_id ? (
            <>
              {showCategoryForm && (
                <div className="border border-primary-200 rounded-lg p-4 bg-primary-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary-700">Create New Category</h4>
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
                          <FolderPlus className="h-3 w-3" />
                          Create Category
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {showProductForm && (
                <div className="border border-primary-200 rounded-lg p-4 bg-primary-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary-700">Create New Product</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false)
                        setProductFormData({
                          name: '',
                          display_name: '',
                          short_description: '',
                          phase: '',
                          website_url: '',
                          documentation_url: '',
                        })
                        setProductErrors({})
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {productErrors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                      {productErrors.submit}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="e.g., ai-deploy"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        productErrors.name ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {productErrors.name && <p className="mt-1 text-xs text-red-600">{productErrors.name}</p>}
                    <p className="mt-1 text-xs text-slate-500">Unique identifier (lowercase, hyphens)</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={productFormData.display_name}
                      onChange={(e) => setProductFormData({ ...productFormData, display_name: e.target.value })}
                      placeholder="e.g., AI Deploy"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        productErrors.display_name ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {productErrors.display_name && <p className="mt-1 text-xs text-red-600">{productErrors.display_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Short Description <span className="text-slate-400 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      value={productFormData.short_description}
                      onChange={(e) => setProductFormData({ ...productFormData, short_description: e.target.value })}
                      placeholder="Brief description"
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phase <span className="text-slate-400 text-xs">(Optional)</span>
                    </label>
                    <select
                      value={productFormData.phase}
                      onChange={(e) => setProductFormData({ ...productFormData, phase: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select phase</option>
                      <option value="general_avail">General Availability</option>
                      <option value="beta">Beta</option>
                      <option value="research_dev">Research & Development</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false)
                        setProductFormData({
                          name: '',
                          display_name: '',
                          short_description: '',
                          phase: '',
                          website_url: '',
                          documentation_url: '',
                        })
                        setProductErrors({})
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProduct}
                      disabled={createProductMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-1"
                    >
                      {createProductMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Create Product
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="input-ovh"
          >
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {material && canEditFreshness && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Freshness Date</label>
            <input
              type="date"
              value={formData.freshness_date}
              onChange={(e) => setFormData({ ...formData, freshness_date: e.target.value })}
              className="input-ovh"
            />
            <p className="mt-1 text-xs text-slate-500">
              Date when the material was created or last updated
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-ovh"
          placeholder="Brief description of the material"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="cloud, compute, storage"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Keywords</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            placeholder="scalability, performance"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Use Cases</label>
          <input
            type="text"
            value={formData.use_cases}
            onChange={(e) => setFormData({ ...formData, use_cases: e.target.value })}
            placeholder="disaster recovery, backup"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Pain Points</label>
          <input
            type="text"
            value={formData.pain_points}
            onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
            placeholder="cost optimization, vendor lock-in"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="btn-ovh-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-ovh-primary disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : material ? 'Update' : 'Create'}
        </button>
      </div>

      {/* Replace Confirmation Dialog */}
      {showReplaceDialog && existingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Replace Existing Material?</h3>
            <p className="text-sm text-slate-600 mb-4">
              A <strong>{formData.material_type}</strong> already exists for this product:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-slate-900">{existingMaterial.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                Created: {existingMaterial.created_at ? new Date(existingMaterial.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              If you proceed, the existing material will be archived and replaced with the new one.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReplaceCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplaceConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
