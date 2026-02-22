import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { BookOpen, Plus, Edit, Trash2, Play, Clock, Users, Target } from 'lucide-react'
import Modal from '../components/Modal'
import TrackForm from '../components/TrackForm'
import { Link } from 'react-router-dom'

export default function Tracks() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<any>(null)
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading tracks...</span>
      </div>
    )
  }

  const filteredTracks = tracks?.filter((t: any) => {
    if (statusFilter && t.status !== statusFilter) return false
    return true
  }) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Sales Enablement Tracks</h1>
          <p className="mt-1 text-slate-500">Structured learning paths for use cases and business stories</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Track
        </button>
      </div>

      {/* Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-ovh w-auto"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Tracks Grid */}
      {filteredTracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track: any) => (
            <div key={track.id} className="card-ovh hover:shadow-md transition-all duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary-50 p-3 rounded-xl">
                    <BookOpen className="h-6 w-6 text-primary-500" />
                  </div>
                  <span className={`badge-ovh ${
                    track.status === 'published' ? 'badge-ovh-success' :
                    track.status === 'archived' ? 'badge-ovh-gray' :
                    'badge-ovh-warning'
                  }`}>
                    {track.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{track.name}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{track.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-slate-500">
                    <Target className="h-4 w-4 mr-2" />
                    <span className="truncate">{track.use_case}</span>
                  </div>
                  {track.estimated_duration_minutes && (
                    <div className="flex items-center text-sm text-slate-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{track.estimated_duration_minutes} minutes</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-slate-500">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span>{track.materials?.length || 0} materials</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                  <Link
                    to={`/tracks/${track.id}`}
                    className="flex-1 btn-ovh-primary text-center"
                  >
                    <Play className="w-4 h-4 mr-2 inline" />
                    View Track
                  </Link>
                  <button
                    onClick={() => setEditingTrack(track)}
                    className="p-2 text-slate-600 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(track.id)}
                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-ovh p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No tracks found</h3>
          <p className="mt-2 text-sm text-slate-500">
            Get started by creating your first Sales Enablement Track
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 btn-ovh-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Track
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Sales Enablement Track"
        size="lg"
      >
        <TrackForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={!!editingTrack}
        onClose={() => setEditingTrack(null)}
        title="Edit Track"
        size="lg"
      >
        <TrackForm track={editingTrack} onClose={() => setEditingTrack(null)} />
      </Modal>
    </div>
  )
}
