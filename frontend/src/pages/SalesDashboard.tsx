import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Search,
  Share2,
  TrendingUp,
  ArrowRight,
  Eye,
  Star,
  Filter,
  Sparkles,
  Users,
  Flame,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Download
} from 'lucide-react'
import CustomerEngagementTimeline from '../components/CustomerEngagementTimeline'
import ShareLinkModal from '../components/ShareLinkModal'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SalesDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: () => api.get('/dashboard/sales').then(res => res.data),
  })

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

  // Fetch shares over time data
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

  // Recommendations
  const { data: recommendationsData, isLoading: recoLoading } = useQuery({
    queryKey: ['recommendations-for-you'],
    queryFn: () => api.get('/recommendations/for-you?limit=8').then(res => res.data),
  })

  const [shareMaterial, setShareMaterial] = useState<any>(null)

  // Toggle state for cumulative vs daily view
  const [isCumulative, setIsCumulative] = useState(false)
  
  // Fill in missing dates with 0 for smoother chart display
  const chartData = sharesOverTime?.data ? (() => {
    if (!dateFilterActive || !startDate || !endDate) {
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

  const stats = [
    {
      name: 'Available Materials',
      value: data?.available_materials?.total || 0,
      icon: FileText,
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50',
      link: '/materials'
    },
    {
      name: 'Recently Viewed',
      value: data?.recently_viewed?.length || 0,
      icon: Eye,
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50',
      link: '/materials'
    },
    {
      name: 'Popular Materials',
      value: data?.popular_materials?.length || 0,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      link: '/materials'
    },
    {
      name: 'Material Types',
      value: Object.keys(data?.available_materials?.by_type || {}).length || 0,
      icon: Filter,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      link: '/materials'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700 font-display">Sales Dashboard</h1>
          <p className="mt-1 text-slate-500">Discover and share materials with prospects and customers</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <span className="ml-3 text-slate-500">Loading sales dashboard...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card-ovh p-6 text-center">
          <p className="text-sm text-slate-500">Error loading dashboard. Please try refreshing the page.</p>
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="card-ovh p-6 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-primary-700">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-primary-500 group-hover:text-primary-600">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>
      )}

      {/* Recommended for You */}
      {!isLoading && !error && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-400">Recommended for You</h2>
            </div>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="px-6 py-4">
            {recoLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl h-40" />
                ))}
              </div>
            ) : recommendationsData?.results?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendationsData.results.map((item: any) => {
                  const reasonIcon = item.reason?.includes('peers') ? Users
                    : item.reason?.includes('Similar') ? Sparkles
                    : item.reason?.includes('Trending') ? Flame
                    : Star
                  const ReasonIcon = reasonIcon
                  const typeLabel = (item.material_type || '').replace(/_/g, ' ').replace(/product /i, '')
                  return (
                    <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-all duration-200 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {typeLabel}
                        </span>
                        <button
                          onClick={() => setShareMaterial(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 flex-1">{item.name}</h3>
                      {item.product_name && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{item.product_name}</p>
                      )}
                      <div className="mt-3 flex items-center gap-1.5">
                        <ReasonIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.reason}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                Share materials with customers to start getting personalised recommendations.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareMaterial && (
        <ShareLinkModal
          materialId={shareMaterial.id}
          materialName={shareMaterial.name}
          isOpen={true}
          onClose={() => setShareMaterial(null)}
        />
      )}

      {/* Shares Over Time Chart */}
      {!isLoading && !error && (
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary-700">My Shares Over Time</h2>
              <p className="text-sm text-slate-500 mt-1">
                {isCumulative ? 'Cumulative' : 'Daily'} number of your shares and downloads over the selected timeframe
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
      )}

      {/* Customer Engagement Timeline */}
      {!isLoading && !error && (
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-700">Customer Engagement Timeline</h2>
            <p className="text-sm text-slate-500 mt-1">Track when materials are shared, viewed, and downloaded by customers</p>
          </div>
          <Link to="/sharing" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="p-6">
          <CustomerEngagementTimeline limit={20} />
        </div>
      </div>
      )}

      {/* Content Grid */}
      {!isLoading && !error && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Materials */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-700">Popular Materials</h2>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.popular_materials && data.popular_materials.length > 0 ? (
              data.popular_materials.map((material: any) => (
                <div key={material.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{material.name}</p>
                      <p className="text-xs text-slate-500">
                        {material.material_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-700">{material.usage_count}</p>
                      <p className="text-xs text-slate-500">shares</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Star className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No popular materials yet</p>
                <Link to="/materials" className="mt-4 btn-ovh-primary inline-flex">
                  Explore materials
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recently Viewed */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-700">Recently Viewed</h2>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recently_viewed && data.recently_viewed.length > 0 ? (
              data.recently_viewed.map((material: any) => (
                <div key={material.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-50 p-2 rounded-lg">
                      <Eye className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{material.name}</p>
                      <p className="text-xs text-slate-500">
                        {material.material_type}
                      </p>
                      {material.viewed_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(material.viewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/materials/${material.id}`}
                      className="text-primary-500 hover:text-primary-600"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Eye className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No recently viewed materials</p>
                <Link to="/materials" className="mt-4 btn-ovh-primary inline-flex">
                  Start exploring
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Quick Actions */}
      {!isLoading && !error && (
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-primary-700">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/materials"
            className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
          >
            <div className="bg-primary-100 p-3 rounded-lg mr-4">
              <Search className="h-6 w-6 text-primary-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600">
                Explore Materials
              </h3>
              <p className="text-xs text-slate-500">Browse materials by product, type, or search</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link
            to="/sharing"
            className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
          >
            <div className="bg-emerald-100 p-3 rounded-lg mr-4">
              <Share2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-900 group-hover:text-emerald-600">
                Share Materials
              </h3>
              <p className="text-xs text-slate-500">Generate shareable links for prospects</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
      )}

      {/* Materials by Type */}
      {!isLoading && !error && data?.available_materials?.by_type && Object.keys(data.available_materials.by_type).length > 0 && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Browse by Material Type</h2>
            <p className="text-sm text-slate-500 mt-1">Quick access to materials by category</p>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Object.entries(data.available_materials.by_type).map(([type, count]: [string, any]) => (
              <Link
                key={type}
                to={`/materials?type=${encodeURIComponent(type)}`}
                className="p-4 bg-slate-50 rounded-lg hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-all group"
              >
                <p className="text-sm font-medium text-slate-700 group-hover:text-primary-700">{type}</p>
                <p className="text-xs text-slate-500 mt-1">{count} available</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
