import { useState, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Upload, X, FileText, CheckCircle, FolderPlus, Plus } from 'lucide-react'
import ProductHierarchySelector from './ProductHierarchySelector'
import { useAuth } from '../contexts/AuthContext'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FileUploadModal({ isOpen, onClose }: FileUploadModalProps) {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  
  const [file, setFile] = useState<File | null>(null)
  // Initialize freshness_date to today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  const [formData, setFormData] = useState({
    material_type: 'product_brief',
    other_type_description: '',
    audience: 'internal',
    freshness_date: getTodayDate(),
    universe_id: null as number | null,
    category_id: null as number | null,
    product_id: null as number | null,
    product_name: '',
    universe_name: '',
  })
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
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

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data).then(res => res.data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      // Select the newly created product
      setFormData(prev => ({
        ...prev,
        product_id: newProduct.id,
        product_name: newProduct.display_name || newProduct.name,
        universe_name: newProduct.universe_name
      }))
      // Reset and hide product form
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
      // Refetch products to update the list
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

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setProductErrors({})

    // Validation
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

    // Create product
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

  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [existingMaterial, setExistingMaterial] = useState<any>(null)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [isReplacing, setIsReplacing] = useState(false)
  // Use refs to track state in async callbacks
  const isReplacingRef = useRef(false)
  const showReplaceDialogRef = useRef(false)

  const checkDuplicateMutation = useMutation({
    mutationFn: async (data: { product_name: string, material_type: string }) => {
      return api.get(`/materials/check-duplicate?product_name=${encodeURIComponent(data.product_name)}&material_type=${encodeURIComponent(data.material_type)}`).then(res => res.data)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const response = await api.post('/materials/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      // Reset all states
      setIsReplacing(false)
      isReplacingRef.current = false
      setUploading(false)
      setShowReplaceDialog(false)
      showReplaceDialogRef.current = false
      setExistingMaterial(null)
      setPendingFormData(null)
      // Close the entire modal
      handleClose()
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      console.error('isReplacing state:', isReplacing)
      console.error('isReplacingRef.current:', isReplacingRef.current)
      console.error('showReplaceDialog state:', showReplaceDialog)
      console.error('showReplaceDialogRef.current:', showReplaceDialogRef.current)
      console.error('Error response:', error.response?.data)
      
      // Handle 409 conflict (duplicate)
      if (error.response?.status === 409) {
        // Check if we're currently showing the replace dialog - use refs for accurate state
        const currentlyReplacing = isReplacingRef.current || showReplaceDialogRef.current
        console.error('currentlyReplacing (from refs):', currentlyReplacing)
        if (currentlyReplacing) {
          // We're replacing but backend still returned 409 - backend didn't process replace_existing
          const errorMessage = error.response?.data?.detail?.message || error.response?.data?.detail || 'Failed to replace material. The backend may not have received the replace_existing flag.'
          alert(`Replace failed: ${errorMessage}`)
          setIsReplacing(false)
          isReplacingRef.current = false
          setUploading(false)
          // Keep dialog open so user can try again or cancel
          // DON'T close showReplaceDialog here
          setShowReplaceDialog(true)
          showReplaceDialogRef.current = true
          return
        }
        // Not replacing - show replace dialog
        const detail = error.response?.data?.detail
        if (detail && typeof detail === 'object' && detail.existing_material) {
          setExistingMaterial(detail.existing_material)
          setUploading(false)
          setIsReplacing(false)
          isReplacingRef.current = false
          // Rebuild FormData from current form state since duplicate check might have failed
          const formDataToStore = new FormData()
          if (file) {
            formDataToStore.append('file', file)
            formDataToStore.append('material_type', formData.material_type)
            if (formData.material_type === 'other' && formData.other_type_description) {
              formDataToStore.append('other_type_description', formData.other_type_description)
            }
            formDataToStore.append('audience', formData.audience)
            formDataToStore.append('freshness_date', formData.freshness_date)
            formDataToStore.append('universe_id', formData.universe_id!.toString())
            formDataToStore.append('category_id', formData.category_id!.toString())
            formDataToStore.append('product_id', formData.product_id!.toString())
            if (formData.product_name) {
              formDataToStore.append('product_name', formData.product_name)
            }
            if (formData.universe_name) {
              formDataToStore.append('universe_name', formData.universe_name)
            }
            setPendingFormData(formDataToStore)
          }
          setShowReplaceDialog(true)
          showReplaceDialogRef.current = true
          return
        }
      }
      // For any other error, show error
      const errorMessage = error.response?.data?.detail?.message || error.response?.data?.detail || error.message || 'Failed to upload file'
      alert(`Upload failed: ${errorMessage}`)
      setIsReplacing(false)
      isReplacingRef.current = false
      setUploading(false)
      // Only close replace dialog if we're not in replace mode
      if (!isReplacingRef.current && !showReplaceDialogRef.current) {
        setShowReplaceDialog(false)
        showReplaceDialogRef.current = false
        setExistingMaterial(null)
        setPendingFormData(null)
      }
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      alert('Please select a file')
      return
    }
    
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
    
    // Validate other_type_description if material_type is "other"
    if (formData.material_type === 'other' && !formData.other_type_description?.trim()) {
      alert('Please describe the material type when selecting "Other"')
      return
    }
    
    const formDataToSend = new FormData()
    formDataToSend.append('file', file)
    formDataToSend.append('material_type', formData.material_type)
    if (formData.material_type === 'other' && formData.other_type_description) {
      formDataToSend.append('other_type_description', formData.other_type_description)
    }
    formDataToSend.append('audience', formData.audience)
    formDataToSend.append('freshness_date', formData.freshness_date)
    formDataToSend.append('universe_id', formData.universe_id.toString())
    formDataToSend.append('category_id', formData.category_id.toString())
    formDataToSend.append('product_id', formData.product_id.toString())
    if (formData.product_name) {
      formDataToSend.append('product_name', formData.product_name)
    }
    if (formData.universe_name) {
      formDataToSend.append('universe_name', formData.universe_name)
    }

    // Check for duplicates first (skip for 'other' type)
    if (formData.material_type !== 'other') {
      try {
        // Ensure uploading is false before checking
        setUploading(false)
        const product = await api.get(`/products/${formData.product_id}`).then(res => res.data)
        const productName = product.display_name || product.name
        const duplicateCheck = await checkDuplicateMutation.mutateAsync({ 
          product_name: productName, 
          material_type: formData.material_type 
        })
        if (duplicateCheck.exists) {
          // Explicitly ensure uploading is false before showing dialog
          setUploading(false)
          setExistingMaterial(duplicateCheck.material)
          setPendingFormData(formDataToSend)
          setShowReplaceDialog(true)
          showReplaceDialogRef.current = true
          isReplacingRef.current = false // Not replacing yet, just showing dialog
          // Don't set uploading=true here - wait for user confirmation
          return
        }
      } catch (error) {
        // If check fails, proceed with upload
        console.error('Duplicate check failed:', error)
        setUploading(false) // Ensure false if check fails
      }
    }
    
    // No duplicate found, proceed with upload
    setUploading(true)
    uploadMutation.mutate(formDataToSend)
  }

  const handleReplaceConfirm = async () => {
    console.log('handleReplaceConfirm called')
    console.log('pendingFormData:', pendingFormData)
    console.log('file:', file)
    
    if (!file) {
      console.log('Missing file, closing dialog')
      setShowReplaceDialog(false)
      showReplaceDialogRef.current = false
      setExistingMaterial(null)
      setPendingFormData(null)
      setIsReplacing(false)
      isReplacingRef.current = false
      setUploading(false)
      return
    }

    console.log('Setting replacing state...')
    // Set replacing state FIRST before starting upload
    setIsReplacing(true)
    isReplacingRef.current = true
    setUploading(true)
    // Keep dialog open - CRITICAL: Set both state and ref
    setShowReplaceDialog(true)
    showReplaceDialogRef.current = true
    
    console.log('After setting state:')
    console.log('isReplacing:', true)
    console.log('isReplacingRef.current:', isReplacingRef.current)
    console.log('showReplaceDialog:', true)
    console.log('showReplaceDialogRef.current:', showReplaceDialogRef.current)
    
    // Don't close dialog yet - wait for upload to complete
    // Rebuild FormData from scratch to ensure file is included correctly
    // Use pendingFormData if available, otherwise rebuild from form state
    const formDataToSend = new FormData()
    
    if (pendingFormData) {
      // Copy from pendingFormData
      for (const [key, value] of pendingFormData.entries()) {
        formDataToSend.append(key, value)
      }
    } else {
      // Rebuild from form state
      formDataToSend.append('file', file)
      formDataToSend.append('material_type', formData.material_type)
      if (formData.material_type === 'other' && formData.other_type_description) {
        formDataToSend.append('other_type_description', formData.other_type_description)
      }
      formDataToSend.append('audience', formData.audience)
      formDataToSend.append('freshness_date', formData.freshness_date)
      formDataToSend.append('universe_id', formData.universe_id!.toString())
      formDataToSend.append('category_id', formData.category_id!.toString())
      formDataToSend.append('product_id', formData.product_id!.toString())
      if (formData.product_name) {
        formDataToSend.append('product_name', formData.product_name)
      }
      if (formData.universe_name) {
        formDataToSend.append('universe_name', formData.universe_name)
      }
    }
    
    // Add replace_existing flag as string 'true' (FastAPI Form() will parse it as boolean)
    formDataToSend.append('replace_existing', 'true')
    
    // Log for debugging
    console.log('Sending replace_existing=true with FormData')
    console.log('FormData entries:', Array.from(formDataToSend.entries()).map(([k, v]) => [k, v instanceof File ? `File: ${v.name}` : v]))
    console.log('isReplacingRef.current:', isReplacingRef.current)
    console.log('showReplaceDialogRef.current:', showReplaceDialogRef.current)
    
    // Start upload - dialog stays open until onSuccess/onError
    uploadMutation.mutate(formDataToSend)
  }

  const handleReplaceCancel = () => {
    setShowReplaceDialog(false)
    showReplaceDialogRef.current = false
    setExistingMaterial(null)
    setPendingFormData(null)
    setIsReplacing(false)
    isReplacingRef.current = false
    setUploading(false)
  }

  const handleClose = () => {
    setFile(null)
    setUploading(false)
    setIsReplacing(false)
    setShowReplaceDialog(false)
    setExistingMaterial(null)
    setPendingFormData(null)
    setFormData({
      material_type: 'product_brief',
      other_type_description: '',
      audience: 'internal',
      freshness_date: getTodayDate(),
      universe_id: null,
      category_id: null,
      product_id: null,
      product_name: '',
      universe_name: '',
    })
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
    setUploading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-primary-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-primary-700">Upload Material</h3>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* File Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : file 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm text-primary-500 hover:text-primary-600"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-full">
                    <Upload className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary-500 font-medium hover:text-primary-600">
                        Click to upload
                      </span>
                      <span className="text-slate-500"> or drag and drop</span>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.pptx,.docx,.ppt,.doc"
                    />
                  </div>
                  <p className="text-xs text-slate-400">PDF, PPTX, DOCX up to 50MB</p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material Type *
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Audience *
                </label>
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

            {/* Freshness Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Freshness Date *
              </label>
              <input
                type="date"
                required
                value={formData.freshness_date}
                onChange={(e) => setFormData({ ...formData, freshness_date: e.target.value })}
                className="input-ovh"
              />
              <p className="mt-1 text-xs text-slate-500">
                Date when the material was created or last updated
              </p>
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

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                className="btn-ovh-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="btn-ovh-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Replace Confirmation Dialog */}
      {(showReplaceDialog || showReplaceDialogRef.current) && existingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          // Prevent closing when clicking backdrop during upload
          if (isReplacing || isReplacingRef.current || uploadMutation.isPending) {
            e.stopPropagation()
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
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
            {(isReplacing || isReplacingRef.current || uploadMutation.isPending) && (
              <div className="mb-4 flex items-center gap-2 text-sm text-primary-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                <span>Uploading and replacing...</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReplaceCancel}
                disabled={isReplacing || isReplacingRef.current || uploadMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplaceConfirm}
                disabled={isReplacing || isReplacingRef.current || uploadMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(isReplacing || isReplacingRef.current || uploadMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Replacing...
                  </>
                ) : (
                  'Replace'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
