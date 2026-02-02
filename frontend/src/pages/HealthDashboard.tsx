import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Activity, AlertCircle } from 'lucide-react'

export default function HealthDashboard() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => api.get('/health/dashboard').then(res => res.data),
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading health data...</div>
  }

  const stats = healthData?.statistics || {}

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Material Health Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track material freshness, completeness, and usage
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Health Score</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.average_health_score?.toFixed(1) || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Health Materials</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.low_health_count || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Materials</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.total_materials || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {healthData?.materials && healthData.materials.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Material Health</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {healthData.materials.map((material: any) => (
                <li key={material.material_id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{material.name}</p>
                        <p className="text-sm text-gray-500">
                          {material.material_type} • {material.product_name || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Health Score</p>
                          <span className={`text-lg font-semibold ${
                            material.health_score >= 70 
                              ? 'text-green-600' 
                              : material.health_score >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {material.health_score}
                          </span>
                        </div>
                        <div className="w-24">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                material.health_score >= 70 
                                  ? 'bg-green-600' 
                                  : material.health_score >= 50
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${material.health_score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
