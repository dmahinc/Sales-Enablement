import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Users,
  FileText,
  BarChart3,
  Target,
  Plus,
  RefreshCw
} from 'lucide-react'
import ProductCompletenessMatrix from '../components/ProductCompletenessMatrix'

export default function DirectorDashboard() {
  const { user } = useAuth()

  const { data, isLoading, error, refetch: refetchDashboard } = useQuery({
    queryKey: ['director-dashboard'],
    queryFn: () => api.get('/dashboard/director').then(res => res.data),
  })

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => api.get('/health/dashboard').then(res => res.data),
  })

  if (isLoading) {
    const dashboardLabel = user?.role === 'pmm' ? 'PMM dashboard' : 'director dashboard'
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading {dashboardLabel}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-ovh p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-sm font-medium text-slate-900">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-slate-500">Please try refreshing the page.</p>
      </div>
    )
  }

  const stats = [
    {
      name: 'Overall Completion',
      value: `${data?.overall_completion_percentage || 0}%`,
      icon: Target,
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50',
      description: `${data?.products_with_materials || 0} of ${data?.total_products || 0} products have materials`
    },
    {
      name: 'Total Materials',
      value: data?.total_materials || 0,
      icon: FileText,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      description: 'Across all products'
    },
    {
      name: 'Team Members',
      value: data?.team_contributions?.length || 0,
      icon: Users,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
      description: 'Active PMM contributors'
    },
    {
      name: 'Recent Activity',
      value: data?.recent_activity?.materials_last_7_days || 0,
      icon: Activity,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      description: 'Materials uploaded this week'
    },
  ]

  const healthStats = healthData?.statistics || {}
  const freshnessMetrics = healthData?.freshness_metrics || {}
  const completenessMetrics = healthData?.completeness_metrics || {}
  const usageMetrics = healthData?.usage_metrics || {}
  const ageDist = freshnessMetrics.age_distribution || {}

  const totalMaterials = healthStats.total_materials || 0

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

  const handleRefresh = () => {
    refetchDashboard()
    refetchHealth()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Director Dashboard</h1>
          <p className="mt-1 text-slate-500">Monitor team progress, document completion, and material health across product hierarchy</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="btn-ovh-secondary mt-4 sm:mt-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="card-ovh p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-primary-700">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{stat.description}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Health Metrics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Team Contributions */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-700">Team Contributions</h2>
            <Link to="/users" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.team_contributions && data.team_contributions.length > 0 ? (
              data.team_contributions.map((member: any) => (
                <div key={member.user_id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-primary-700">{member.materials_count}</p>
                      <p className="text-xs text-slate-500">materials</p>
                      {member.recent_uploads > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">{member.recent_uploads} this month</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No team data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product-Material Type Completeness Matrix */}
      <ProductCompletenessMatrix />
    </div>
  )
}
