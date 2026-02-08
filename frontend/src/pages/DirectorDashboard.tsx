import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Users,
  FileText,
  BarChart3,
  Target,
  Plus
} from 'lucide-react'
import ProductCompletionTable from '../components/ProductCompletionTable'
import ProductForm from '../components/ProductForm'

export default function DirectorDashboard() {
  const [showProductForm, setShowProductForm] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['director-dashboard'],
    queryFn: () => api.get('/dashboard/director').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading director dashboard...</span>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Director Dashboard</h1>
          <p className="mt-1 text-slate-500">Monitor team progress and document completion across product hierarchy</p>
        </div>
        <Link
          to="/health"
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Health Dashboard
        </Link>
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

      {/* Product Completion Table */}
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-700">Product Completion Status</h2>
            <p className="text-sm text-slate-500 mt-1">
              Comprehensive view of material completion across all products and material types
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProductForm(true)}
              className="btn-ovh-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
        <div className="p-6">
          {data?.product_completion_matrix && data.material_types && data.material_type_labels ? (
            <ProductCompletionTable
              products={data.product_completion_matrix}
              materialTypes={data.material_types}
              materialTypeLabels={data.material_type_labels}
            />
          ) : (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No product data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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

      {/* Gap Analysis */}
      {data?.gap_analysis && data.gap_analysis.length > 0 && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Gap Analysis - Products Needing Attention</h2>
            <p className="text-sm text-slate-500 mt-1">Products missing critical materials</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.gap_analysis.map((gap: any, index: number) => (
              <div key={index} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{gap.product_name}</p>
                      <p className="text-xs text-slate-500">Missing {gap.missing_count} material type(s)</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`badge-ovh ${
                      gap.completion >= 50 ? 'badge-ovh-warning' : 'badge-ovh-danger'
                    }`}>
                      {gap.completion}% complete
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          onClose={() => setShowProductForm(false)}
        />
      )}
    </div>
  )
}
