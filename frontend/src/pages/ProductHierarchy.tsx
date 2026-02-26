import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Layers, Plus, Package, Folder, Edit, Image } from 'lucide-react'
import Modal from '../components/Modal'
import { clearIconCache } from '../components/ProductIcon'

interface Universe {
  id: number
  name: string
  display_name: string
  description?: string
}

interface Category {
  id: number
  name: string
  display_name: string
  universe_id: number
  description?: string
}

interface Product {
  id: number
  name: string
  display_name: string
  universe_id: number
  category_id?: number
  short_description?: string
  description?: string
}

export default function ProductHierarchy() {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isIconModalOpen, setIsIconModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedUniverse, setSelectedUniverse] = useState<number | null>(null)
  const [selectedCategoryForIcon, setSelectedCategoryForIcon] = useState<number | null>(null)
  const [selectedProductForIcon, setSelectedProductForIcon] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  // Fetch universes
  const { data: universes = [], isLoading: universesLoading } = useQuery<Universe[]>({
    queryKey: ['universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(res => res.data),
  })

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then(res => res.data),
  })

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; display_name: string; universe_id: number; description?: string }) =>
      api.post('/products/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsCategoryModalOpen(false)
      setSelectedUniverse(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create category'
      alert(`Error: ${errorMessage}`)
    },
  })

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: {
      name: string
      display_name: string
      universe_id: number
      category_id?: number
      short_description?: string
      description?: string
    }) => api.post('/products/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsProductModalOpen(false)
      setSelectedUniverse(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create product'
      alert(`Error: ${errorMessage}`)
    },
  })

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: number; data: Partial<Category> }) =>
      api.put(`/products/categories/${categoryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setSelectedUniverse(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update category'
      alert(`Error: ${errorMessage}`)
    },
  })

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: Partial<Product> }) =>
      api.put(`/products/${productId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsProductModalOpen(false)
      setEditingProduct(null)
      setSelectedUniverse(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update product'
      alert(`Error: ${errorMessage}`)
    },
  })

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string
    const universe_id = parseInt(formData.get('universe_id') as string)
    const description = formData.get('description') as string || undefined

    if (!name || !display_name || !universe_id) {
      alert('Please fill in all required fields')
      return
    }

    createCategoryMutation.mutate({ name, display_name, universe_id, description })
  }

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string
    const universe_id = parseInt(formData.get('universe_id') as string)
    const category_id = formData.get('category_id') ? parseInt(formData.get('category_id') as string) : undefined
    const short_description = formData.get('short_description') as string || undefined
    const description = formData.get('description') as string || undefined

    if (!name || !display_name || !universe_id) {
      alert('Please fill in all required fields')
      return
    }

    createProductMutation.mutate({ name, display_name, universe_id, category_id, short_description, description })
  }

  const handleUpdateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCategory) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string
    const universe_id = parseInt(formData.get('universe_id') as string)
    const description = formData.get('description') as string || undefined

    if (!name || !display_name || !universe_id) {
      alert('Please fill in all required fields')
      return
    }

    updateCategoryMutation.mutate({
      categoryId: editingCategory.id,
      data: { name, display_name, universe_id, description }
    })
  }

  const handleUpdateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string
    const universe_id = parseInt(formData.get('universe_id') as string)
    const category_id = formData.get('category_id') ? parseInt(formData.get('category_id') as string) : undefined
    const short_description = formData.get('short_description') as string || undefined
    const description = formData.get('description') as string || undefined

    if (!name || !display_name || !universe_id) {
      alert('Please fill in all required fields')
      return
    }

    updateProductMutation.mutate({
      productId: editingProduct.id,
      data: { name, display_name, universe_id, category_id, short_description, description }
    })
  }

  // Get categories for selected universe
  const filteredCategories = selectedUniverse
    ? categories.filter(cat => cat.universe_id === selectedUniverse)
    : []

  // Get categories for icon upload
  const iconCategories = selectedUniverse
    ? categories.filter(cat => cat.universe_id === selectedUniverse)
    : []

  // Get products for icon upload
  const iconProducts = selectedUniverse
    ? products.filter(prod => {
        if (selectedProductForIcon) {
          return prod.id === selectedProductForIcon
        }
        if (selectedCategoryForIcon) {
          return prod.category_id === selectedCategoryForIcon && prod.universe_id === selectedUniverse
        }
        return prod.universe_id === selectedUniverse
      })
    : []

  // Upload icon mutation
  const uploadIconMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/products/icons/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      // Clear icon cache so new icons are immediately available
      clearIconCache()
      // Invalidate all queries that might display product icons
      queryClient.invalidateQueries({ queryKey: ['product-releases'] })
      queryClient.invalidateQueries({ queryKey: ['marketing-updates'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setIsIconModalOpen(false)
      setSelectedUniverse(null)
      setSelectedCategoryForIcon(null)
      setSelectedProductForIcon(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      alert('Icon uploaded successfully! The icon will appear in all related cards.')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to upload icon'
      alert(`Error: ${errorMessage}`)
    },
  })

  const handleUploadIcon = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) {
      alert('Please select a file')
      return
    }

    if (!selectedUniverse) {
      alert('Please select a universe')
      return
    }

    const file = fileInputRef.current.files[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('universe_id', selectedUniverse.toString())
    if (selectedCategoryForIcon) {
      formData.append('category_id', selectedCategoryForIcon.toString())
    }
    if (selectedProductForIcon) {
      formData.append('product_id', selectedProductForIcon.toString())
    }

    uploadIconMutation.mutate(formData)
  }

  if (universesLoading || categoriesLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading product hierarchy...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Hierarchy & Icons</h1>
          <p className="mt-2 text-slate-600">Manage product categories, products, and icons</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedUniverse(null)
              setIsCategoryModalOpen(true)
            }}
            className="btn-ovh-primary flex items-center space-x-2"
          >
            <Folder className="w-5 h-5" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              setSelectedUniverse(null)
              setIsProductModalOpen(true)
            }}
            className="btn-ovh-primary flex items-center space-x-2"
          >
            <Package className="w-5 h-5" />
            <span>New Product</span>
          </button>
          <button
            onClick={() => {
              setSelectedUniverse(null)
              setSelectedCategoryForIcon(null)
              setSelectedProductForIcon(null)
              setIsIconModalOpen(true)
            }}
            className="btn-ovh-primary flex items-center space-x-2"
          >
            <Image className="w-5 h-5" />
            <span>New Icon</span>
          </button>
        </div>
      </div>

      {/* Hierarchy View */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Current Hierarchy</h2>
        <div className="space-y-4">
          {universes.map((universe) => {
            const universeCategories = categories.filter(cat => cat.universe_id === universe.id)
            const universeProducts = products.filter(prod => prod.universe_id === universe.id)
            
            return (
              <div key={universe.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Layers className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">{universe.display_name}</h3>
                  <span className="text-sm text-slate-500">
                    ({universeCategories.length} categories, {universeProducts.length} products)
                  </span>
                </div>
                
                {/* Categories */}
                {universeCategories.length > 0 && (
                  <div className="ml-7 mb-3">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Categories:</h4>
                    <div className="space-y-2">
                      {universeCategories.map((category) => {
                        const categoryProducts = products.filter(prod => prod.category_id === category.id)
                        return (
                          <div key={category.id} className="pl-4 border-l-2 border-slate-200">
                            <div className="flex items-center space-x-2">
                              <Folder className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-700">{category.display_name}</span>
                              <span className="text-xs text-slate-500">({categoryProducts.length} products)</span>
                              <button
                                onClick={() => {
                                  setEditingCategory(category)
                                  setSelectedUniverse(category.universe_id)
                                  setIsCategoryModalOpen(true)
                                }}
                                className="ml-2 p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                title="Edit category"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Products in this category */}
                            {categoryProducts.length > 0 && (
                              <div className="ml-6 mt-1 space-y-1">
                                {categoryProducts.map((product) => (
                                  <div key={product.id} className="flex items-center space-x-2 text-xs text-slate-600">
                                    <Package className="w-3 h-3" />
                                    <span>{product.display_name}</span>
                                    <button
                                      onClick={() => {
                                        setEditingProduct(product)
                                        setSelectedUniverse(product.universe_id)
                                        setIsProductModalOpen(true)
                                      }}
                                      className="ml-1 p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                      title="Edit product"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Products without category */}
                {universeProducts.filter(prod => !prod.category_id).length > 0 && (
                  <div className="ml-7">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Products (no category):</h4>
                    <div className="space-y-1">
                      {universeProducts
                        .filter(prod => !prod.category_id)
                        .map((product) => (
                          <div key={product.id} className="flex items-center space-x-2 text-xs text-slate-600 pl-4">
                            <Package className="w-3 h-3" />
                            <span>{product.display_name}</span>
                            <button
                              onClick={() => {
                                setEditingProduct(product)
                                setSelectedUniverse(product.universe_id)
                                setIsProductModalOpen(true)
                              }}
                              className="ml-1 p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                              title="Edit product"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {isCategoryModalOpen && (
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false)
            setEditingCategory(null)
            setSelectedUniverse(null)
          }}
          title={editingCategory ? "Edit Category" : "Create New Category"}
        >
          <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Universe *
              </label>
              <select
                name="universe_id"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={selectedUniverse || editingCategory?.universe_id || ''}
                onChange={(e) => setSelectedUniverse(parseInt(e.target.value))}
              >
                <option value="">Select Universe</option>
                {universes.map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category Name (internal) *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g., ai_machine_learning"
                defaultValue={editingCategory?.name || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">Lowercase, use underscores (e.g., ai_machine_learning)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                name="display_name"
                required
                placeholder="e.g., AI & Machine Learning"
                defaultValue={editingCategory?.display_name || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Category description..."
                defaultValue={editingCategory?.description || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                  setSelectedUniverse(null)
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editingCategory ? updateCategoryMutation.isPending : createCategoryMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {editingCategory
                  ? (updateCategoryMutation.isPending ? 'Updating...' : 'Update Category')
                  : (createCategoryMutation.isPending ? 'Creating...' : 'Create Category')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create/Edit Product Modal */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false)
            setEditingProduct(null)
            setSelectedUniverse(null)
          }}
          title={editingProduct ? "Edit Product" : "Create New Product"}
        >
          <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Universe *
              </label>
              <select
                name="universe_id"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={selectedUniverse || editingProduct?.universe_id || ''}
                onChange={(e) => setSelectedUniverse(parseInt(e.target.value))}
              >
                <option value="">Select Universe</option>
                {universes.map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category (optional)
              </label>
              <select
                name="category_id"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedUniverse && !editingProduct?.universe_id}
                defaultValue={editingProduct?.category_id || ''}
              >
                <option value="">No Category</option>
                {(selectedUniverse || editingProduct?.universe_id) && categories
                  .filter(cat => cat.universe_id === (selectedUniverse || editingProduct?.universe_id))
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.display_name}
                    </option>
                  ))}
              </select>
              {!selectedUniverse && !editingProduct?.universe_id && (
                <p className="mt-1 text-xs text-slate-500">Select a universe first to see categories</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name (internal) *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g., ai_deploy"
                defaultValue={editingProduct?.name || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">Lowercase, use underscores (e.g., ai_deploy)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                name="display_name"
                required
                placeholder="e.g., AI Deploy"
                defaultValue={editingProduct?.display_name || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short Description (optional)
              </label>
              <input
                type="text"
                name="short_description"
                placeholder="Brief product description..."
                defaultValue={editingProduct?.short_description || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Full product description..."
                defaultValue={editingProduct?.description || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false)
                  setEditingProduct(null)
                  setSelectedUniverse(null)
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editingProduct ? updateProductMutation.isPending : createProductMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {editingProduct
                  ? (updateProductMutation.isPending ? 'Updating...' : 'Update Product')
                  : (createProductMutation.isPending ? 'Creating...' : 'Create Product')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Upload Icon Modal */}
      {isIconModalOpen && (
        <Modal
          isOpen={isIconModalOpen}
          onClose={() => {
            setIsIconModalOpen(false)
            setSelectedUniverse(null)
            setSelectedCategoryForIcon(null)
            setSelectedProductForIcon(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          title="Upload New Product Icon"
        >
          <form onSubmit={handleUploadIcon} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Universe *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={selectedUniverse || ''}
                onChange={(e) => {
                  const universeId = parseInt(e.target.value)
                  setSelectedUniverse(universeId)
                  setSelectedCategoryForIcon(null)
                  setSelectedProductForIcon(null)
                }}
              >
                <option value="">Select Universe</option>
                {universes.map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category (optional)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedUniverse}
                value={selectedCategoryForIcon || ''}
                onChange={(e) => {
                  const categoryId = e.target.value ? parseInt(e.target.value) : null
                  setSelectedCategoryForIcon(categoryId)
                  setSelectedProductForIcon(null)
                }}
              >
                <option value="">No Category</option>
                {iconCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.display_name}
                  </option>
                ))}
              </select>
              {!selectedUniverse && (
                <p className="mt-1 text-xs text-slate-500">Select a universe first to see categories</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product (optional)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedUniverse}
                value={selectedProductForIcon || ''}
                onChange={(e) => {
                  const productId = e.target.value ? parseInt(e.target.value) : null
                  setSelectedProductForIcon(productId)
                }}
              >
                <option value="">No Product</option>
                {iconProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.display_name}
                  </option>
                ))}
              </select>
              {!selectedUniverse && (
                <p className="mt-1 text-xs text-slate-500">Select a universe first to see products</p>
              )}
              {selectedUniverse && iconProducts.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">No products available. Select a category or create products first.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Icon File *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">Accepted formats: SVG, PNG, JPG (max 10MB)</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsIconModalOpen(false)
                  setSelectedUniverse(null)
                  setSelectedCategoryForIcon(null)
                  setSelectedProductForIcon(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadIconMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {uploadIconMutation.isPending ? 'Uploading...' : 'Upload Icon'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
