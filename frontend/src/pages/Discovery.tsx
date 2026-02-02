import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Search } from 'lucide-react'

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'keywords' | 'use_case' | 'pain_point'>('keywords')

  const { data: searchResults, refetch, isLoading } = useQuery({
    queryKey: ['discovery-search', searchQuery, searchType],
    queryFn: () => {
      const params: any = { q: searchQuery }
      if (searchType === 'use_case') params.use_case = searchQuery
      else if (searchType === 'pain_point') params.pain_point = searchQuery
      return api.get('/discovery/search', { params }).then(res => res.data)
    },
    enabled: false,
  })

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetch()
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Narrative Discovery</h1>
          <p className="mt-2 text-sm text-gray-700">
            Search for existing narratives by keywords, use cases, or pain points
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="search-type" className="block text-sm font-medium text-gray-700 mb-2">
                Search Type
              </label>
              <select
                id="search-type"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="keywords">Keywords</option>
                <option value="use_case">Use Case</option>
                <option value="pain_point">Pain Point</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="search-query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter search term..."
                />
                <button
                  onClick={handleSearch}
                  className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 text-center py-12">
            <p className="text-sm text-gray-500">Searching...</p>
          </div>
        )}

        {searchResults && !isLoading && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Results ({searchResults.total || searchResults.length || 0})
            </h2>
            {searchResults.results && searchResults.results.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {searchResults.results.map((result: any, idx: number) => (
                    <li key={result.material_id || result.id || idx} className="hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-sm text-gray-500">
                              {result.material_type} • {result.product_name || 'N/A'}
                            </p>
                            {result.description && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{result.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {result.use_cases && Array.isArray(result.use_cases) && result.use_cases.length > 0 && (
                                <>
                                  {result.use_cases.map((uc: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {uc}
                                    </span>
                                  ))}
                                </>
                              )}
                              {result.tags && Array.isArray(result.tags) && result.tags.length > 0 && (
                                <>
                                  {result.tags.map((tag: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {tag}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-sm text-gray-500">
                              Usage: {result.usage_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {searchResults.map((result: any, idx: number) => (
                    <li key={result.id || idx} className="hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-sm text-gray-500">
                              {result.material_type} • {result.product_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-12 bg-white shadow rounded-md">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                <p className="mt-1 text-sm text-gray-500">Try different search terms or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
