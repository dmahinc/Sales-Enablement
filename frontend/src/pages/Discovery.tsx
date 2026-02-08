import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Search, FileText, ChevronRight, ChevronDown, Home, Folder, FolderOpen, Download, Share2, ClipboardList, Presentation, GraduationCap, FileSpreadsheet, LucideIcon } from 'lucide-react'
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

  // Handle download
  const handleDownload = async (material: Material) => {
    try {
      const response = await api.get(`/materials/${material.id}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', material.file_name || `${material.name}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Failed to download file')
    }
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
          <div className="flex items-center space-x-2 mb-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            console.log('Discovery - Rendering icon for material:', material.name, 'type:', material.material_type, 'Icon component:', MaterialIcon)
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
