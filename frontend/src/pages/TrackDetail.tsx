import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  BookOpen,
  CheckCircle,
  Download,
  ArrowLeft,
  Target,
  Home,
  BarChart3,
  Settings,
  FileText,
  Award,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MaterialThumbnail from '../components/MaterialThumbnail'

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const trackId = parseInt(id || '0')
  const canManage = user?.role === 'director' || user?.role === 'pmm' || user?.is_superuser

  const queryClient = useQueryClient()

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => api.get(`/tracks/${trackId}`).then((res) => res.data),
  })

  const { data: progress } = useQuery({
    queryKey: ['track-progress', trackId],
    queryFn: () => api.get(`/tracks/${trackId}/progress`).then((res) => res.data),
  })

  const updateProgressMutation = useMutation({
    mutationFn: ({ materialId, completed }: { materialId: number; completed: boolean }) =>
      api.post(`/tracks/${trackId}/progress`, {
        material_id: materialId,
        completed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress', trackId] })
    },
  })

  const handleMaterialComplete = (materialId: number, completed: boolean) => {
    updateProgressMutation.mutate({ materialId, completed })
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#006dc7] border-t-transparent"></div>
          <span className="text-slate-500">Loading track...</span>
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Track not found</h3>
        <Link
          to="/tracks"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Tracks
        </Link>
      </div>
    )
  }

  const completedMaterialIds = progress?.completed_material_ids || []
  const totalMaterials = track.materials?.length || 0
  const completedCount = completedMaterialIds.length
  const progressPercentage = totalMaterials > 0 ? (completedCount / totalMaterials) * 100 : 0

  const firstIncomplete = track.materials?.find((tm: any) => !completedMaterialIds.includes(tm.material_id))
  const updatedAt = track.updated_at || track.created_at

  return (
    <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900 -m-6 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumbs & Actions - Highspot style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/tracks"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#006dc7] dark:hover:text-[#21dadb] transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link
              to="/"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#006dc7] dark:hover:text-[#21dadb] transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{track.use_case}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#e4f1fb]/60 dark:bg-[#003b6b]/20 text-[#006dc7] dark:text-[#21dadb] text-xs font-medium">
                <BarChart3 className="w-3.5 h-3.5" />
                Learning Path
              </span>
              {updatedAt && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(updatedAt)}</span>
              )}
            </div>
          </div>
          {canManage && (
            <Link
              to={`/tracks/${track.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
            >
              <Settings className="w-5 h-5" />
              Manage Learning Path
            </Link>
          )}
        </div>

        {/* Learning Path Overview - Highspot style */}
        <header className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {track.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {totalMaterials} {totalMaterials === 1 ? 'material' : 'materials'}
            </span>
            <span className="inline-flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificate upon completion
            </span>
          </div>
          {track.description && (
            <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-3xl">{track.description}</p>
          )}

          {/* Learning path completion - prominent progress bar */}
          {progress && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Learning path completion</span>
                <span className="text-lg font-bold text-[#006dc7] dark:text-[#21dadb]">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#006dc7] dark:bg-[#21dadb] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Certification - Highspot style */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Certification</h2>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{track.name} Certificate</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Earn upon completing all materials</p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                progressPercentage >= 100
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {progressPercentage >= 100 ? 'Earned' : 'Not Yet Earned'}
            </span>
          </div>
        </section>

        {/* Courses - Highspot card style */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Courses</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Follow these materials in order to learn about {track.use_case}
          </p>

          <div className="space-y-4">
            {track.materials && track.materials.length > 0 ? (
              track.materials.map((tm: any) => {
                const isCompleted = completedMaterialIds.includes(tm.material_id)
                const isFirstIncomplete = firstIncomplete?.material_id === tm.material_id
                return (
                  <div
                    key={tm.id}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      isCompleted
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="sm:w-40 flex-shrink-0 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                        <MaterialThumbnail
                          materialId={tm.material_id}
                          fileFormat={tm.material?.file_format}
                          useAuth
                          className="w-full h-28 sm:h-auto sm:w-40 sm:min-h-[140px] object-cover"
                        />
                      </div>
                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {tm.order} {tm.order === 1 ? 'lesson' : 'lessons'}
                            </span>
                            {tm.is_required && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                Required
                              </span>
                            )}
                          </div>
                          <h3
                            className={`text-lg font-semibold ${
                              isCompleted ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {tm.material?.name || 'Material not found'}
                          </h3>
                          {tm.step_description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{tm.step_description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {tm.material?.file_path && (
                            <a
                              href={`/api/materials/${tm.material_id}/download`}
                              download
                              className="p-2 rounded-lg text-slate-500 hover:text-[#006dc7] dark:hover:text-[#21dadb] hover:bg-[#e4f1fb]/50 transition-colors"
                              title="Download"
                            >
                              <Download className="h-5 w-5" />
                            </a>
                          )}
                          {isCompleted ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">Passed</span>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => handleMaterialComplete(tm.material_id, e.target.checked)}
                                className="w-5 h-5 rounded text-[#006dc7] focus:ring-[#006dc7]/30"
                              />
                              <span className="text-sm text-slate-600 dark:text-slate-400">Mark complete</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400">No materials in this track yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Learning Path Contact - Highspot style */}
        {track.created_by_name && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Learning Path Contact</h2>
            <p className="text-[#006dc7] dark:text-[#21dadb] font-medium hover:underline">
              {track.created_by_name}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
