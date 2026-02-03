import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Search, FileText, Users, Target, Filter, X, Sparkles } from 'lucide-react'

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    type: '',
    universe: '',
    audience: '',
  })
  const [isSearching, setIsSearching] = useState(false)

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then(res => res.data),
  })

  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api.get('/segments').then(res => res.data),
  })

  // Search and filter logic
  const searchResults = () => {
    if (!searchQuery.trim() && !selectedFilters.type && !selectedFilters.universe && !selectedFilters.audience) {
      return { materials: [], personas: [], segments: [] }
    }

    const query = searchQuery.toLowerCase().trim()

    const filteredMaterials = materials?.filter((m: any) => {
      // Text search
      const matchesQuery = !query || 
        m.name?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.product_name?.toLowerCase().includes(query) ||
        m.tags?.some((t: string) => t.toLowerCase().includes(query)) ||
        m.keywords?.some((k: string) => k.toLowerCase().includes(query))
      
      // Filters
      const matchesType = !selectedFilters.type || m.material_type === selectedFilters.type
      const matchesUniverse = !selectedFilters.universe || m.universe_name === selectedFilters.universe
      const matchesAudience = !selectedFilters.audience || m.audience === selectedFilters.audience

      return matchesQuery && matchesType && matchesUniverse && matchesAudience
    }) || []

    const filteredPersonas = !selectedFilters.type && !selectedFilters.universe && !selectedFilters.audience 
      ? personas?.filter((p: any) => 
          !query ||
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.role?.toLowerCase().includes(query)
        ) || []
      : []

    const filteredSegments = !selectedFilters.type && !selectedFilters.universe && !selectedFilters.audience
      ? segments?.filter((s: any) => 
          !query ||
          s.name?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.industry?.toLowerCase().includes(query)
        ) || []
      : []

    return {
      materials: filteredMaterials,
      personas: filteredPersonas,
      segments: filteredSegments,
    }
  }

  const results = searchResults()
  const hasResults = results.materials.length > 0 || results.personas.length > 0 || results.segments.length > 0
  const hasActiveSearch = searchQuery.trim() || selectedFilters.type || selectedFilters.universe || selectedFilters.audience

  const clearFilters = () => {
    setSelectedFilters({ type: '', universe: '', audience: '' })
    setSearchQuery('')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-700">Content Discovery</h1>
        <p className="mt-1 text-slate-500">Search and discover products & solutions enablement content</p>
      </div>

      {/* Search Box */}
      <div className="card-ovh p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search materials, personas, segments..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearching(true)
              setTimeout(() => setIsSearching(false), 300)
            }}
            className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select
            value={selectedFilters.type}
            onChange={(e) => setSelectedFilters({ ...selectedFilters, type: e.target.value })}
            className="input-ovh w-auto text-sm"
          >
            <option value="">All Types</option>
            <option value="product_brief">Product Brief</option>
            <option value="sales_enablement_deck">Sales Enablement Deck</option>
            <option value="product_portfolio">Product Portfolio</option>
            <option value="sales_deck">Sales Deck</option>
            <option value="datasheet">Datasheet</option>
          </select>

          <select
            value={selectedFilters.universe}
            onChange={(e) => setSelectedFilters({ ...selectedFilters, universe: e.target.value })}
            className="input-ovh w-auto text-sm"
          >
            <option value="">All Universes</option>
            <option value="Public Cloud">Public Cloud</option>
            <option value="Private Cloud">Private Cloud</option>
            <option value="Bare Metal">Bare Metal</option>
            <option value="Hosting & Collaboration">Hosting & Collaboration</option>
          </select>

          <select
            value={selectedFilters.audience}
            onChange={(e) => setSelectedFilters({ ...selectedFilters, audience: e.target.value })}
            className="input-ovh w-auto text-sm"
          >
            <option value="">All Audiences</option>
            <option value="internal">Internal</option>
            <option value="customer_facing">Customer Facing</option>
            <option value="shared_asset">Shared Asset</option>
          </select>

          {hasActiveSearch && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary-500 hover:text-primary-600 flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {!hasActiveSearch ? (
        <div className="card-ovh p-12 text-center">
          <div className="bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Start Your Discovery</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Search for materials by name, description, tags, or keywords. You can also filter by type, universe, or audience.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSearchQuery('cloud')}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              cloud
            </button>
            <button
              onClick={() => setSearchQuery('security')}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              security
            </button>
            <button
              onClick={() => setSearchQuery('storage')}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              storage
            </button>
            <button
              onClick={() => setSearchQuery('kubernetes')}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              kubernetes
            </button>
          </div>
        </div>
      ) : isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <span className="ml-3 text-slate-500">Searching...</span>
        </div>
      ) : !hasResults ? (
        <div className="card-ovh p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No Results Found</h3>
          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your search terms or filters
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Materials Results */}
          {results.materials.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-primary-700">
                  Materials ({results.materials.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.materials.map((material: any) => (
                  <div key={material.id} className="card-ovh p-4 hover:shadow-md transition-all group">
                    <div className="flex items-start space-x-4">
                      <div className="bg-primary-50 p-2 rounded-lg">
                        <FileText className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600 truncate">
                          {material.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {material.material_type?.replace(/_/g, ' ')} • {material.universe_name || 'No Universe'}
                        </p>
                        {material.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{material.description}</p>
                        )}
                        {material.tags && material.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {material.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="badge-ovh badge-ovh-primary">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personas Results */}
          {results.personas.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-primary-700">
                  Personas ({results.personas.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.personas.map((persona: any) => (
                  <div key={persona.id} className="card-ovh p-4 hover:shadow-md transition-all group">
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <Users className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 group-hover:text-emerald-600">
                          {persona.name}
                        </h3>
                        <p className="text-xs text-slate-500">{persona.role}</p>
                      </div>
                    </div>
                    {persona.description && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{persona.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments Results */}
          {results.segments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-primary-700">
                  Segments ({results.segments.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.segments.map((segment: any) => (
                  <div key={segment.id} className="card-ovh p-4 hover:shadow-md transition-all group">
                    <div className="flex items-center space-x-3">
                      <div className="bg-violet-50 p-2 rounded-lg">
                        <Target className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 group-hover:text-violet-600">
                          {segment.name}
                        </h3>
                        <p className="text-xs text-slate-500">{segment.industry}</p>
                      </div>
                    </div>
                    {segment.description && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{segment.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
