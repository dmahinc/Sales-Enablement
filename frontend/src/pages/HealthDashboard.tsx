import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react'
import ProductCompletenessMatrix from '../components/ProductCompletenessMatrix'

export default function HealthDashboard() {
  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => api.get('/health/dashboard').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading health data...</span>
      </div>
    )
  }

  const stats = healthData?.statistics || {}
  const freshnessMetrics = healthData?.freshness_metrics || {}
  const completenessMetrics = healthData?.completeness_metrics || {}
  const usageMetrics = healthData?.usage_metrics || {}
  const ageDist = freshnessMetrics.age_distribution || {}

  const totalMaterials = stats.total_materials || 0
  const overallHealth = stats.average_health_score || 0
  const healthColor = overallHealth >= 70 ? 'emerald' : overallHealth >= 40 ? 'amber' : 'red'

  // Age distribution labels
  const ageLabels = {
    fresh: 'Fresh (0-30 days)',
    recent: 'Recent (31-90 days)',
    aging: 'Aging (91-180 days)',
    stale: 'Stale (181-365 days)',
    very_stale: 'Very Stale (>365 days)',
    no_date: 'No Date'
  }

  const ageColors = {
    fresh: 'bg-emerald-500',
    recent: 'bg-blue-500',
    aging: 'bg-amber-500',
    stale: 'bg-orange-500',
    very_stale: 'bg-red-500',
    no_date: 'bg-slate-400'
  }

  const totalWithDate = totalMaterials - (ageDist.no_date || 0)
  const maxAgeCount = Math.max(...Object.values(ageDist).filter((v: any) => typeof v === 'number') as number[], 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Health Dashboard</h1>
          <p className="mt-1 text-slate-500">Detailed health metrics for sales materials</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="btn-ovh-secondary mt-4 sm:mt-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Overall Health Score - Only for Directors */}
      <div className="card-ovh p-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-lg font-medium text-slate-600">Overall Health Score</h2>
            <p className="text-sm text-slate-400 mt-1">Weighted average of freshness, completeness, and usage</p>
          </div>
          <div className="flex items-center space-x-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={healthColor === 'emerald' ? '#10b981' : healthColor === 'amber' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${overallHealth * 3.52} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold text-${healthColor}-500`}>{Math.round(overallHealth)}%</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center space-x-2">
                {overallHealth >= 70 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm font-medium text-${healthColor}-600`}>
                  {overallHealth >= 70 ? 'Good Health' : overallHealth >= 40 ? 'Needs Attention' : 'Critical'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {totalMaterials} total materials
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Metrics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Freshness Score with Age Distribution */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Freshness Score</h2>
            <p className="text-sm text-slate-500 mt-1">Material age distribution</p>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Average Score</span>
                <span className="text-2xl font-bold text-primary-700">
                  {Math.round(freshnessMetrics.average_score || 0)}%
                </span>
              </div>
              {freshnessMetrics.quartiles && (
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Q1 (25th percentile):</span>
                    <span className="font-medium">{freshnessMetrics.quartiles.q1}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Q2 (Median):</span>
                    <span className="font-medium">{freshnessMetrics.quartiles.q2}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Q3 (75th percentile):</span>
                    <span className="font-medium">{freshnessMetrics.quartiles.q3}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(ageLabels).map(([key, label]) => {
                const count = ageDist[key as keyof typeof ageDist] || 0
                const percentage = totalWithDate > 0 ? (count / totalWithDate) * 100 : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{label}</span>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`${ageColors[key as keyof typeof ageColors]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Completeness Score with Quartiles */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Completeness Score</h2>
            <p className="text-sm text-slate-500 mt-1">Material metadata completeness</p>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Average Score</span>
                <span className="text-2xl font-bold text-primary-700">
                  {Math.round(completenessMetrics.average_score || 0)}%
                </span>
              </div>
              {completenessMetrics.quartiles && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Q1 (25th percentile)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {completenessMetrics.quartiles.q1}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border-2 border-primary-200">
                    <span className="text-sm font-medium text-primary-700">Q2 (Median)</span>
                    <span className="text-lg font-bold text-primary-700">
                      {completenessMetrics.quartiles.q2}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Q3 (75th percentile)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {completenessMetrics.quartiles.q3}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Interpretation:</strong> Materials above Q3 ({completenessMetrics.quartiles?.q3 || 0}%) are well-documented. 
                Materials below Q1 ({completenessMetrics.quartiles?.q1 || 0}%) need attention.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Score with Quartiles */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Usage Score</h2>
            <p className="text-sm text-slate-500 mt-1">Material access and sharing frequency</p>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Average Score</span>
                <span className="text-2xl font-bold text-primary-700">
                  {Math.round(usageMetrics.average_score || 0)}%
                </span>
              </div>
              {usageMetrics.quartiles && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Q1 (25th percentile)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {usageMetrics.quartiles.q1}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                    <span className="text-sm font-medium text-emerald-700">Q2 (Median)</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {usageMetrics.quartiles.q2}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Q3 (75th percentile)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {usageMetrics.quartiles.q3}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Interpretation:</strong> Materials above Q3 ({usageMetrics.quartiles?.q3 || 0}%) are highly used. 
                Materials below Q1 ({usageMetrics.quartiles?.q1 || 0}%) may need promotion or review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product-Material Type Completeness Matrix */}
      <ProductCompletenessMatrix />
    </div>
  )
}
