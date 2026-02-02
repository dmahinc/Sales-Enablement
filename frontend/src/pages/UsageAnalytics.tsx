import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Download, 
  Eye, 
  FileText,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  X
} from 'lucide-react'

type PeriodType = 'preset' | 'custom'

export default function UsageAnalytics() {
  const [periodType, setPeriodType] = useState<PeriodType>('preset')
  const [days, setDays] = useState(30)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null)

  // Build query parameters based on period type
  const buildQueryParams = () => {
    if (periodType === 'custom' && startDate && endDate) {
      return `start_date=${startDate}&end_date=${endDate}`
    }
    return `days=${days}`
  }

  const queryParams = buildQueryParams()

  const { data: usageRates, isLoading: ratesLoading } = useQuery({
    queryKey: ['usage-rates', periodType, days, startDate, endDate],
    queryFn: () => api.get(`/analytics/usage-rates?${queryParams}`).then(res => res.data),
  })

  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['usage-stats', periodType, days, startDate, endDate],
    queryFn: () => api.get(`/analytics/usage-stats?${queryParams}`).then(res => res.data),
  })

  const { data: materialHistory } = useQuery({
    queryKey: ['material-usage-history', selectedMaterial, periodType, days, startDate, endDate],
    queryFn: () => api.get(`/analytics/material/${selectedMaterial}/usage-history?${queryParams}`).then(res => res.data),
    enabled: selectedMaterial !== null,
  })

  const isLoading = ratesLoading || statsLoading

  // Set default end date to today when switching to custom
  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type)
    if (type === 'custom' && !endDate) {
      const today = new Date().toISOString().split('T')[0]
      setEndDate(today)
      // Set start date to 30 days ago by default
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading usage analytics...</span>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <ArrowUp className="h-4 w-4 text-emerald-500" />
      case 'decreasing':
        return <ArrowDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-400" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-emerald-600 bg-emerald-50'
      case 'decreasing':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Usage Analytics</h1>
          <p className="mt-1 text-slate-500">Monitor material usage rates and trends</p>
        </div>
        <div className="mt-4 sm:mt-0">
          {/* Period Type Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handlePeriodTypeChange('preset')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  periodType === 'preset'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                Preset
              </button>
              <button
                onClick={() => handlePeriodTypeChange('custom')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  periodType === 'custom'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                Custom
              </button>
            </div>

            {periodType === 'preset' ? (
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="input-ovh w-auto"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
              </select>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    className="input-ovh w-auto"
                  />
                </div>
                <span className="text-slate-400">to</span>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="input-ovh w-auto"
                  />
                </div>
                {startDate && endDate && (
                  <button
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                    title="Clear dates"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      {usageStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-ovh p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Materials</p>
                <p className="mt-2 text-3xl font-semibold text-primary-700">{usageStats.total_materials}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {usageStats.materials_with_usage} with usage
                </p>
              </div>
              <div className="bg-primary-50 p-3 rounded-xl">
                <FileText className="h-6 w-6 text-primary-500" />
              </div>
            </div>
          </div>

          <div className="card-ovh p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Downloads</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{usageStats.total_downloads}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {usageStats.total_views} views
                </p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl">
                <Download className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="card-ovh p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Usage/Material</p>
                <p className="mt-2 text-3xl font-semibold text-violet-700">{usageStats.average_usage_per_material}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Per material average
                </p>
              </div>
              <div className="bg-violet-50 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </div>

          <div className="card-ovh p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Usage Rate</p>
                <p className="mt-2 text-3xl font-semibold text-amber-700">
                  {usageStats.materials_with_usage > 0 
                    ? Math.round((usageStats.materials_with_usage / usageStats.total_materials) * 100)
                    : 0}%
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Materials being used
                </p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl">
                <Activity className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Rates Table */}
      <div className="card-ovh overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-primary-700">Material Usage Rates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usage statistics and trends for all materials
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Daily Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Weekly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Monthly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usageRates && usageRates.length > 0 ? (
                usageRates.map((rate: any) => (
                  <tr 
                    key={rate.material_id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedMaterial(rate.material_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{rate.material_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{rate.total_usage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{rate.daily_usage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{rate.weekly_usage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{rate.monthly_usage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTrendColor(rate.usage_trend)}`}>
                        {getTrendIcon(rate.usage_trend)}
                        <span className="ml-1 capitalize">{rate.usage_trend}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {rate.last_used 
                          ? new Date(rate.last_used).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No usage data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage by Type and Universe */}
      {usageStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage by Type */}
          <div className="card-ovh">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-primary-700">Usage by Material Type</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {usageStats.usage_by_type && usageStats.usage_by_type.length > 0 ? (
                  usageStats.usage_by_type.map((item: any, index: number) => {
                    const maxUsage = Math.max(...usageStats.usage_by_type.map((u: any) => u.total_usage))
                    const percentage = maxUsage > 0 ? (item.total_usage / maxUsage) * 100 : 0
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{item.material_type?.replace(/_/g, ' ') || 'Unknown'}</span>
                          <span className="text-slate-900 font-medium">{item.total_usage}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500">No usage data by type</p>
                )}
              </div>
            </div>
          </div>

          {/* Usage by Universe */}
          <div className="card-ovh">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-primary-700">Usage by Universe</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {usageStats.usage_by_universe && usageStats.usage_by_universe.length > 0 ? (
                  usageStats.usage_by_universe.map((item: any, index: number) => {
                    const maxUsage = Math.max(...usageStats.usage_by_universe.map((u: any) => u.total_usage))
                    const percentage = maxUsage > 0 ? (item.total_usage / maxUsage) * 100 : 0
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{item.universe_name}</span>
                          <span className="text-slate-900 font-medium">{item.total_usage}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500">No usage data by universe</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Most Used Materials */}
      {usageStats && usageStats.most_used_materials && usageStats.most_used_materials.length > 0 && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Most Used Materials</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {usageStats.most_used_materials.map((material: any, index: number) => (
              <div key={material.id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-sm font-semibold text-primary-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{material.name}</p>
                      <p className="text-xs text-slate-500">
                        {material.material_type?.replace(/_/g, ' ')} • {material.universe_name || 'No Universe'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary-700">{material.usage_count}</p>
                    <p className="text-xs text-slate-500">downloads</p>
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
