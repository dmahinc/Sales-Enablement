import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Mail, User, Calendar, Eye, Filter, Download, X, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CustomerEngagementTimeline from '../components/CustomerEngagementTimeline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ShareHistory() {
  const { user } = useAuth()
  const isDirectorOrPMM = user?.role === 'director' || user?.role === 'pmm' || user?.role === 'admin'
  const isSales = user?.role === 'sales'
  
  // Debug logging
  useEffect(() => {
    console.log('ShareHistory: User role:', user?.role, 'isDirectorOrPMM:', isDirectorOrPMM)
  }, [user?.role, isDirectorOrPMM])
  
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
    queryKey: ['shared-links-stats', dateFilterActive ? startDate : null, dateFilterActive ? endDate : null],
    queryFn: () => {
      const params = new URLSearchParams()
      if (dateFilterActive && startDate) {
        params.append('start_date', startDate)
      }
      if (dateFilterActive && endDate) {
        params.append('end_date', endDate)
      }
      const queryString = params.toString()
      return api.get(`/shared-links/stats/overview${queryString ? '?' + queryString : ''}`).then(res => res.data)
    },
  })

  const { data: materialStats } = useQuery({
    queryKey: ['shared-links-material-stats'],
    queryFn: () => api.get('/shared-links/stats/materials?limit=10').then(res => res.data),
  })

  const { data: customerStats } = useQuery({
    queryKey: ['shared-links-customer-stats'],
    queryFn: () => api.get('/shared-links/stats/customers?limit=10').then(res => res.data),
  })

  // Fetch shares over time data (for all users - backend filters by role)
  const { data: sharesOverTime, isLoading: isLoadingSharesOverTime, error: sharesOverTimeError } = useQuery({
    queryKey: ['shares-over-time', dateFilterActive ? startDate : null, dateFilterActive ? endDate : null],
    queryFn: () => {
      const params = new URLSearchParams()
      if (dateFilterActive && startDate) {
        params.append('start_date', startDate)
      }
      if (dateFilterActive && endDate) {
        params.append('end_date', endDate)
      }
      const queryString = params.toString()
      return api.get(`/shared-links/stats/over-time${queryString ? '?' + queryString : ''}`).then(res => res.data)
    },
  })

  // Toggle state for cumulative vs daily view
  const [isCumulative, setIsCumulative] = useState(false)
  
  // Fill in missing dates with 0 for smoother chart display
  const chartData = sharesOverTime?.data ? (() => {
    if (!dateFilterActive || !startDate || !endDate) {
      // If no date filter, return data as-is but ensure downloads_count exists
      return sharesOverTime.data.map((item: any) => ({
        ...item,
        shares_count: item.shares_count || 0,
        downloads_count: item.downloads_count || 0
      }))
    }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const sharesMap = new Map(sharesOverTime.data.map((item: any) => [item.date, item.shares_count || 0]))
    const downloadsMap = new Map(sharesOverTime.data.map((item: any) => [item.date, item.downloads_count || 0]))
    const filledData = []
    
    // Generate all dates in range
    const currentDate = new Date(start)
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      filledData.push({
        date: dateStr,
        shares_count: sharesMap.get(dateStr) || 0,
        downloads_count: downloadsMap.get(dateStr) || 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return filledData
  })() : []
  
  // Calculate cumulative values if toggle is on
  const displayData = isCumulative ? (() => {
    let cumulativeShares = 0
    let cumulativeDownloads = 0
    return chartData.map((item: any) => {
      cumulativeShares += item.shares_count || 0
      cumulativeDownloads += item.downloads_count || 0
      return {
        ...item,
        shares_count: cumulativeShares,
        downloads_count: cumulativeDownloads
      }
    })
  })() : chartData
  
  // Debug logging for chart data
  useEffect(() => {
    console.log('ShareHistory Chart Debug:', {
      userRole: user?.role,
      sharesOverTime: sharesOverTime,
      chartDataLength: chartData.length,
      displayDataLength: displayData.length,
      isLoading: isLoadingSharesOverTime,
      error: sharesOverTimeError
    })
  }, [sharesOverTime, chartData, displayData, isLoadingSharesOverTime, sharesOverTimeError, user?.role])

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

      {/* Shares Over Time Chart - Available for all users */}
      <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary-700">{isSales ? 'My ' : ''}Shares Over Time</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isCumulative ? 'Cumulative' : 'Daily'} number of {isDirectorOrPMM ? 'shares and downloads' : 'your shares and downloads'} over the selected timeframe
                  {dateFilterActive && startDate && endDate && (
                    <span className="ml-1">({startDate} to {endDate})</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${!isCumulative ? 'text-primary-700 font-medium' : 'text-slate-500'}`}>Daily</span>
                  <button
                    onClick={() => setIsCumulative(!isCumulative)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                      isCumulative ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={isCumulative}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        isCumulative ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className={`text-xs ${isCumulative ? 'text-primary-700 font-medium' : 'text-slate-500'}`}>Cumulative</span>
                </div>
                <TrendingUp className="w-5 h-5 text-primary-500" />
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoadingSharesOverTime ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                <span className="ml-3 text-slate-500">Loading chart data...</span>
              </div>
            ) : sharesOverTimeError ? (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-sm text-slate-500">Error loading chart data</p>
              </div>
            ) : displayData && displayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#0050d7"
                    style={{ fontSize: '12px' }}
                    label={{ value: isCumulative ? 'Cumulative Shares' : 'Number of Shares', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#10b981"
                    style={{ fontSize: '12px' }}
                    label={{ value: isCumulative ? 'Cumulative Downloads' : 'Number of Downloads', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'shares_count') return [value, 'Shares']
                      if (name === 'downloads_count') return [value, 'Downloads']
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="shares_count" 
                    stroke="#0050d7" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#0050d7', strokeWidth: 2 }}
                    name="Shares"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="downloads_count" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2 }}
                    name="Downloads"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-sm text-slate-500">No shares data available for the selected timeframe</p>
              </div>
            )}
          </div>
        </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Shares</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.total_shares}</p>
            {dateFilterActive && (
              <p className="text-xs text-slate-400 mt-1">For selected timeframe</p>
            )}
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Active Links</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.active_shares}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Expired Links</p>
            <p className="text-2xl font-semibold text-slate-400">{stats.expired_shares}</p>
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Views</p>
            <p className="text-2xl font-semibold text-primary-700">{stats.total_accesses}</p>
            {dateFilterActive && (
              <p className="text-xs text-slate-400 mt-1">For selected timeframe</p>
            )}
          </div>
          <div className="card-ovh p-4">
            <p className="text-sm text-slate-500">Total Downloads</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.total_downloads || 0}</p>
            {dateFilterActive && (
              <p className="text-xs text-slate-400 mt-1">For selected timeframe</p>
            )}
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
          <h2 className="text-lg font-semibold text-primary-700">{isSales ? 'My ' : ''}Customer Engagement Timeline</h2>
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
            {isSales ? 'My ' : ''}Most Shared Materials
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
            {isSales ? 'My ' : ''}Top Customers
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
