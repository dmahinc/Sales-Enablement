import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { FileText, Users, Target, Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => api.get('/health/dashboard').then(res => res.data),
    retry: 1,
  })

  const { data: materials, error: materialsError } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
    retry: 1,
  })

  const { data: personas, error: personasError } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then(res => res.data),
    retry: 1,
  })

  const { data: segments, error: segmentsError } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api.get('/segments').then(res => res.data),
    retry: 1,
  })

  // Log errors for debugging
  if (healthError) console.error('Health dashboard error:', healthError)
  if (materialsError) console.error('Materials error:', materialsError)
  if (personasError) console.error('Personas error:', personasError)
  if (segmentsError) console.error('Segments error:', segmentsError)

  const stats = healthData?.statistics || {}
  const recentMaterials = healthData?.materials?.slice(0, 5) || []

  const healthScore = stats.average_health_score || 0
  const healthColor = healthScore >= 70 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'

  // Show error if all queries failed
  if (healthError && materialsError && personasError && segmentsError) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-8">
          <h3 className="text-red-800 font-semibold">Error loading dashboard</h3>
          <p className="text-red-600 text-sm mt-2">Please check the browser console for details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of your sales enablement materials and resources
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/materials" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Materials</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {materials?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/health" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <Activity className={`h-6 w-6 ${healthColor}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Health Score</dt>
                  <dd className={`text-2xl font-semibold ${healthColor}`}>
                    {healthLoading ? '...' : healthScore.toFixed(1)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/personas" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Personas</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {personas?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/segments" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Segments</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {segments?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Health Overview */}
      {stats.total_materials > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-500">High Health</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.high_health_count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Medium Health</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.medium_health_count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Low Health</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.low_health_count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Materials */}
      {recentMaterials.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Materials</h2>
            <Link to="/materials" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {recentMaterials.map((material: any) => (
                <li key={material.material_id || material.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{material.name}</p>
                          <p className="text-sm text-gray-500">
                            {material.material_type} • {material.product_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          material.health_score >= 70 
                            ? 'bg-green-100 text-green-800' 
                            : material.health_score >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Health: {material.health_score || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!materials || materials.length === 0) && (
        <div className="mt-8 bg-white shadow rounded-lg p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No materials yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first material.</p>
          <div className="mt-6">
            <Link
              to="/materials"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Material
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
