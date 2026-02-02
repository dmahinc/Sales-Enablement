import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Target, Plus, Edit, Trash2, CheckCircle, Users } from 'lucide-react'
import Modal from '../components/Modal'
import SegmentForm from '../components/SegmentForm'

export default function Segments() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<any>(null)
  const [selectedSegment, setSelectedSegment] = useState<any>(null)

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api.get('/segments').then(res => res.data),
  })

  const { data: segmentPersonas } = useQuery({
    queryKey: ['segment-personas', selectedSegment?.id],
    queryFn: () => api.get(`/segments/${selectedSegment.id}/personas`).then(res => res.data),
    enabled: !!selectedSegment,
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/segments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/segments/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this segment?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleApprove = (id: number) => {
    approveMutation.mutate(id)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading segments...</div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Market Segments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Standardized market segment definitions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Segment
          </button>
        </div>
      </div>

      <div className="mt-8">
        {segments && segments.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {segments.map((segment: any) => (
                <li key={segment.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <Target className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{segment.display_name || segment.name}</p>
                          <p className="text-sm text-gray-500">{segment.name}</p>
                          {segment.characteristics && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{segment.characteristics}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setSelectedSegment(segment)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {segment.personas?.length || 0} personas
                        </button>
                        {segment.approval_count >= 3 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Approved ({segment.approval_count})
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending ({segment.approval_count || 0}/3)
                          </span>
                        )}
                        <div className="flex items-center space-x-2">
                          {segment.approval_count < 3 && (
                            <button
                              onClick={() => handleApprove(segment.id)}
                              className="text-gray-400 hover:text-green-600"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingSegment(segment)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(segment.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No segments</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a segment.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Segment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Segment"
        size="lg"
      >
        <SegmentForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingSegment}
        onClose={() => setEditingSegment(null)}
        title="Edit Segment"
        size="lg"
      >
        <SegmentForm segment={editingSegment} onClose={() => setEditingSegment(null)} />
      </Modal>

      {/* Personas Modal */}
      <Modal
        isOpen={!!selectedSegment}
        onClose={() => setSelectedSegment(null)}
        title={`Personas for ${selectedSegment?.display_name || selectedSegment?.name}`}
        size="md"
      >
        {segmentPersonas && segmentPersonas.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {segmentPersonas.map((persona: any) => (
              <li key={persona.id} className="py-3">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">{persona.display_name || persona.name}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No personas assigned to this segment.</p>
        )}
      </Modal>
    </div>
  )
}
