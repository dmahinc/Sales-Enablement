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
  Filter
} from 'lucide-react'
import CustomerEngagementTimeline from '../components/CustomerEngagementTimeline'

export default function SalesDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: () => api.get('/dashboard/sales').then(res => res.data),
  })

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
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
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
          <h1 className="text-2xl font-semibold text-primary-700">Sales Dashboard</h1>
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
                    <div className="bg-violet-50 p-2 rounded-lg">
                      <Eye className="h-5 w-5 text-violet-500" />
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
