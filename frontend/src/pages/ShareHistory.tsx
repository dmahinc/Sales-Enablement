import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link as LinkIcon, Mail, User, Calendar, Eye, Copy, ExternalLink, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ShareHistory() {
  const [filterType, setFilterType] = useState<'all' | 'by-material' | 'by-customer'>('all')
  const [materialFilter, setMaterialFilter] = useState<number | null>(null)
  const [customerFilter, setCustomerFilter] = useState<string>('')

  const { data: sharedLinks, isLoading } = useQuery({
    queryKey: ['shared-links', materialFilter, customerFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (materialFilter) params.append('material_id', materialFilter.toString())
      if (customerFilter) params.append('customer_email', customerFilter)
      return api.get(`/shared-links?${params}`).then(res => res.data)
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['shared-links-stats'],
    queryFn: () => api.get('/shared-links/stats/overview').then(res => res.data),
  })

  const { data: materialStats } = useQuery({
    queryKey: ['shared-links-material-stats'],
    queryFn: () => api.get('/shared-links/stats/materials?limit=10').then(res => res.data),
  })

  const { data: customerStats } = useQuery({
    queryKey: ['shared-links-customer-stats'],
    queryFn: () => api.get('/shared-links/stats/customers?limit=10').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading share history...</span>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-700">Document Sharing History</h1>
        <p className="mt-1 text-slate-500">Track documents shared with customers</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Shares</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.total_shares}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Active Links</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.active_shares}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Expired</p>
            <p className="text-2xl font-semibold text-slate-400">{stats.expired_shares}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Accesses</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.total_accesses}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Unique Customers</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.unique_customers}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="input-ovh w-auto"
          >
            <option value="all">All Shares</option>
            <option value="by-material">By Material</option>
            <option value="by-customer">By Customer</option>
          </select>
          {filterType === 'by-customer' && (
            <input
              type="email"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="input-ovh w-auto"
              placeholder="Customer email"
            />
          )}
        </div>
      </div>

      {/* Top Materials */}
      {materialStats && materialStats.length > 0 && (
        <div className="card-ovh">
          <h2 className="text-lg font-semibold text-primary-700 px-6 py-4 border-b border-slate-200">
            Most Shared Materials
          </h2>
          <div className="divide-y divide-slate-100">
            {materialStats.map((stat: any) => (
              <div key={stat.material_id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{stat.material_name}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                      <span>{stat.total_shares} shares</span>
                      <span>{stat.unique_customers} customers</span>
                      <span>{stat.total_accesses} accesses</span>
                    </div>
                  </div>
                  <Link
                    to={`/materials`}
                    className="text-primary-500 hover:text-primary-600 text-sm"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers */}
      {customerStats && customerStats.length > 0 && (
        <div className="card-ovh">
          <h2 className="text-lg font-semibold text-primary-700 px-6 py-4 border-b border-slate-200">
            Top Customers
          </h2>
          <div className="divide-y divide-slate-100">
            {customerStats.map((stat: any) => (
              <div key={stat.customer_email} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{stat.customer_name || stat.customer_email}</p>
                    <p className="text-sm text-slate-500">{stat.customer_email}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                      <span>{stat.total_documents_shared} documents</span>
                      <span>{stat.total_accesses} accesses</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share History Table */}
      <div className="card-ovh overflow-hidden">
        <h2 className="text-lg font-semibold text-primary-700 px-6 py-4 border-b border-slate-200">
          Recent Shares
        </h2>
        {sharedLinks && sharedLinks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Shared</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Accesses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {sharedLinks.map((link: any) => (
                  <tr key={link.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <LinkIcon className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-sm text-slate-900">{link.material_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {link.customer_email ? (
                        <div>
                          <p className="text-sm text-slate-900">{link.customer_name || link.customer_email}</p>
                          <p className="text-xs text-slate-500">{link.customer_email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(link.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(link.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Eye className="w-4 h-4 mr-1" />
                        {link.access_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired(link.expires_at) || !link.is_active ? (
                        <span className="badge-ovh badge-ovh-gray">Expired</span>
                      ) : (
                        <span className="badge-ovh badge-ovh-success">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(link.share_url)
                        }}
                        className="text-primary-500 hover:text-primary-600 p-2"
                        title="Copy link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={link.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:text-primary-600 p-2 ml-2"
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <LinkIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No shares yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Start sharing documents with customers to see them here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
