import { useState, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { 
  FileText, 
  Download,
  Eye,
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Star
} from 'lucide-react'
import ProductIcon from '../components/ProductIcon'

interface SharedMaterial {
  material_id: number
  material_name: string
  material_type: string
  product_name?: string
  universe_name?: string
  file_name?: string
  file_format?: string
  shared_at?: string
  shared_by?: string
  shared_by_email?: string
  share_token: string
  access_count: number
  download_count: number
  expires_at?: string
  is_favorite?: boolean
}

export default function CustomerMaterials() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get('/customers/dashboard').then(res => res.data),
  })

  const queryClient = useQueryClient()

  const sharedMaterials: SharedMaterial[] = data?.shared_materials || []

  // Get unique values for filters
  const universes = useMemo(() => {
    const unique = new Set(sharedMaterials.map(m => m.universe_name).filter(Boolean))
    return Array.from(unique).sort()
  }, [sharedMaterials])

  const products = useMemo(() => {
    const unique = new Set(sharedMaterials.map(m => m.product_name).filter(Boolean))
    return Array.from(unique).sort()
  }, [sharedMaterials])

  const materialTypes = useMemo(() => {
    const unique = new Set(sharedMaterials.map(m => m.material_type).filter(Boolean))
    return Array.from(unique).sort()
  }, [sharedMaterials])

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ materialId, isFavorite }: { materialId: number; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.delete(`/customers/favorites/${materialId}`)
      } else {
        await api.post(`/customers/favorites/${materialId}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
    },
  })

  const handleToggleFavorite = (material: SharedMaterial) => {
    if (toggleFavoriteMutation.isPending) return // Prevent double-clicks
    console.log('Toggling favorite for material:', material.material_id, 'Current favorite:', material.is_favorite)
    toggleFavoriteMutation.mutate({
      materialId: material.material_id,
      isFavorite: material.is_favorite === true,
    }, {
      onError: (error) => {
        console.error('Error toggling favorite:', error)
        alert('Failed to update favorite. Please try again.')
      }
    })
  }

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return sharedMaterials.filter(material => {
      // Favorites filter
      if (showFavoritesOnly && !material.is_favorite) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          material.material_name.toLowerCase().includes(query) ||
          material.product_name?.toLowerCase().includes(query) ||
          material.universe_name?.toLowerCase().includes(query) ||
          material.material_type?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Universe filter
      if (selectedUniverse && material.universe_name !== selectedUniverse) {
        return false
      }

      // Product filter
      if (selectedProduct && material.product_name !== selectedProduct) {
        return false
      }

      // Type filter
      if (selectedType && material.material_type !== selectedType) {
        return false
      }

      return true
    })
  }, [sharedMaterials, searchQuery, selectedUniverse, selectedProduct, selectedType, showFavoritesOnly])

  const handleDownload = async (material: SharedMaterial) => {
    try {
      const response = await api.get(`/shared-links/token/${material.share_token}/download`, {
        responseType: 'blob',
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = material.file_name || material.material_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Refresh dashboard to update download counts
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download material. The link may have expired.')
    }
  }

  const formatMaterialType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Product ', '')
  }

  const getMaterialTypeIcon = (type: string) => {
    return FileText
  }

  const getMaterialTypeColors = (type: string) => {
    return {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      border: 'border-primary-200 dark:border-primary-800',
      icon: 'text-primary-600 dark:text-primary-400',
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your materials...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading materials. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-400">My Shared Materials</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Documents shared with you by OVHcloud team members
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFavoritesOnly
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
            <span>{showFavoritesOnly ? 'Show All' : 'Favorites Only'}</span>
          </button>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {filteredMaterials.length} {filteredMaterials.length === 1 ? 'material' : 'materials'}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search materials by name, product, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-ovh pl-10 w-full"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ovh-secondary flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Universe Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Universe
              </label>
              <select
                value={selectedUniverse || ''}
                onChange={(e) => setSelectedUniverse(e.target.value || null)}
                className="input-ovh w-full"
              >
                <option value="">All Universes</option>
                {universes.map(universe => (
                  <option key={universe} value={universe}>{universe}</option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Product
              </label>
              <select
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(e.target.value || null)}
                className="input-ovh w-full"
              >
                <option value="">All Products</option>
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Material Type
              </label>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
                className="input-ovh w-full"
              >
                <option value="">All Types</option>
                {materialTypes.map(type => (
                  <option key={type} value={type}>{formatMaterialType(type)}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedUniverse || selectedProduct || selectedType) && (
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedUniverse(null)
                    setSelectedProduct(null)
                    setSelectedType(null)
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Clear all filters</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="card-ovh p-12 text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            {sharedMaterials.length === 0 
              ? 'No materials shared yet' 
              : 'No materials match your filters'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {sharedMaterials.length === 0
              ? 'Materials shared with you by OVHcloud team members will appear here.'
              : 'Try adjusting your search or filters to find what you\'re looking for.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const colors = getMaterialTypeColors(material.material_type)
            const MaterialIcon = getMaterialTypeIcon(material.material_type)
            const isExpired = material.expires_at && new Date(material.expires_at) < new Date()

            return (
              <div
                key={material.material_id}
                className="card-ovh overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className={`${colors.bg} ${colors.border} border-b-2 p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {material.product_name && (
                        <ProductIcon 
                          productName={material.product_name}
                          size={40}
                          className="flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                          {material.material_name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {formatMaterialType(material.material_type)}
                        </p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 ${colors.border} border flex items-center justify-center flex-shrink-0`} style={{ width: '40px', height: '40px' }}>
                      <MaterialIcon className={`h-10 w-10 ${colors.icon}`} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Metadata */}
                  <div className="space-y-2 text-sm">
                    {material.product_name && (
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Product:</span>
                        <span>{material.product_name}</span>
                      </div>
                    )}
                    {material.universe_name && (
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Universe:</span>
                        <span>{material.universe_name}</span>
                      </div>
                    )}
                    {material.shared_by && (
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                        <User className="h-4 w-4" />
                        <span>Shared by {material.shared_by}</span>
                      </div>
                    )}
                    {material.shared_at && (
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        <span>Shared {new Date(material.shared_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{material.access_count} views</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Download className="h-3 w-3" />
                      <span>{material.download_count} downloads</span>
                    </span>
                  </div>

                  {/* Expiration Warning */}
                  {isExpired && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 text-xs text-yellow-800 dark:text-yellow-300">
                      <Clock className="h-3 w-3 inline mr-1" />
                      This link has expired
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleFavorite(material)
                    }}
                    disabled={toggleFavoriteMutation.isPending}
                    className={`p-2.5 rounded-lg transition-all flex-shrink-0 border ${
                      material.is_favorite
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-800 hover:text-yellow-500 shadow-sm'
                    } ${toggleFavoriteMutation.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    title={material.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    aria-label={material.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star 
                      className={`h-5 w-5 transition-all ${
                        material.is_favorite 
                          ? 'fill-current' 
                          : ''
                      }`}
                    />
                  </button>
                  <a
                    href={`/share/${material.share_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ovh-secondary flex-1 flex items-center justify-center space-x-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </a>
                  <button
                    onClick={() => handleDownload(material)}
                    disabled={isExpired}
                    className="btn-ovh-primary flex-1 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
