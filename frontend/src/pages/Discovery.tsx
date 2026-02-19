import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Search, FileText, ChevronRight, ChevronDown, Home, Folder, FolderOpen, Download, Share2, ClipboardList, Presentation, GraduationCap, FileSpreadsheet, LucideIcon, Eye, X, Calendar, Clock, Grid3x3, List as ListIcon } from 'lucide-react'
import ShareLinkModal from '../components/ShareLinkModal'

interface Material {
  id: number
  name: string
  material_type: string
  universe_name?: string
  product_name?: string
  description?: string
  tags?: string[]
  status?: string
  file_path?: string
  file_name?: string
  last_updated?: string
  usage_count?: number
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

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUniverseId, setSelectedUniverseId] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [expandedUniverses, setExpandedUniverses] = useState<Set<number>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [sharingMaterial, setSharingMaterial] = useState<Material | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery')

  // Fetch data
  const { data: materials = [], isLoading: materialsLoading } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  const { data: universes = [] } = useQuery<Universe[]>({
    queryKey: ['products', 'universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
  })

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['products', 'categories'],
    queryFn: () => api.get('/products/categories').then(res => res.data),
  })

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products', 'list'],
    queryFn: () => api.get('/products/').then(res => res.data),
  })

  // Filter categories and products by selected universe
  const categories = useMemo(() => {
    if (!selectedUniverseId) return []
    return allCategories.filter(cat => cat.universe_id === selectedUniverseId)
  }, [allCategories, selectedUniverseId])

  const products = useMemo(() => {
    if (!selectedUniverseId) return []
    let filtered = allProducts.filter(prod => prod.universe_id === selectedUniverseId)
    if (selectedCategoryId) {
      filtered = filtered.filter(prod => prod.category_id === selectedCategoryId)
    }
    return filtered
  }, [allProducts, selectedUniverseId, selectedCategoryId])

  // Group materials by universe for default view
  const materialsByUniverse = useMemo(() => {
    const grouped: Record<string, Material[]> = {}
    materials.forEach(material => {
      const universe = material.universe_name || 'Uncategorized'
      if (!grouped[universe]) {
        grouped[universe] = []
      }
      grouped[universe].push(material)
    })
    return grouped
  }, [materials])

  // Filter materials based on selection and search
  const filteredMaterials = useMemo(() => {
    let filtered = materials

    // Filter by hierarchy selection
    if (selectedUniverseId) {
      const universe = universes.find(u => u.id === selectedUniverseId)
      if (universe) {
        filtered = filtered.filter(m => m.universe_name === universe.name)
      }
    }
    if (selectedCategoryId) {
      const category = allCategories.find(c => c.id === selectedCategoryId)
      if (category) {
        // Filter by products in this category
        const categoryProducts = allProducts.filter(p => p.category_id === selectedCategoryId)
        const productNames = categoryProducts.map(p => p.name).concat(categoryProducts.map(p => p.display_name))
        filtered = filtered.filter(m => m.product_name && productNames.includes(m.product_name))
      }
    }
    if (selectedProductId) {
      const product = allProducts.find(p => p.id === selectedProductId)
      if (product) {
        filtered = filtered.filter(m => 
          m.product_name === product.name || m.product_name === product.display_name
        )
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.product_name?.toLowerCase().includes(query) ||
        m.universe_name?.toLowerCase().includes(query) ||
        m.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [materials, selectedUniverseId, selectedCategoryId, selectedProductId, searchQuery, universes, allCategories, allProducts])

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'All Materials', onClick: () => {
        setSelectedUniverseId(null)
        setSelectedCategoryId(null)
        setSelectedProductId(null)
      }}
    ]
    if (selectedUniverseId) {
      const universe = universes.find(u => u.id === selectedUniverseId)
      if (universe) {
        crumbs.push({
          label: universe.display_name,
          onClick: () => {
            setSelectedCategoryId(null)
            setSelectedProductId(null)
          }
        })
      }
    }
    if (selectedCategoryId) {
      const category = allCategories.find(c => c.id === selectedCategoryId)
      if (category) {
        crumbs.push({
          label: category.display_name,
          onClick: () => setSelectedProductId(null)
        })
      }
    }
    if (selectedProductId) {
      const product = allProducts.find(p => p.id === selectedProductId)
      if (product) {
        crumbs.push({ label: product.display_name })
      }
    }
    return crumbs
  }, [selectedUniverseId, selectedCategoryId, selectedProductId, universes, allCategories, allProducts])

  // Toggle universe expansion
  const toggleUniverse = (universeId: number) => {
    setExpandedUniverses(prev => {
      const next = new Set(prev)
      if (next.has(universeId)) {
        next.delete(universeId)
      } else {
        next.add(universeId)
      }
      return next
    })
  }

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Get products for a category
  const getCategoryProducts = (categoryId: number) => {
    return allProducts.filter(p => p.category_id === categoryId)
  }

  // Handle universe selection
  const handleUniverseSelect = (universeId: number) => {
    setSelectedUniverseId(universeId)
    setSelectedCategoryId(null)
    setSelectedProductId(null)
    if (!expandedUniverses.has(universeId)) {
      toggleUniverse(universeId)
    }
  }

  // Handle category selection
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId)
    setSelectedProductId(null)
    if (!expandedCategories.has(categoryId)) {
      toggleCategory(categoryId)
    }
  }

  // Handle product selection
  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId)
  }

  const [downloadingMaterial, setDownloadingMaterial] = useState<Material | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Handle download with progress tracking
  const handleDownload = async (material: Material) => {
    setDownloadingMaterial(material)
    setDownloadProgress(0)

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const url = `${API_URL}/materials/${material.id}/download`

      xhr.open('GET', url, true)
      xhr.responseType = 'blob'

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      // No timeout - let it download as long as needed
      xhr.timeout = 0

      // Track download progress
      xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setDownloadProgress(percentComplete)
        }
      })

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', material.file_name || `${material.name}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          setDownloadingMaterial(null)
          setDownloadProgress(0)
          resolve()
        } else {
          try {
            const errorBlob = xhr.response
            errorBlob.text().then((text: string) => {
              let errorMessage = 'Failed to download file'
              try {
                const errorData = JSON.parse(text)
                errorMessage = errorData.detail || errorMessage
              } catch {
                errorMessage = text || errorMessage
              }
              setDownloadingMaterial(null)
              setDownloadProgress(0)
              alert(`Failed to download file: ${errorMessage}`)
              reject(new Error(errorMessage))
            })
          } catch {
            setDownloadingMaterial(null)
            setDownloadProgress(0)
            const errorMessage = `Failed to download file: HTTP ${xhr.status}`
            alert(errorMessage)
            reject(new Error(errorMessage))
          }
        }
      }

      xhr.onerror = () => {
        setDownloadingMaterial(null)
        setDownloadProgress(0)
        const errorMessage = 'Network error while downloading file'
        alert(errorMessage)
        reject(new Error(errorMessage))
      }

      xhr.ontimeout = () => {
        setDownloadingMaterial(null)
        setDownloadProgress(0)
        const errorMessage = 'Download timeout'
        alert(errorMessage)
        reject(new Error(errorMessage))
      }

      xhr.send()
    })
  }

  if (materialsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Hierarchical Navigation */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Browse by Hierarchy</h2>
          
          {/* All Materials */}
          <button
            onClick={() => {
              setSelectedUniverseId(null)
              setSelectedCategoryId(null)
              setSelectedProductId(null)
            }}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center space-x-2 ${
              !selectedUniverseId && !selectedCategoryId && !selectedProductId
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>All Materials</span>
          </button>

          {/* Universes */}
          {universes.map(universe => {
            const universeCategories = allCategories.filter(c => c.universe_id === universe.id)
            const isExpanded = expandedUniverses.has(universe.id)
            const isSelected = selectedUniverseId === universe.id && !selectedCategoryId && !selectedProductId

            return (
              <div key={universe.id} className="mb-1">
                <button
                  onClick={() => handleUniverseSelect(universe.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {universeCategories.length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUniverse(universe.id)
                      }}
                      className="p-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <FolderOpen className="w-4 h-4" />
                  <span className="flex-1">{universe.display_name}</span>
                  <span className="text-xs text-slate-400">
                    {materials.filter(m => m.universe_name === universe.name).length}
                  </span>
                </button>

                {/* Categories */}
                {isExpanded && universeCategories.map(category => {
                  const categoryProducts = getCategoryProducts(category.id)
                  const isCategoryExpanded = expandedCategories.has(category.id)
                  const isCategorySelected = selectedCategoryId === category.id && !selectedProductId

                  return (
                    <div key={category.id} className="ml-6 mt-1">
                      <button
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${
                          isCategorySelected
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {categoryProducts.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategory(category.id)
                            }}
                            className="p-0.5"
                          >
                            {isCategoryExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <Folder className="w-4 h-4" />
                        <span className="flex-1">{category.display_name}</span>
                        <span className="text-xs text-slate-400">
                          {materials.filter(m => {
                            const productNames = categoryProducts.map(p => p.name).concat(categoryProducts.map(p => p.display_name))
                            return m.product_name && productNames.includes(m.product_name)
                          }).length}
                        </span>
                      </button>

                      {/* Products */}
                      {isCategoryExpanded && categoryProducts.map(product => {
                        const isProductSelected = selectedProductId === product.id

                        return (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg ml-6 mt-1 flex items-center space-x-2 ${
                              isProductSelected
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span className="flex-1">{product.display_name}</span>
                            <span className="text-xs text-slate-400">
                              {materials.filter(m => 
                                m.product_name === product.name || m.product_name === product.display_name
                              ).length}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Breadcrumbs and Search */}
        <div className="border-b border-slate-200 bg-white p-4">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-sm text-slate-600 font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('gallery')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'gallery'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gallery View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="text-lg">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Materials Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No materials found</h3>
              <p className="text-sm text-slate-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Select a universe, category, or product to view materials'}
              </p>
            </div>
          ) : (
            <>
              {/* Show grouped by universe if no specific selection */}
              {!selectedUniverseId && !selectedCategoryId && !selectedProductId && !searchQuery ? (
                Object.entries(materialsByUniverse).map(([universeName, universeMaterials]) => (
                  <div key={universeName} className="mb-8">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">{universeName}</h2>
                    {viewMode === 'gallery' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {universeMaterials.map(material => (
                          <MaterialGalleryCard 
                            key={material.id} 
                            material={material}
                            onDownload={handleDownload}
                            onShare={(material) => {
                              setSharingMaterial(material)
                              setIsShareModalOpen(true)
                            }}
                            onPreview={(material) => setPreviewMaterial(material)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {universeMaterials.map(material => (
                          <MaterialCard 
                            key={material.id} 
                            material={material}
                            onDownload={handleDownload}
                            onShare={(material) => {
                              setSharingMaterial(material)
                              setIsShareModalOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                viewMode === 'gallery' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMaterials.map(material => (
                      <MaterialGalleryCard 
                        key={material.id} 
                        material={material}
                        onDownload={handleDownload}
                        onShare={(material) => {
                          setSharingMaterial(material)
                          setIsShareModalOpen(true)
                        }}
                        onPreview={(material) => setPreviewMaterial(material)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMaterials.map(material => (
                      <MaterialCard 
                        key={material.id} 
                        material={material}
                        onDownload={handleDownload}
                        onShare={(material) => {
                          setSharingMaterial(material)
                          setIsShareModalOpen(true)
                        }}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {sharingMaterial && (
        <ShareLinkModal
          materialId={sharingMaterial.id}
          materialName={sharingMaterial.name}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false)
            setSharingMaterial(null)
          }}
        />
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <MaterialPreviewModal
          material={previewMaterial}
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          onDownload={handleDownload}
          onShare={(material) => {
            setSharingMaterial(material)
            setIsShareModalOpen(true)
            setPreviewMaterial(null)
          }}
        />
      )}

      {/* Download Progress Modal */}
      {downloadingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Downloading Material</h3>
            <p className="text-sm text-slate-600 mb-4 truncate">{downloadingMaterial.name || downloadingMaterial.file_name}</p>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">{downloadProgress.toFixed(0)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface MaterialCardProps {
  material: Material
  onDownload: (material: Material) => void
  onShare: (material: Material) => void
}

// Helper function to get icon for material type
function getMaterialTypeIcon(materialType: string | null | undefined): LucideIcon {
  if (!materialType) return FileText
  
  const type = materialType.toLowerCase().trim()
  
  // Handle both database format (PRODUCT_DATASHEET) and frontend format (datasheet)
  switch (type) {
    case 'product_brief':
      return ClipboardList
    case 'sales_deck':
    case 'product_sales_deck':
      return Presentation
    case 'sales_enablement_deck':
    case 'product_sales_enablement_deck':
      return GraduationCap
    case 'datasheet':
    case 'product_datasheet':
      return FileSpreadsheet
    default:
      return FileText
  }
}

function MaterialCard({ material, onDownload, onShare }: MaterialCardProps) {
  return (
    <div className="card-ovh p-4 hover:shadow-md transition-all group">
      <div className="flex items-start space-x-3">
        <div className="bg-primary-50 p-2 rounded-lg flex-shrink-0">
          {(() => {
            const MaterialIcon = getMaterialTypeIcon(material.material_type)
            return <MaterialIcon className="h-5 w-5 text-primary-500" />
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600 truncate mb-1">
            {material.name}
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            {material.material_type?.replace(/_/g, ' ')}
          </p>
          {material.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-2">{material.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            {material.universe_name && (
              <span className="text-xs text-slate-400">{material.universe_name}</span>
            )}
            {material.status && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                material.status === 'published' ? 'bg-green-50 text-green-700' :
                material.status === 'draft' ? 'bg-yellow-50 text-yellow-700' :
                'bg-slate-50 text-slate-700'
              }`}>
                {material.status}
              </span>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-slate-100">
            {material.status === 'published' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(material)
                }}
                className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {material.file_path && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload(material)
                }}
                className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get color classes for material type
function getMaterialTypeColors(materialType: string | null | undefined): { bg: string; icon: string; border: string } {
  if (!materialType) return { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-200' }
  
  const type = materialType.toLowerCase().trim()
  
  switch (type) {
    case 'product_brief':
      return { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' }
    case 'sales_deck':
    case 'product_sales_deck':
      return { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' }
    case 'sales_enablement_deck':
    case 'product_sales_enablement_deck':
      return { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' }
    case 'datasheet':
    case 'product_datasheet':
      return { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' }
    default:
      return { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-200' }
  }
}

// Helper function to calculate freshness
function getFreshnessInfo(lastUpdated?: string): { label: string; color: string; days: number | null } {
  if (!lastUpdated) {
    return { label: 'No date', color: 'text-slate-400', days: null }
  }
  
  const days = Math.floor((new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
  
  if (days <= 30) {
    return { label: 'Fresh', color: 'text-green-600', days }
  } else if (days <= 90) {
    return { label: 'Recent', color: 'text-blue-600', days }
  } else if (days <= 180) {
    return { label: 'Aging', color: 'text-yellow-600', days }
  } else if (days <= 365) {
    return { label: 'Stale', color: 'text-orange-600', days }
  } else {
    return { label: 'Very Stale', color: 'text-red-600', days }
  }
}

interface MaterialGalleryCardProps {
  material: Material
  onDownload: (material: Material) => void
  onShare: (material: Material) => void
  onPreview: (material: Material) => void
}

function MaterialGalleryCard({ material, onDownload, onShare, onPreview }: MaterialGalleryCardProps) {
  const colors = getMaterialTypeColors(material.material_type)
  const MaterialIcon = getMaterialTypeIcon(material.material_type)
  const freshness = getFreshnessInfo(material.last_updated)
  
  return (
    <div 
      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-primary-300 transition-all duration-200 cursor-pointer"
      onClick={() => onPreview(material)}
    >
      {/* Thumbnail/Icon Section */}
      <div className={`${colors.bg} ${colors.border} border-b-2 h-48 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        <MaterialIcon className={`w-16 h-16 ${colors.icon} relative z-10 transition-transform group-hover:scale-110`} />
        
        {/* Status Badge */}
        {material.status && (
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              material.status === 'published' ? 'bg-green-100 text-green-700' :
              material.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              material.status === 'review' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {material.status}
            </span>
          </div>
        )}
        
        {/* Freshness Badge */}
        {freshness.days !== null && (
          <div className="absolute top-3 left-3">
            <div className={`flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium ${freshness.color}`}>
              <Clock className="w-3 h-3" />
              <span>{freshness.label}</span>
            </div>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <Eye className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-medium text-slate-700">Preview</span>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {material.name}
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.icon}`}>
            {material.material_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          {material.usage_count !== undefined && material.usage_count > 0 && (
            <span className="text-xs text-slate-500 flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{material.usage_count}</span>
            </span>
          )}
        </div>
        
        {material.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {material.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          {material.universe_name && (
            <span className="truncate">{material.universe_name}</span>
          )}
          {material.product_name && (
            <span className="truncate ml-2">{material.product_name}</span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          {material.status === 'published' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare(material)
              }}
              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {material.file_path && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownload(material)
              }}
              className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface MaterialPreviewModalProps {
  material: Material
  isOpen: boolean
  onClose: () => void
  onDownload: (material: Material) => void
  onShare: (material: Material) => void
}

function MaterialPreviewModal({ material, isOpen, onClose, onDownload, onShare }: MaterialPreviewModalProps) {
  if (!isOpen) return null
  
  const colors = getMaterialTypeColors(material.material_type)
  const MaterialIcon = getMaterialTypeIcon(material.material_type)
  const freshness = getFreshnessInfo(material.last_updated)
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
        
        {/* Modal */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${colors.bg} px-6 py-4 border-b ${colors.border}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-lg bg-white ${colors.border} border-2`}>
                  <MaterialIcon className={`w-8 h-8 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{material.name}</h2>
                  <div className="flex items-center space-x-3 flex-wrap">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${colors.bg} ${colors.icon}`}>
                      {material.material_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {material.status && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        material.status === 'published' ? 'bg-green-100 text-green-700' :
                        material.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {material.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            {/* Description */}
            {material.description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                <p className="text-sm text-slate-600">{material.description}</p>
              </div>
            )}
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {material.universe_name && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Universe</h4>
                  <p className="text-sm text-slate-900">{material.universe_name}</p>
                </div>
              )}
              {material.product_name && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Product</h4>
                  <p className="text-sm text-slate-900">{material.product_name}</p>
                </div>
              )}
              {material.last_updated && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Last Updated</h4>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-900">
                      {new Date(material.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {freshness.days !== null && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Freshness</h4>
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-4 h-4 ${freshness.color}`} />
                    <p className={`text-sm font-medium ${freshness.color}`}>
                      {freshness.label} ({freshness.days} days)
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tags */}
            {material.tags && material.tags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((tag, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            {material.status === 'published' && (
              <button
                onClick={() => onShare(material)}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
            {material.file_path && (
              <button
                onClick={() => onDownload(material)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
