import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { BookOpen, Plus, Edit, Trash2, Play, Clock, Target } from 'lucide-react'
import Modal from '../components/Modal'
import TrackForm from '../components/TrackForm'
import { Link } from 'react-router-dom'

export default function Tracks() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['tracks', statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status_filter=${statusFilter}` : ''
      return api.get(`/tracks${params}`).then(res => res.data)
    },
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tracks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#006dc7] border-t-transparent"></div>
          <span className="text-slate-500">Loading tracks...</span>
        </div>
      </div>
    )
  }

  const filteredTracks = tracks?.filter((t: any) => {
    if (statusFilter && t.status !== statusFilter) return false
    return true
  }) || []

  return (
    <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900 -m-6 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero / Header - DSR style */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Sales Enablement Tracks
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Structured learning paths for use cases and business stories
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-semibold shadow-md transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Track
            </button>
          </div>
        </section>

        {/* Filters */}
        <div className="mb-8 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#006dc7]/30 focus:border-[#006dc7]"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="text-sm font-medium text-[#006dc7] dark:text-[#21dadb] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Tracks Grid - DSR card style */}
        {filteredTracks.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
              Learning Paths
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTracks.map((track: any) => (
                <div
                  key={track.id}
                  className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-[#006dc7]/30 dark:hover:border-[#21dadb]/30 transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#e4f1fb]/80 dark:bg-[#003b6b]/20 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-[#006dc7] dark:text-[#21dadb]" />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                          track.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : track.status === 'archived'
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {track.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
                      {track.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                      {track.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Target className="h-4 w-4 flex-shrink-0 text-[#006dc7]/70" />
                        <span className="truncate">{track.use_case}</span>
                      </div>
                      {track.estimated_duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Clock className="h-4 w-4 flex-shrink-0 text-[#006dc7]/70" />
                          <span>{track.estimated_duration_minutes} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-4 w-4 flex-shrink-0 text-[#006dc7]/70" />
                        <span>{track.materials?.length || 0} materials</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Link
                        to={`/tracks/${track.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-semibold text-sm transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        View Track
                      </Link>
                      <Link
                        to={`/tracks/${track.id}/edit`}
                        className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-[#006dc7] dark:hover:text-[#21dadb] hover:bg-[#e4f1fb]/50 dark:hover:bg-[#003b6b]/20 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(track.id)}
                        className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#e4f1fb]/80 dark:bg-[#003b6b]/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-[#006dc7] dark:text-[#21dadb]" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No tracks found</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Get started by creating your first Sales Enablement Track
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-semibold shadow-md transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Track
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Sales Enablement Track"
        size="lg"
      >
        <TrackForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

    </div>
  )
}
