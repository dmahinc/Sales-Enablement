import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

export default function HealthDashboard() {
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading health data...</span>
      </div>
    )
  }

  // Calculate health metrics
  const totalMaterials = materials?.length || 0
  const publishedMaterials = materials?.filter((m: any) => m.status === 'published').length || 0
  const draftMaterials = materials?.filter((m: any) => m.status === 'draft').length || 0
  const reviewMaterials = materials?.filter((m: any) => m.status === 'review').length || 0
  const archivedMaterials = materials?.filter((m: any) => m.status === 'archived').length || 0
  
  const overallHealth = totalMaterials > 0 
    ? Math.round((publishedMaterials / totalMaterials) * 100) 
    : 0

  const healthColor = overallHealth >= 70 ? 'emerald' : overallHealth >= 40 ? 'amber' : 'red'

  // Materials by universe
  const universeStats = [
    { name: 'Public Cloud', count: materials?.filter((m: any) => m.universe_name === 'Public Cloud').length || 0 },
    { name: 'Private Cloud', count: materials?.filter((m: any) => m.universe_name === 'Private Cloud').length || 0 },
    { name: 'Bare Metal', count: materials?.filter((m: any) => m.universe_name === 'Bare Metal').length || 0 },
    { name: 'Hosting & Collaboration', count: materials?.filter((m: any) => m.universe_name === 'Hosting & Collaboration').length || 0 },
  ]

  const maxUniverseCount = Math.max(...universeStats.map(u => u.count), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Health Dashboard</h1>
          <p className="mt-1 text-slate-500">Monitor the health and status of your sales materials</p>
        </div>
        <button className="btn-ovh-secondary mt-4 sm:mt-0">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Overall Health Score */}
      <div className="card-ovh p-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-lg font-medium text-slate-600">Overall Health Score</h2>
            <p className="text-sm text-slate-400 mt-1">Based on published materials ratio</p>
          </div>
          <div className="flex items-center space-x-8">
            {/* Circular Progress */}
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
                <span className={`text-3xl font-bold text-${healthColor}-500`}>{overallHealth}%</span>
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
                {publishedMaterials} of {totalMaterials} materials published
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Published</p>
              <p className="text-3xl font-semibold text-emerald-600 mt-2">{publishedMaterials}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${totalMaterials > 0 ? (publishedMaterials / totalMaterials) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">In Review</p>
              <p className="text-3xl font-semibold text-amber-600 mt-2">{reviewMaterials}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${totalMaterials > 0 ? (reviewMaterials / totalMaterials) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Draft</p>
              <p className="text-3xl font-semibold text-primary-600 mt-2">{draftMaterials}</p>
            </div>
            <div className="bg-primary-50 p-3 rounded-xl">
              <Activity className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${totalMaterials > 0 ? (draftMaterials / totalMaterials) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Archived</p>
              <p className="text-3xl font-semibold text-slate-600 mt-2">{archivedMaterials}</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-slate-400 h-2 rounded-full transition-all"
                style={{ width: `${totalMaterials > 0 ? (archivedMaterials / totalMaterials) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Materials by Universe */}
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-primary-700">Materials by Universe</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {universeStats.map((universe, index) => {
              const colors = ['primary', 'violet', 'amber', 'emerald']
              const color = colors[index % colors.length]
              const percentage = (universe.count / maxUniverseCount) * 100
              
              return (
                <div key={universe.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{universe.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{universe.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div 
                      className={`bg-${color}-500 h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-ovh p-6">
          <h3 className="text-lg font-semibold text-primary-700 mb-4">Quick Insights</h3>
          <ul className="space-y-3">
            {draftMaterials > 0 && (
              <li className="flex items-start space-x-3">
                <div className="bg-primary-50 p-1 rounded">
                  <Activity className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">{draftMaterials} materials</span> are in draft status and need completion
                </p>
              </li>
            )}
            {reviewMaterials > 0 && (
              <li className="flex items-start space-x-3">
                <div className="bg-amber-50 p-1 rounded">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">{reviewMaterials} materials</span> are pending review
                </p>
              </li>
            )}
            {overallHealth >= 70 && (
              <li className="flex items-start space-x-3">
                <div className="bg-emerald-50 p-1 rounded">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm text-slate-600">
                  Your content library is in <span className="font-medium text-emerald-600">good health</span>!
                </p>
              </li>
            )}
            {totalMaterials === 0 && (
              <li className="flex items-start space-x-3">
                <div className="bg-slate-100 p-1 rounded">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600">
                  No materials yet. Start by uploading your first material.
                </p>
              </li>
            )}
          </ul>
        </div>

        <div className="card-ovh p-6">
          <h3 className="text-lg font-semibold text-primary-700 mb-4">Recommendations</h3>
          <ul className="space-y-3">
            {draftMaterials > publishedMaterials && (
              <li className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  Review and publish your draft materials to improve content availability
                </p>
              </li>
            )}
            {universeStats.some(u => u.count === 0) && (
              <li className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg">
                <Activity className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  Add materials to all product universes for complete coverage
                </p>
              </li>
            )}
            {totalMaterials > 0 && overallHealth < 50 && (
              <li className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  Health score is below 50%. Prioritize publishing existing content.
                </p>
              </li>
            )}
            {totalMaterials > 0 && overallHealth >= 70 && (
              <li className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  Great job! Continue maintaining your content and keep it up to date.
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
