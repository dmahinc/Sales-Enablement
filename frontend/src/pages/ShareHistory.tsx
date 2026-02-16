import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Mail, User, Calendar, Eye, Filter, Download, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import CustomerEngagementTimeline from '../components/CustomerEngagementTimeline'

export default function ShareHistory() {
  // Initialize with default dates (last 30 days)
  const getDefaultDates = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    }
  }
  
  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState<string>(defaultDates.start)
  const [endDate, setEndDate] = useState<string>(defaultDates.end)
  const [dateFilterActive, setDateFilterActive] = useState<boolean>(true)

  const [filterType, setFilterType] = useState<'all' | 'by-material' | 'by-customer'>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('')

  // Auto-apply filter when both dates are set
  useEffect(() => {
    if (startDate && endDate && !dateFilterActive) {
      setDateFilterActive(true)
    }
  }, [startDate, endDate, dateFilterActive])

  const handleDateFilterApply = () => {
    if (startDate && endDate) {
      setDateFilterActive(true)
    }
  }

  const handleDateFilterClear = () => {
    const defaultDates = getDefaultDates()
    setStartDate(defaultDates.start)
    setEndDate(defaultDates.end)
    setDateFilterActive(true) // Keep filter active with defaults
  }

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

  return (
    <div className="space-y-8">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Document Sharing History</h1>
          <p className="mt-1 text-slate-500">Track documents shared with customers</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-600 whitespace-nowrap">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-600 whitespace-nowrap">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDateFilterApply}
              disabled={!startDate || !endDate}
              className="btn-ovh-primary text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            {(dateFilterActive || startDate || endDate) && (
              <button
                onClick={handleDateFilterClear}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <p className="text-sm text-slate-500">Total Views</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.total_accesses}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Downloads</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.total_downloads || 0}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Unique Customers</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.unique_customers}</p>
          </div>
        </div>
      )}

      {/* Customer Engagement Timeline */}
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-primary-700">Customer Engagement Timeline</h2>
          <p className="text-sm text-slate-500 mt-1">Chronological view of when materials were shared, viewed, and downloaded by customers</p>
        </div>
        <div className="p-6">
          <CustomerEngagementTimeline 
            limit={30}
            startDate={dateFilterActive && startDate ? startDate : undefined}
            endDate={dateFilterActive && endDate ? endDate : undefined}
          />
        </div>
      </div>

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
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {stat.total_accesses} views
                      </span>
                      <span className="flex items-center">
                        <Download className="w-3 h-3 mr-1" />
                        {stat.total_downloads || 0} downloads
                      </span>
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
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {stat.total_accesses} views
                      </span>
                      <span className="flex items-center">
                        <Download className="w-3 h-3 mr-1" />
                        {stat.total_downloads || 0} downloads
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
