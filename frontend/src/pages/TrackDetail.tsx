import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  BookOpen,
  CheckCircle,
  Circle,
  Clock,
  Download,
  ArrowLeft,
  Target,
  Users,
} from 'lucide-react'

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>()
  const trackId = parseInt(id || '0')

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading track...</span>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="card-ovh p-12 text-center">
        <h3 className="text-lg font-medium text-slate-900">Track not found</h3>
        <Link to="/tracks" className="mt-4 btn-ovh-primary inline-flex">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tracks
        </Link>
      </div>
    )
  }

  const completedMaterialIds = progress?.completed_material_ids || []
  const totalMaterials = track.materials?.length || 0
  const completedCount = completedMaterialIds.length
  const progressPercentage = totalMaterials > 0 ? (completedCount / totalMaterials) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/tracks"
          className="inline-flex items-center text-sm text-primary-500 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tracks
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-primary-50 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-primary-700">{track.name}</h1>
                <span className={`badge-ovh mt-1 ${
                  track.status === 'published' ? 'badge-ovh-success' :
                  track.status === 'archived' ? 'badge-ovh-gray' :
                  'badge-ovh-warning'
                }`}>
                  {track.status}
                </span>
              </div>
            </div>
            <p className="text-slate-600 mt-2">{track.description}</p>
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-ovh p-4">
          <div className="flex items-center">
            <Target className="h-5 w-5 text-primary-500 mr-2" />
            <div>
              <p className="text-xs text-slate-500">Use Case</p>
              <p className="text-sm font-medium text-slate-900">{track.use_case}</p>
            </div>
          </div>
        </div>
        {track.estimated_duration_minutes && (
          <div className="card-ovh p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary-500 mr-2" />
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm font-medium text-slate-900">
                  {track.estimated_duration_minutes} minutes
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="card-ovh p-4">
          <div className="flex items-center">
            <BookOpen className="h-5 w-5 text-primary-500 mr-2" />
            <div>
              <p className="text-xs text-slate-500">Materials</p>
              <p className="text-sm font-medium text-slate-900">
                {totalMaterials} steps
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {track.learning_objectives && (
        <div className="card-ovh p-6">
          <h2 className="text-lg font-semibold text-primary-700 mb-3">Learning Objectives</h2>
          <p className="text-slate-600 whitespace-pre-line">{track.learning_objectives}</p>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="card-ovh p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-700">Your Progress</h2>
            <span className="text-sm font-medium text-primary-600">
              {completedCount} / {totalMaterials} completed
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {Math.round(progressPercentage)}% complete
          </p>
        </div>
      )}

      {/* Track Materials */}
      <div className="card-ovh overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-primary-700">Track Steps</h2>
          <p className="mt-1 text-sm text-slate-500">
            Follow these materials in order to learn about {track.use_case}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {track.materials && track.materials.length > 0 ? (
            track.materials.map((tm: any, index: number) => {
              const isCompleted = completedMaterialIds.includes(tm.material_id)
              return (
                <div
                  key={tm.id}
                  className={`p-6 ${isCompleted ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 pt-1">
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-slate-500">
                              Step {tm.order}
                            </span>
                            {tm.is_required && (
                              <span className="badge-ovh badge-ovh-gray text-xs">Required</span>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mb-1">
                            {tm.material?.name || 'Material not found'}
                          </h3>
                          {tm.step_description && (
                            <p className="text-sm text-slate-600 mb-2">{tm.step_description}</p>
                          )}
                          {tm.material && (
                            <div className="flex items-center space-x-4 text-xs text-slate-500">
                              <span>
                                {tm.material.material_type?.replace(/_/g, ' ')}
                              </span>
                              {tm.material.universe_name && (
                                <>
                                  <span>•</span>
                                  <span>{tm.material.universe_name}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {tm.material?.file_path && (
                            <a
                              href={`/api/materials/${tm.material_id}/download`}
                              download
                              className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={(e) =>
                                handleMaterialComplete(tm.material_id, e.target.checked)
                              }
                              className="mr-2 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-slate-600">Complete</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center text-slate-500">
              No materials in this track yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
