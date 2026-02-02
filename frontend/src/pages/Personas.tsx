import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Users, Plus, Edit, Trash2, CheckCircle } from 'lucide-react'
import Modal from '../components/Modal'
import PersonaForm from '../components/PersonaForm'
import { useAuth } from '../contexts/AuthContext'

export default function Personas() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<any>(null)
  const { user } = useAuth()

  const { data: personas, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then(res => res.data),
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/personas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/personas/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleApprove = (id: number) => {
    approveMutation.mutate(id)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading personas...</div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Personas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Shared persona library for consistent targeting
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Persona
          </button>
        </div>
      </div>

      <div className="mt-8">
        {personas && personas.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {personas.map((persona: any) => (
                <li key={persona.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <Users className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{persona.display_name || persona.name}</p>
                          <p className="text-sm text-gray-500">{persona.name}</p>
                          {persona.characteristics && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{persona.characteristics}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          Used in {persona.usage_count || 0} materials
                        </span>
                        {persona.approval_count >= 3 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Approved ({persona.approval_count})
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending ({persona.approval_count || 0}/3)
                          </span>
                        )}
                        <div className="flex items-center space-x-2">
                          {persona.approval_count < 3 && (
                            <button
                              onClick={() => handleApprove(persona.id)}
                              className="text-gray-400 hover:text-green-600"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPersona(persona)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(persona.id)}
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
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No personas</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a persona.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Persona
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Persona"
        size="lg"
      >
        <PersonaForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPersona}
        onClose={() => setEditingPersona(null)}
        title="Edit Persona"
        size="lg"
      >
        <PersonaForm persona={editingPersona} onClose={() => setEditingPersona(null)} />
      </Modal>
    </div>
  )
}
