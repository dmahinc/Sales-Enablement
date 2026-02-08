import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Activity, 
  Upload,
  CheckCircle,
  ArrowRight,
  Target,
  TrendingUp,
  Clock
} from 'lucide-react'

export default function PMMDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pmm-dashboard'],
    queryFn: () => api.get('/dashboard/pmm').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading your dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-ovh p-6 text-center">
        <p className="text-sm text-slate-500">Error loading dashboard. Please try refreshing the page.</p>
      </div>
    )
  }

  const stats = [
    {
      name: 'Your Materials',
      value: data?.user_stats?.total_materials || 0,
      icon: FileText,
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50',
      link: '/materials'
    },
    {
      name: 'Health Score',
      value: `${data?.user_stats?.health_score || 0}%`,
      icon: Activity,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      link: '/health'
    },
    {
      name: 'Products Contributed',
      value: data?.user_stats?.products_contributed_to || 0,
      icon: Target,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
      link: '/materials'
    },
    {
      name: 'Pending Assignments',
      value: data?.quick_actions?.assignments_pending || 0,
      icon: Clock,
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
          <h1 className="text-2xl font-semibold text-primary-700">PMM Dashboard</h1>
          <p className="mt-1 text-slate-500">Your contributor workspace - upload and manage materials</p>
        </div>
        <Link
          to="/materials"
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Material
        </Link>
      </div>

      {/* Stats Grid */}
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
                <span>View details</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-700">Recent Uploads</h2>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recent_uploads && data.recent_uploads.length > 0 ? (
              data.recent_uploads.map((material: any) => (
                <div key={material.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-50 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{material.name}</p>
                      <p className="text-xs text-slate-500">
                        {material.material_type} • {material.product_name}
                      </p>
                      {material.created_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(material.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`badge-ovh ${
                      material.status === 'published' ? 'badge-ovh-success' : 
                      material.status === 'review' ? 'badge-ovh-warning' : 
                      'badge-ovh-gray'
                    }`}>
                      {material.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No materials uploaded yet</p>
                <Link to="/materials" className="mt-4 btn-ovh-primary inline-flex">
                  Upload your first material
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Materials by Type */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Materials by Type</h2>
          </div>
          <div className="p-6">
            {data?.user_stats?.materials_by_type && Object.keys(data.user_stats.materials_by_type).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(data.user_stats.materials_by_type).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{type}</span>
                    <span className="text-sm font-semibold text-primary-700">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No materials yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Completion */}
      {data?.product_completion && data.product_completion.length > 0 && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Your Product Contributions</h2>
            <p className="text-sm text-slate-500 mt-1">Products you've contributed materials to</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.product_completion.map((product: any) => (
              <div key={product.product_id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{product.product_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {product.materials_count} material{product.materials_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    {product.last_updated && (
                      <p className="text-xs text-slate-500">
                        Updated {new Date(product.last_updated).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
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
              <Upload className="h-6 w-6 text-primary-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600">
                Upload New Material
              </h3>
              <p className="text-xs text-slate-500">Add materials to the repository</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link
            to="/materials"
            className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
          >
            <div className="bg-emerald-100 p-3 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-900 group-hover:text-emerald-600">
                Manage Materials
              </h3>
              <p className="text-xs text-slate-500">View and edit your materials</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  )
}
