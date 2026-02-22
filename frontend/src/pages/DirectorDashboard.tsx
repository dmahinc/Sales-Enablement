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
  RefreshCw,
  LogIn
} from 'lucide-react'
import ProductCompletenessMatrix from '../components/ProductCompletenessMatrix'

export default function DirectorDashboard() {
  const { user } = useAuth()

  const { data, isLoading, error, refetch: refetchDashboard } = useQuery({
    queryKey: ['director-dashboard'],
    queryFn: () => api.get('/dashboard/director').then(res => res.data),
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
      description: data?.material_counts_by_status 
        ? `Including ${data.material_counts_by_status.draft || 0} draft, ${data.material_counts_by_status.published || 0} published, ${data.material_counts_by_status.review || 0} review and ${data.material_counts_by_status.archived || 0} archived`
        : 'Across all products'
    },
    {
      name: 'Total Sales Sessions',
      value: data?.total_sales_sessions || 0,
      icon: LogIn,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
      description: 'Cumulative connection sessions'
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

  const handleRefresh = () => {
    refetchDashboard()
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

      {/* Product-Material Type Completeness Matrix */}
      <ProductCompletenessMatrix />
    </div>
  )
}
