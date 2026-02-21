import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { CheckCircle, XCircle, RefreshCw, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import ProductIcon from './ProductIcon'

interface MaterialTypeStatus {
  has_material: boolean
  material_count: number
  latest_material_date: string | null
}

interface ProductCompletenessRow {
  product_id: number
  product_name: string
  product_display_name: string
  universe_id: number
  universe_name: string
  category_id: number | null
  category_name: string | null
  material_types: {
    PRODUCT_BRIEF: MaterialTypeStatus
    PRODUCT_SALES_ENABLEMENT_DECK: MaterialTypeStatus
    PRODUCT_SALES_DECK: MaterialTypeStatus
    PRODUCT_DATASHEET: MaterialTypeStatus
  }
  other_materials_count?: number
  product_completeness: number
}

interface CompletenessMatrixData {
  overall_score: number
  total_products: number
  total_material_types: number
  total_combinations: number
  filled_combinations: number
  by_universe: Array<{
    universe_id: number
    universe_name: string
    score: number
    freshness_score?: number
    age_distribution?: {
      fresh: number
      recent: number
      aging: number
      stale: number
      very_stale: number
      no_date: number
    }
    total_materials?: number
    total_products: number
    filled_combinations: number
    total_combinations: number
  }>
  by_category: Array<{
    category_id: number
    category_name: string
    universe_id: number
    score: number
    total_products: number
    filled_combinations: number
    total_combinations: number
  }>
  matrix: ProductCompletenessRow[]
}

// Material type display names
const MATERIAL_TYPE_LABELS: Record<string, string> = {
  PRODUCT_BRIEF: 'Product Brief',
  PRODUCT_SALES_ENABLEMENT_DECK: 'Sales Enablement Deck',
  PRODUCT_SALES_DECK: 'Sales Deck',
  PRODUCT_DATASHEET: 'Datasheet'
}

// Material type short labels for table headers
const MATERIAL_TYPE_SHORT: Record<string, string> = {
  PRODUCT_BRIEF: 'Brief',
  PRODUCT_SALES_ENABLEMENT_DECK: 'Enable',
  PRODUCT_SALES_DECK: 'Sales',
  PRODUCT_DATASHEET: 'Data'
}

export default function ProductCompletenessMatrix() {
  const [selectedUniverse, setSelectedUniverse] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [expandedUniverses, setExpandedUniverses] = useState<Set<number>>(new Set())

  const { data, isLoading, error, refetch } = useQuery<CompletenessMatrixData>({
    queryKey: ['completeness-matrix', selectedUniverse, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedUniverse) params.append('universe_id', selectedUniverse.toString())
      if (selectedCategory) params.append('category_id', selectedCategory.toString())
      return api.get(`/health/completeness-matrix?${params.toString()}`).then(res => res.data)
    },
  })

  // Get unique universes and categories for filters
  const universes = useMemo(() => {
    if (!data) return []
    const universeMap = new Map<number, { id: number; name: string }>()
    data.matrix.forEach(row => {
      if (!universeMap.has(row.universe_id)) {
        universeMap.set(row.universe_id, {
          id: row.universe_id,
          name: row.universe_name
        })
      }
    })
    return Array.from(universeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const categories = useMemo(() => {
    if (!data) return []
    const categoryMap = new Map<number, { id: number; name: string; universe_id: number }>()
    data.matrix.forEach(row => {
      if (row.category_id && !categoryMap.has(row.category_id)) {
        categoryMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name || 'Uncategorized',
          universe_id: row.universe_id
        })
      }
    })
    return Array.from(categoryMap.values())
      .filter(cat => !selectedUniverse || cat.universe_id === selectedUniverse)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data, selectedUniverse])

  // Filter and group matrix data
  const filteredMatrix = useMemo(() => {
    if (!data) return []

    let filtered = data.matrix

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(row =>
        row.product_name.toLowerCase().includes(query) ||
        row.product_display_name.toLowerCase().includes(query) ||
        row.universe_name.toLowerCase().includes(query) ||
        (row.category_name && row.category_name.toLowerCase().includes(query))
      )
    }

    // Filter by incomplete only
    if (showIncompleteOnly) {
      filtered = filtered.filter(row => row.product_completeness < 100)
    }

    return filtered
  }, [data, searchQuery, showIncompleteOnly])

  // Group by universe
  const groupedByUniverse = useMemo(() => {
    const groups = new Map<number, ProductCompletenessRow[]>()
    filteredMatrix.forEach(row => {
      if (!groups.has(row.universe_id)) {
        groups.set(row.universe_id, [])
      }
      groups.get(row.universe_id)!.push(row)
    })
    return groups
  }, [filteredMatrix])

  const toggleUniverse = (universeId: number) => {
    const newExpanded = new Set(expandedUniverses)
    if (newExpanded.has(universeId)) {
      newExpanded.delete(universeId)
    } else {
      newExpanded.add(universeId)
    }
    setExpandedUniverses(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading completeness matrix...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-ovh p-6 text-center">
        <p className="text-red-600">Error loading completeness matrix. Please try again.</p>
        <button onClick={() => refetch()} className="btn-ovh-primary mt-4">
          Retry
        </button>
      </div>
    )
  }

  if (!data || data.matrix.length === 0) {
    return (
      <div className="card-ovh p-6 text-center">
        <p className="text-slate-500">No product data available.</p>
      </div>
    )
  }

  const getScoreColorClasses = (score: number) => {
    if (score >= 70) return { text: 'text-emerald-600', bg: 'bg-emerald-500', bgLight: 'bg-emerald-100', textDark: 'text-emerald-700' }
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-100', textDark: 'text-amber-700' }
    return { text: 'text-red-600', bg: 'bg-red-500', bgLight: 'bg-red-100', textDark: 'text-red-700' }
  }

  const scoreColorClasses = getScoreColorClasses(data.overall_score)
  const materialTypeKeys = Object.keys(MATERIAL_TYPE_LABELS) as Array<keyof typeof MATERIAL_TYPE_LABELS>

  return (
    <div className="space-y-6">
      {/* Header with Overall Score */}
      <div className="card-ovh p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-primary-700">Product-Material Type Completeness</h2>
            <p className="text-sm text-slate-500 mt-1">
              Coverage of essential materials across products
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-ovh-secondary mt-4 md:mt-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Overall Score */}
          <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className={`text-4xl font-bold ${scoreColorClasses.text}`}>
              {data.overall_score.toFixed(1)}%
            </div>
            <div>
              <div className="text-sm text-slate-600">Overall Completeness</div>
              <div className="text-xs text-slate-500">
                {data.filled_combinations} / {data.total_combinations} combinations
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`${scoreColorClasses.bg} h-3 rounded-full transition-all`}
                style={{ width: `${data.overall_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Summary by Universe */}
        {data.by_universe.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3">By Universe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.by_universe.map(universe => {
                const completenessColorClasses = getScoreColorClasses(universe.score)
                const ageDist = universe.age_distribution || {
                  fresh: 0,
                  recent: 0,
                  aging: 0,
                  stale: 0,
                  very_stale: 0,
                  no_date: 0
                }
                // Calculate total materials with dates (excluding no_date)
                const totalWithDate = ageDist.fresh + ageDist.recent + ageDist.aging + ageDist.stale + ageDist.very_stale
                const ageLabels = {
                  fresh: 'Fresh (0-30 days)',
                  recent: 'Recent (31-90 days)',
                  aging: 'Aging (91-180 days)',
                  stale: 'Stale (181-365 days)',
                  very_stale: 'Very Stale (>365 days)'
                  // Note: 'no_date' is excluded from display
                }
                const ageColors = {
                  fresh: 'bg-emerald-500',
                  recent: 'bg-blue-500',
                  aging: 'bg-amber-500',
                  stale: 'bg-orange-500',
                  very_stale: 'bg-red-500'
                  // Note: 'no_date' color removed as it's not displayed
                }
                
                return (
                  <div key={universe.universe_id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs font-medium text-slate-700 mb-3">{universe.universe_name}</div>
                    
                    {/* Completeness Score */}
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 mb-1">Completeness</div>
                      <div className={`text-xl font-bold ${completenessColorClasses.text}`}>
                        {universe.score.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {universe.filled_combinations} / {universe.total_combinations} combinations
                      </div>
                      {universe.total_materials !== undefined && (
                        <div className="text-xs text-slate-400 mt-1">
                          Total materials: {universe.total_materials}
                        </div>
                      )}
                    </div>
                    
                    {/* Age Distribution */}
                    {universe.age_distribution && (
                      <div className="pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500 mb-2">Age Distribution</div>
                        <div className="space-y-1.5">
                          {Object.entries(ageLabels).map(([key, label]) => {
                            const count = ageDist[key as keyof typeof ageDist] || 0
                            const percentage = totalWithDate > 0 
                              ? (count / totalWithDate) * 100 
                              : 0
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs text-slate-600">{label}</span>
                                  <span className="text-xs font-semibold text-slate-900">{count}</span>
                                </div>
                                {count > 0 && (
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div 
                                      className={`${ageColors[key as keyof typeof ageColors]} h-1.5 rounded-full transition-all`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedUniverse || ''}
              onChange={(e) => {
                setSelectedUniverse(e.target.value ? parseInt(e.target.value) : null)
                setSelectedCategory(null) // Reset category when universe changes
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Universes</option>
              {universes.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!selectedUniverse}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showIncompleteOnly}
              onChange={(e) => setShowIncompleteOnly(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Show incomplete only</span>
          </label>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="card-ovh overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                  Product
                </th>
                {materialTypeKeys.map(type => (
                  <th
                    key={type}
                    className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[100px]"
                    title={MATERIAL_TYPE_LABELS[type]}
                  >
                    <div className="flex flex-col items-center">
                      <span>{MATERIAL_TYPE_SHORT[type]}</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-1">
                        {MATERIAL_TYPE_LABELS[type]}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[80px]">
                  Other
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[80px]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.from(groupedByUniverse.entries()).map(([universeId, rows]) => {
                const universe = data.by_universe.find(u => u.universe_id === universeId)
                const isExpanded = expandedUniverses.has(universeId)
                const universeRows = rows.sort((a, b) => {
                  // Sort by category name, then product name
                  if (a.category_name && b.category_name) {
                    const catCompare = a.category_name.localeCompare(b.category_name)
                    if (catCompare !== 0) return catCompare
                  }
                  return a.product_display_name.localeCompare(b.product_display_name)
                })

                return (
                  <React.Fragment key={universeId}>
                    {/* Universe Header Row */}
                    <tr className="bg-slate-100 hover:bg-slate-150 cursor-pointer" onClick={() => toggleUniverse(universeId)}>
                      <td colSpan={materialTypeKeys.length + 3} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                            <span className="font-semibold text-slate-900">
                              {rows[0]?.universe_name || 'Unknown'}
                            </span>
                            {universe && (
                              <span className="text-sm text-slate-600">
                                ({universe.total_products} products, {universe.score.toFixed(1)}% complete)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Product Rows */}
                    {isExpanded && universeRows.map((row) => {
                      const rowColorClasses = getScoreColorClasses(row.product_completeness)
                      return (
                        <tr key={row.product_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <ProductIcon 
                                  productName={row.product_display_name}
                                  size={28}
                                  className="text-slate-700"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900">{row.product_display_name}</div>
                                {row.category_name && (
                                  <div className="text-xs text-slate-500">{row.category_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {materialTypeKeys.map(type => {
                            const status = row.material_types[type as keyof typeof row.material_types]
                            return (
                              <td
                                key={type}
                                className="px-4 py-3 text-center"
                                title={
                                  status.has_material
                                    ? `${status.material_count} material(s)${status.latest_material_date ? `\nLast updated: ${new Date(status.latest_material_date).toLocaleDateString()}` : ''}`
                                    : 'No material'
                                }
                              >
                                {status.has_material ? (
                                  <div className="flex flex-col items-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    {status.material_count > 1 && (
                                      <span className="text-xs text-slate-500 mt-1">{status.material_count}</span>
                                    )}
                                  </div>
                                ) : (
                                  <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center">
                            {row.other_materials_count && row.other_materials_count > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold text-slate-700">{row.other_materials_count}</span>
                                <span className="text-xs text-slate-500">material{row.other_materials_count !== 1 ? 's' : ''}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${rowColorClasses.bgLight} ${rowColorClasses.textDark}`}>
                              {row.product_completeness.toFixed(0)}%
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredMatrix.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No products match your filters.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card-ovh p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-600">Has material</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-300" />
            <span className="text-slate-600">Missing material</span>
          </div>
          <div className="text-slate-500">
            Hover over cells for details
          </div>
        </div>
      </div>
    </div>
  )
}
