import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Upload, X, CheckCircle, AlertCircle, Loader2, Sparkles, Check, FolderPlus, Plus, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ProductHierarchySelector from './ProductHierarchySelector'

interface FileSuggestion {
  filename: string
  universe_id?: number | null
  category_id?: number | null
  product_id?: number | null
  universe_name?: string | null
  category_name?: string | null
  product_name?: string | null
  confidence: number
  reasoning: string
  material_type?: string | null
  audience?: string | null
  other_type_description?: string | null
}

interface BatchUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BatchUploadModal({ isOpen, onClose }: BatchUploadModalProps) {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  
  const [files, setFiles] = useState<File[]>([])
  const [suggestions, setSuggestions] = useState<FileSuggestion[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingProgress, setAnalyzingProgress] = useState({ current: 0, total: 0 })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, { progress: number; status: 'uploading' | 'success' | 'error'; error?: string }>>({})
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(0.9)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<FileSuggestion | null>(null)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Fetch product hierarchy for editing
  const { data: universes = [] } = useQuery({
    queryKey: ['products', 'universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  // Fetch categories for editing and refetch after creation
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['products', 'categories', editFormData?.universe_id],
    queryFn: () => api.get(`/products/categories?universe_id=${editFormData?.universe_id}`).then(res => res.data),
    enabled: !!editFormData?.universe_id,
  })

  // Fetch products for editing and refetch after creation
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products', 'list', editFormData?.universe_id, editFormData?.category_id],
    queryFn: () => {
      const params = new URLSearchParams()
      if (editFormData?.universe_id) params.append('universe_id', editFormData.universe_id.toString())
      if (editFormData?.category_id) params.append('category_id', editFormData.category_id.toString())
      return api.get(`/products/?${params.toString()}`).then(res => res.data)
    },
    enabled: !!editFormData?.universe_id,
  })

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => api.post('/products/categories', data).then(res => res.data),
    onSuccess: async (newCategory) => {
      // Update the query cache directly with the new category
      if (editFormData?.universe_id) {
        const queryKey = ['products', 'categories', editFormData.universe_id]
        queryClient.setQueryData(queryKey, (oldData: any[] = []) => {
          // Check if category already exists in cache
          const exists = oldData.some((c: any) => c.id === newCategory.id)
          if (!exists) {
            return [...oldData, newCategory]
          }
          return oldData
        })
      }
      
      // Invalidate all category queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      
      // Wait for refetch to complete before updating editFormData
      await refetchCategories()
      
      if (editFormData) {
        setEditFormData(prev => prev ? { 
          ...prev, 
          category_id: newCategory.id,
          category_name: newCategory.display_name || newCategory.name
        } : null)
      }
      setCategoryFormData({ name: '', display_name: '', description: '' })
      setCategoryErrors({})
      setShowCategoryForm(false)
      
      // Also refetch products since category changed
      if (editFormData?.universe_id) {
        await refetchProducts()
      }
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
    onSuccess: async (newProduct) => {
      // Update the query cache directly with the new product
      if (editFormData?.universe_id) {
        const queryKey = ['products', 'list', editFormData.universe_id, editFormData.category_id || null]
        queryClient.setQueryData(queryKey, (oldData: any[] = []) => {
          // Check if product already exists in cache
          const exists = oldData.some((p: any) => p.id === newProduct.id)
          if (!exists) {
            return [...oldData, newProduct]
          }
          return oldData
        })
      }
      
      // Invalidate all product queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      
      // Wait for refetch to complete before updating editFormData
      await refetchProducts()
      
      if (editFormData) {
        setEditFormData(prev => prev ? {
          ...prev,
          product_id: newProduct.id,
          product_name: newProduct.display_name || newProduct.name,
          universe_name: newProduct.universe_name || prev.universe_name,
          // Also update category_id if the new product has one
          category_id: newProduct.category_id || prev.category_id,
          category_name: newProduct.category_name || prev.category_name
        } : null)
      }
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

    if (!editFormData?.universe_id) {
      setCategoryErrors({ submit: 'Please select a universe first' })
      return
    }

    const newErrors: { [key: string]: string } = {}
    if (!categoryFormData.name.trim()) {
      newErrors.name = 'Category name is required'
    }
    if (!categoryFormData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setCategoryErrors(newErrors)
      return
    }

    const submitData: any = {
      name: categoryFormData.name.trim(),
      display_name: categoryFormData.display_name.trim(),
      universe_id: editFormData.universe_id,
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

    if (!editFormData?.universe_id) {
      setProductErrors({ submit: 'Please select a universe first' })
      return
    }

    const newErrors: { [key: string]: string } = {}
    if (!productFormData.name.trim()) {
      newErrors.name = 'Product name is required'
    }
    if (!productFormData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setProductErrors(newErrors)
      return
    }

    const submitData: any = {
      name: productFormData.name.trim(),
      display_name: productFormData.display_name.trim(),
      universe_id: editFormData.universe_id,
    }

    if (editFormData.category_id) {
      submitData.category_id = editFormData.category_id
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

  // Check if user has permission
  if (!isDirector && !isPMM) {
    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setSuggestions(prev => prev.filter((_, i) => i !== index))
  }

  const analyzeMutation = useMutation({
    mutationFn: async (filesToAnalyze: File[]) => {
      // Process files sequentially to avoid 413 Payload Too Large errors
      const results: FileSuggestion[] = []
      const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB per file for analysis (more conservative than upload limit)
      
      // Update progress
      setAnalyzingProgress({ current: 0, total: filesToAnalyze.length })
      
      // Always process files individually to avoid 413 errors
      // The batch endpoint may not exist or may have size limits
      for (let i = 0; i < filesToAnalyze.length; i++) {
        const file = filesToAnalyze[i]
        setAnalyzingProgress({ current: i + 1, total: filesToAnalyze.length })
        
        // Check file size before attempting analysis
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB) for analysis`)
          results.push({
            filename: file.name,
            confidence: 0,
            reasoning: `File too large to analyze (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size for analysis is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`,
          })
          continue
        }
        
        try {
          const singleFormData = new FormData()
          singleFormData.append('files', file)
          
          const response = await api.post('/materials/batch/analyze', singleFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 120000, // 2 minutes per file
            // Add maxContentLength and maxBodyLength to handle large files
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          })
          
          // Handle both single result and array of results
          let singleResult: any = null
          if (Array.isArray(response.data)) {
            singleResult = response.data.length > 0 ? response.data[0] : null
          } else {
            singleResult = response.data
          }
          
          if (singleResult && singleResult.filename) {
            results.push(singleResult)
          } else {
            // Add placeholder if no result
            results.push({
              filename: file.name,
              confidence: 0,
              reasoning: 'No analysis result returned',
            })
          }
        } catch (singleError: any) {
          console.error(`Failed to analyze file ${file.name}:`, singleError)
          // Add a placeholder result so the file still appears in the list
          let errorMsg = 'Unknown error'
          if (singleError.response?.status === 413) {
            errorMsg = `File too large to analyze (${(file.size / 1024 / 1024).toFixed(2)}MB). Please try a smaller file.`
          } else if (singleError.response?.status === 404) {
            errorMsg = 'Analysis endpoint not found. The batch analyze feature may not be available.'
          } else {
            errorMsg = singleError.response?.data?.detail || singleError.message || 'Unknown error'
          }
          
          results.push({
            filename: file.name,
            confidence: 0,
            reasoning: `Failed to analyze: ${errorMsg}`,
          })
        }
      }
      
      setAnalyzingProgress({ current: filesToAnalyze.length, total: filesToAnalyze.length })
      
      // Always return results, even if some failed
      // This prevents the onError handler from being called
      return results
    },
    onSuccess: (data) => {
      setSuggestions(data)
      setAnalyzing(false)
      setAnalyzingProgress({ current: 0, total: 0 })
    },
    onError: (error: any) => {
      console.error('Analysis error:', error)
      // Only show error if we have no results at all
      // Individual file errors are already handled in the mutationFn
      if (suggestions.length === 0) {
        const errorMessage = error.response?.status === 413 
          ? 'Files are too large to analyze. Please try smaller files or fewer files at once.'
          : error.response?.data?.detail || error.message || 'Failed to analyze files'
        alert(`Failed to analyze files: ${errorMessage}`)
      } else {
        // Some files were analyzed successfully, just show a warning
        console.warn('Some files failed to analyze, but partial results are available')
      }
      setAnalyzing(false)
      setAnalyzingProgress({ current: 0, total: 0 })
    },
  })

  const handleAnalyze = async () => {
    if (files.length === 0) {
      alert('Please select files first')
      return
    }
    
    // Warn user if analyzing many files
    if (files.length > 10) {
      const proceed = confirm(`You are about to analyze ${files.length} files. This may take a while. Continue?`)
      if (!proceed) {
        return
      }
    }
    
    setAnalyzing(true)
    analyzeMutation.mutate(files)
  }

  const handleSkipAI = () => {
    if (files.length === 0) {
      alert('Please select files first')
      return
    }
    
    // Create empty suggestions for all files
    const emptySuggestions: FileSuggestion[] = files.map(file => ({
      filename: file.name,
      universe_id: null,
      category_id: null,
      product_id: null,
      universe_name: null,
      category_name: null,
      product_name: null,
      confidence: 0, // Manual entry - confidence is 0
      reasoning: 'Manually filled',
      material_type: 'product_brief', // Default value
      audience: 'internal', // Default value
      other_type_description: null,
    }))
    
    setSuggestions(emptySuggestions)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditFormData({ ...suggestions[index] })
    setShowCategoryForm(false)
    setShowProductForm(false)
    setCategoryFormData({ name: '', display_name: '', description: '' })
    setProductFormData({ name: '', display_name: '', short_description: '', phase: '', website_url: '', documentation_url: '' })
    setCategoryErrors({})
    setProductErrors({})
  }

  // Update category/product names when data becomes available
  useEffect(() => {
    if (editFormData && editingIndex !== null) {
      let updated = { ...editFormData }
      let needsUpdate = false

      // Update category name if category_id is set but name is missing
      if (editFormData.category_id && !editFormData.category_name && categories.length > 0) {
        const category = categories.find((c: any) => c.id === editFormData.category_id)
        if (category) {
          updated.category_name = category.display_name || category.name || null
          needsUpdate = true
        }
      }

      // Update product name if product_id is set but name is missing
      if (editFormData.product_id && !editFormData.product_name && products.length > 0) {
        const product = products.find((p: any) => p.id === editFormData.product_id)
        if (product) {
          updated.product_name = product.display_name || product.name || null
          // Also update category info if available
          if (product.category_id && !updated.category_id) {
            updated.category_id = product.category_id
          }
          if (product.category_name && !updated.category_name) {
            updated.category_name = product.category_name
          }
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        setEditFormData(updated)
      }
    }
  }, [editFormData, categories, products, editingIndex])

  const handleSaveEdit = () => {
    if (editingIndex !== null && editFormData) {
      const updated = [...suggestions]
      // When user edits, set confidence to 100% to indicate manual review
      // Ensure all names are set before saving
      const savedData = { ...editFormData }
      
      // Ensure category name is set
      if (savedData.category_id && !savedData.category_name && categories.length > 0) {
        const category = categories.find((c: any) => c.id === savedData.category_id)
        if (category) {
          savedData.category_name = category.display_name || category.name || null
        }
      }
      
      // Ensure product name is set
      if (savedData.product_id && !savedData.product_name && products.length > 0) {
        const product = products.find((p: any) => p.id === savedData.product_id)
        if (product) {
          savedData.product_name = product.display_name || product.name || null
        }
      }
      
      updated[editingIndex] = { ...savedData, confidence: 1.0 }
      setSuggestions(updated)
      setEditingIndex(null)
      setEditFormData(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditFormData(null)
    setShowCategoryForm(false)
    setShowProductForm(false)
    setCategoryFormData({ name: '', display_name: '', description: '' })
    setProductFormData({ name: '', display_name: '', short_description: '', phase: '', website_url: '', documentation_url: '' })
    setCategoryErrors({})
    setProductErrors({})
  }

  const uploadMutation = useMutation({
    mutationFn: async (data: { files: File[], suggestions: FileSuggestion[] }) => {
      // Upload files individually with progress tracking
      const results = {
        success_count: 0,
        failure_count: 0,
        successes: [] as any[],
        failures: [] as any[]
      }
      
      // Initialize progress for all files
      const initialProgress: Record<string, { progress: number; status: 'uploading' | 'success' | 'error'; error?: string }> = {}
      data.files.forEach(file => {
        initialProgress[file.name] = { progress: 0, status: 'uploading' }
      })
      setUploadProgress(initialProgress)
      
      // Upload each file individually using the single upload endpoint for progress tracking
      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i]
        const suggestion = data.suggestions[i]
        
        try {
          // Validate suggestion has required fields
          if (!suggestion.universe_id || !suggestion.category_id || !suggestion.product_id || !suggestion.material_type || !suggestion.audience) {
            results.failure_count += 1
            results.failures.push({ filename: file.name, error: 'Missing required fields' })
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { progress: 0, status: 'error', error: 'Missing required fields' }
            }))
            continue
          }
          
          // Create FormData for single file upload endpoint
          const singleFormData = new FormData()
          singleFormData.append('file', file)
          singleFormData.append('material_type', suggestion.material_type)
          singleFormData.append('audience', suggestion.audience)
          singleFormData.append('universe_id', suggestion.universe_id.toString())
          singleFormData.append('category_id', suggestion.category_id.toString())
          singleFormData.append('product_id', suggestion.product_id.toString())
          
          if (suggestion.product_name) {
            singleFormData.append('product_name', suggestion.product_name)
          }
          if (suggestion.universe_name) {
            singleFormData.append('universe_name', suggestion.universe_name)
          }
          if (suggestion.other_type_description) {
            singleFormData.append('other_type_description', suggestion.other_type_description)
          }
          if (suggestion.freshness_date) {
            singleFormData.append('freshness_date', suggestion.freshness_date)
          }
          
          // Use XMLHttpRequest for progress tracking (no timeout)
          const response = await new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100)
                setUploadProgress(prev => ({
                  ...prev,
                  [file.name]: { progress: percentComplete, status: 'uploading' }
                }))
              }
            })
            
            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const responseData = JSON.parse(xhr.responseText)
                  resolve(responseData)
                } catch (e) {
                  resolve({ id: 0, name: file.name })
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText)
                  const errorMsg = errorData.detail?.message || errorData.detail || `Upload failed with status ${xhr.status}`
                  reject(new Error(errorMsg))
                } catch (e) {
                  reject(new Error(`Upload failed with status ${xhr.status}`))
                }
              }
            })
            
            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'))
            })
            
            xhr.addEventListener('abort', () => {
              reject(new Error('Upload aborted'))
            })
            
            // Get auth token
            const token = localStorage.getItem('token')
            const apiUrl = import.meta.env.VITE_API_URL || '/api'
            
            xhr.open('POST', `${apiUrl}/materials/upload`)
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            }
            // No timeout - let it upload as long as needed
            xhr.timeout = 0
            xhr.send(singleFormData)
          })
          
          // Success
          results.success_count += 1
          results.successes.push({ filename: file.name, material_id: response.id })
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { progress: 100, status: 'success' }
          }))
        } catch (error: any) {
          results.failure_count += 1
          const errorMsg = error.message || 'Upload failed'
          results.failures.push({ filename: file.name, error: errorMsg })
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { progress: 0, status: 'error', error: errorMsg }
          }))
        }
      }
      
      return results
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      
      let message = `Upload complete! ${data.success_count} succeeded, ${data.failure_count} failed.`
      
      // Show detailed error messages if there are failures
      if (data.failure_count > 0 && data.failures && data.failures.length > 0) {
        const errorMessages = data.failures.map((f: any) => `${f.filename}: ${f.error || 'Unknown error'}`).join('\n')
        message += `\n\nFailures:\n${errorMessages}`
      }
      
      alert(message)
      
      // Only close if all uploads succeeded
      if (data.failure_count === 0) {
        handleClose()
      } else {
        setUploading(false)
      }
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      setUploading(false)
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files first')
      return
    }
    
    if (suggestions.length === 0) {
      alert('Please analyze files first')
      return
    }
    
    // Ensure files and suggestions arrays are aligned
    if (files.length !== suggestions.length) {
      alert(`Mismatch: ${files.length} files but ${suggestions.length} suggestions. Please re-analyze files.`)
      return
    }
    
    // Filter to only upload files that have required fields
    // For manual entries (confidence = 0), skip threshold check
    const filesToUpload: File[] = []
    const suggestionsToUpload: FileSuggestion[] = []
    
    files.forEach((file, index) => {
      const suggestion = suggestions[index]
      if (suggestion && 
          suggestion.universe_id && 
          suggestion.category_id && 
          suggestion.product_id &&
          suggestion.material_type &&
          suggestion.audience) {
        // Check threshold only for AI-suggested files (confidence > 0)
        // Manual entries (confidence = 0) are always included if they have required fields
        const isManualEntry = suggestion.confidence === 0
        const meetsThreshold = isManualEntry || suggestion.confidence >= autoApplyThreshold
        
        if (meetsThreshold) {
          filesToUpload.push(file)
          suggestionsToUpload.push(suggestion)
        }
      }
    })
    
    if (filesToUpload.length === 0) {
      const missingFields = files.map((file, index) => {
        const suggestion = suggestions[index]
        if (!suggestion) return file.name
        const missing: string[] = []
        if (!suggestion.universe_id) missing.push('universe')
        if (!suggestion.category_id) missing.push('category')
        if (!suggestion.product_id) missing.push('product')
        if (!suggestion.material_type) missing.push('material type')
        if (!suggestion.audience) missing.push('audience')
        if (missing.length > 0) {
          return `${file.name} (missing: ${missing.join(', ')})`
        }
        return null
      }).filter(Boolean)
      
      if (missingFields.length > 0) {
        alert(`Please complete all required fields for all files:\n\n${missingFields.slice(0, 5).join('\n')}${missingFields.length > 5 ? `\n... and ${missingFields.length - 5} more` : ''}`)
      } else {
        alert('No files ready to upload. Please ensure all files have universe, category, product, material type, and audience selected.')
      }
      return
    }
    
    setUploading(true)
    // Reset progress state
    setUploadProgress({})
    uploadMutation.mutate({ files: filesToUpload, suggestions: suggestionsToUpload })
  }

  const handleClose = () => {
    setFiles([])
    setSuggestions([])
    setAnalyzing(false)
    setUploading(false)
    setUploadProgress({})
    setEditingIndex(null)
    setEditFormData(null)
    setShowCategoryForm(false)
    setShowProductForm(false)
    setCategoryFormData({ name: '', display_name: '', description: '' })
    setProductFormData({ name: '', display_name: '', short_description: '', phase: '', website_url: '', documentation_url: '' })
    setCategoryErrors({})
    setProductErrors({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-emerald-600 bg-emerald-50'
    if (confidence >= 0.7) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High'
    if (confidence >= 0.7) return 'Medium'
    return 'Low'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-slate-900">Batch Upload with AI Suggestions</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={analyzing || uploading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ position: 'relative' }}>
          {/* File Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Files (PDF, PPTX, DOCX)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.pptx,.ppt,.docx,.doc"
                onChange={handleFileSelect}
                className="hidden"
                id="batch-file-input"
                disabled={analyzing || uploading}
              />
              <label
                htmlFor="batch-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Click to select files or drag and drop
                </span>
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => {
                  const fileProgress = uploadProgress[file.name]
                  const isUploading = fileProgress?.status === 'uploading'
                  const isSuccess = fileProgress?.status === 'success'
                  const isError = fileProgress?.status === 'error'
                  
                  return (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
                          {isUploading && (
                            <span className="text-xs text-slate-500">{fileProgress.progress}%</span>
                          )}
                          {isSuccess && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          {isError && (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        {!uploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                            disabled={analyzing || uploading}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {isUploading && (
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileProgress.progress}%` }}
                          />
                        </div>
                      )}
                      {isError && fileProgress.error && (
                        <p className="text-xs text-red-600 mt-1">{fileProgress.error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Analyze Button or Skip AI Option */}
          {files.length > 0 && suggestions.length === 0 && (
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="btn-ovh-primary flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {analyzingProgress.total > 0 ? (
                      <span>Analyzing files... ({analyzingProgress.current}/{analyzingProgress.total})</span>
                    ) : (
                      <span>Analyzing files...</span>
                    )}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Analyze Files with AI
                  </>
                )}
              </button>
              <span className="text-slate-500">or</span>
              <button
                onClick={handleSkipAI}
                disabled={analyzing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Skip AI - Fill Manually
              </button>
            </div>
          )}

          {/* Suggestions Table */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {suggestions.some(s => s.confidence === 0) ? 'Manual Entry' : 'AI Suggestions'}
                </h3>
                <div className="flex items-center gap-4">
                  {!suggestions.some(s => s.confidence === 0) && (
                    <label className="text-sm text-slate-700">
                      Auto-apply threshold:
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={autoApplyThreshold}
                        onChange={(e) => setAutoApplyThreshold(parseFloat(e.target.value))}
                        className="ml-2 w-20 px-2 py-1 border border-slate-300 rounded"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto" style={{ position: 'relative' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">File</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Universe</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Category</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Product</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Type</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Audience</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Confidence</th>
                      <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((suggestion, index) => {
                      const isManualEntry = suggestion.confidence === 0
                      const hasRequiredFields = suggestion.universe_id && 
                                                suggestion.category_id && 
                                                suggestion.product_id &&
                                                suggestion.material_type &&
                                                suggestion.audience
                      // For manual entries, skip threshold check
                      const meetsThreshold = isManualEntry || suggestion.confidence >= autoApplyThreshold
                      const isReady = hasRequiredFields && meetsThreshold
                      const canAutoApply = isReady
                      
                      if (editingIndex === index && editFormData) {
                        // Editing row - show full form
                        return (
                          <tr key={index} className="bg-blue-50">
                            <td className="border border-slate-300 px-4 py-2 text-sm">{suggestion.filename}</td>
                            <td colSpan={3} className="border border-slate-300 px-4 py-3">
                              <ProductHierarchySelector
                                key={`hierarchy-${index}-${editFormData.universe_id || 'none'}-${editFormData.category_id || 'none'}-${editFormData.product_id || 'none'}`}
                                universeId={editFormData.universe_id || null}
                                categoryId={editFormData.category_id || null}
                                productId={editFormData.product_id || null}
                                onUniverseChange={(id) => {
                                  // Find universe from the ProductHierarchySelector's own query
                                  // We'll update the name after the component re-renders
                                  setEditFormData(prev => {
                                    if (!prev) return null
                                    const updated = { 
                                      ...prev, 
                                      universe_id: id, 
                                      category_id: null, 
                                      product_id: null,
                                      category_name: null,
                                      product_name: null
                                    }
                                    // Try to find universe name from the universes list
                                    const universe = universes.find((u: any) => u.id === id)
                                    if (universe) {
                                      updated.universe_name = universe.name || universe.display_name || null
                                    }
                                    return updated
                                  })
                                  setShowCategoryForm(false)
                                  setShowProductForm(false)
                                }}
                                onCategoryChange={(id) => {
                                  setEditFormData(prev => {
                                    if (!prev) return null
                                    const updated = { 
                                      ...prev, 
                                      category_id: id, 
                                      product_id: null,
                                      product_name: null
                                    }
                                    // Find category name from the categories list
                                    if (id && categories.length > 0) {
                                      const category = categories.find((c: any) => c.id === id)
                                      if (category) {
                                        updated.category_name = category.display_name || category.name || null
                                      }
                                    } else {
                                      updated.category_name = null
                                    }
                                    return updated
                                  })
                                  setShowProductForm(false)
                                }}
                                onProductChange={(id) => {
                                  setEditFormData(prev => {
                                    if (!prev) return null
                                    const updated = { 
                                      ...prev, 
                                      product_id: id
                                    }
                                    // Find product name from the products list
                                    if (id && products.length > 0) {
                                      const product = products.find((p: any) => p.id === id)
                                      if (product) {
                                        updated.product_name = product.display_name || product.name || null
                                        // Also update category_name if not already set
                                        if (product.category_name && !updated.category_name) {
                                          updated.category_name = product.category_name
                                        }
                                        // Also update category_id if not already set
                                        if (product.category_id && !updated.category_id) {
                                          updated.category_id = product.category_id
                                        }
                                      }
                                    } else {
                                      updated.product_name = null
                                    }
                                    return updated
                                  })
                                }}
                                required={true}
                                showLabels={true}
                                categoryLabelAction={
                                  (isDirector || isPMM) && editFormData.universe_id && !showCategoryForm ? (
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
                                  (isDirector || isPMM) && editFormData.universe_id && !showProductForm ? (
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
                                  (isDirector || isPMM) && editFormData.universe_id ? (
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
                            </td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">
                              <select
                                value={editFormData.material_type || 'product_brief'}
                                onChange={(e) => {
                                  const newMaterialType = e.target.value
                                  // Auto-set audience based on material type
                                  let newAudience = editFormData.audience || 'internal'
                                  if (newMaterialType === 'product_brief' || newMaterialType === 'sales_enablement_deck') {
                                    newAudience = 'internal'
                                  } else if (newMaterialType === 'datasheet' || newMaterialType === 'sales_deck') {
                                    newAudience = 'customer_facing'
                                  }
                                  setEditFormData({ 
                                    ...editFormData, 
                                    material_type: newMaterialType, 
                                    audience: newAudience,
                                    other_type_description: newMaterialType === 'other' ? editFormData.other_type_description || '' : ''
                                  })
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                              >
                                <option value="product_brief">Product Brief</option>
                                <option value="sales_enablement_deck">Sales Enablement Deck</option>
                                <option value="sales_deck">Sales Deck</option>
                                <option value="datasheet">Datasheet</option>
                                <option value="other">Other</option>
                              </select>
                              {editFormData.material_type === 'other' && (
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    value={editFormData.other_type_description || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, other_type_description: e.target.value })}
                                    placeholder="Describe the material type (required)"
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                    required
                                  />
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">
                              <select
                                value={editFormData.audience || 'internal'}
                                onChange={(e) => setEditFormData({ ...editFormData, audience: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                              >
                                <option value="internal">Internal</option>
                                <option value="customer_facing">Customer Facing</option>
                              </select>
                            </td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                {suggestion.confidence === 0 
                                  ? 'Manual' 
                                  : `${getConfidenceLabel(suggestion.confidence)} (${(suggestion.confidence * 100).toFixed(0)}%)`}
                              </span>
                            </td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      
                      // Normal display row
                      // Show green if ready (meets threshold + has fields), yellow if has fields but below threshold
                      return (
                        <tr key={index} className={
                          hasRequiredFields 
                            ? (meetsThreshold ? 'bg-emerald-50' : 'bg-amber-50') 
                            : ''
                        }>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{suggestion.filename}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {suggestion.universe_name || '-'}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {suggestion.category_name || '-'}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {suggestion.product_name || '-'}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {suggestion.material_type || '-'}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {suggestion.audience || '-'}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                              {suggestion.confidence === 0 
                                ? 'Manual' 
                                : `${getConfidenceLabel(suggestion.confidence)} (${(suggestion.confidence * 100).toFixed(0)}%)`}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            <button
                              onClick={() => handleEdit(index)}
                              className="text-primary-600 hover:text-primary-700 text-xs"
                              disabled={uploading}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {(() => {
                const readyCount = suggestions.filter(s => 
                  s.universe_id && s.category_id && s.product_id && s.confidence >= autoApplyThreshold
                ).length
                const needsReviewCount = suggestions.filter(s => 
                  s.universe_id && s.category_id && s.product_id && s.confidence < autoApplyThreshold
                ).length
                
                if (readyCount > 0 || needsReviewCount > 0) {
                  return (
                    <div className={`mt-4 p-3 border rounded-lg ${
                      needsReviewCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className={`flex items-center gap-2 text-sm ${
                        needsReviewCount > 0 ? 'text-amber-800' : 'text-emerald-800'
                      }`}>
                        <CheckCircle className="h-5 w-5" />
                        <span>
                          {readyCount > 0 && (
                            <span>
                              {readyCount} file(s) ready to upload
                              {needsReviewCount > 0 && ' • '}
                            </span>
                          )}
                          {needsReviewCount > 0 && (
                            <span>
                              {needsReviewCount} file(s) need review (confidence below {autoApplyThreshold * 100}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={handleClose}
            disabled={analyzing || uploading}
            className="btn-ovh-secondary"
          >
            Cancel
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={
                uploading || 
                analyzing || 
                suggestions.filter(s => 
                  s.universe_id && s.category_id && s.product_id && s.confidence >= autoApplyThreshold
                ).length === 0
              }
              className="btn-ovh-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload {suggestions.filter(s => 
                    s.universe_id && s.category_id && s.product_id && s.confidence >= autoApplyThreshold
                  ).length} Files
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
