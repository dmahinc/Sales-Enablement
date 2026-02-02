import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Target, Plus, Edit, Trash2, Building2, TrendingUp, MapPin } from 'lucide-react'
import Modal from '../components/Modal'
import SegmentForm from '../components/SegmentForm'

export default function Segments() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<any>(null)

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api.get('/segments').then(res => res.data),
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/segments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this segment?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading segments...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Market Segments</h1>
          <p className="mt-1 text-slate-500">Define and manage your market segments</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Segment
        </button>
      </div>

      {/* Segments Grid */}
      {segments && segments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((segment: any) => (
            <div key={segment.id} className="card-ovh overflow-hidden group">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-500 to-violet-600 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{segment.name}</h3>
                    <p className="text-sm text-violet-100">{segment.industry || 'All Industries'}</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {segment.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">{segment.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {segment.company_size && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{segment.company_size}</span>
                    </div>
                  )}
                  {segment.region && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{segment.region}</span>
                    </div>
                  )}
                </div>
                
                {segment.key_drivers && (
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Key Drivers</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{segment.key_drivers}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingSegment(segment)}
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(segment.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-ovh p-12 text-center">
          <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No segments yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Create market segments to categorize your target markets
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-ovh-primary mt-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Segment
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Segment"
        size="lg"
      >
        <SegmentForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={!!editingSegment}
        onClose={() => setEditingSegment(null)}
        title="Edit Segment"
        size="lg"
      >
        <SegmentForm segment={editingSegment} onClose={() => setEditingSegment(null)} />
      </Modal>
    </div>
  )
}
