import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  BarChart3,
  BookOpen
} from 'lucide-react'

export default function Dashboard() {
  const { data: materials, isLoading: materialsLoading, error: materialsError } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  const { data: tracks, isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => api.get('/tracks').then(res => res.data),
  })

  const isLoading = materialsLoading || tracksLoading
  const hasError = materialsError || tracksError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading dashboard...</span>
      </div>
    )
  }

  if (hasError) {
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
      name: 'Total Materials',
      value: materials?.length || 0,
      icon: FileText,
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50',
      link: '/materials',
    },
    {
      name: 'Sales Enablement Tracks',
      value: tracks?.length || 0,
      icon: BookOpen,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      link: '/tracks',
    },
    {
      name: 'Health Score',
      value: '85%',
      icon: Activity,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      link: '/health',
    },
    {
      name: 'Published Materials',
      value: materials?.filter((m: any) => m.status === 'published')?.length || 0,
      icon: CheckCircle,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
      link: '/materials?status=published',
    },
  ]

  const recentMaterials = materials?.slice(0, 5) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Dashboard</h1>
          <p className="mt-1 text-slate-500">Product & Solutions Sales Enablement - Your Single Source of Truth</p>
        </div>
        <Link
          to="/materials"
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <FileText className="w-4 h-4 mr-2" />
          Add Material
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
        {/* Recent Materials */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-700">Recent Materials</h2>
            <Link to="/materials" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMaterials.length > 0 ? (
              recentMaterials.map((material: any) => (
                <div key={material.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-50 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{material.name}</p>
                      <p className="text-xs text-slate-500">
                        {material.material_type} • {material.universe_name || 'No Universe'}
                      </p>
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
                <p className="mt-2 text-sm text-slate-500">No materials yet</p>
                <Link to="/materials" className="mt-4 btn-ovh-primary inline-flex">
                  Add your first material
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-primary-700">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-4">
            <Link
              to="/materials"
              className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="bg-primary-100 p-3 rounded-lg mr-4">
                <FileText className="h-6 w-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600">
                  Manage Materials
                </h3>
                <p className="text-xs text-slate-500">Upload and organize your sales materials</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/personas"
              className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
            >
              <div className="bg-emerald-100 p-3 rounded-lg mr-4">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-900 group-hover:text-emerald-600">
                  Define Personas
                </h3>
                <p className="text-xs text-slate-500">Create and manage buyer personas</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/discovery"
              className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
            >
              <div className="bg-violet-100 p-3 rounded-lg mr-4">
                <BarChart3 className="h-6 w-6 text-violet-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-900 group-hover:text-violet-600">
                  Discover Content
                </h3>
                <p className="text-xs text-slate-500">Search narratives and content blocks</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
