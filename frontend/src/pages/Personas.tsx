import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Users, Plus, Edit, Trash2, Briefcase, Target } from 'lucide-react'
import Modal from '../components/Modal'
import PersonaForm from '../components/PersonaForm'

export default function Personas() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<any>(null)

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

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading personas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Personas Library</h1>
          <p className="mt-1 text-slate-500">Define and manage your buyer personas</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Persona
        </button>
      </div>

      {/* Personas Grid */}
      {personas && personas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona: any) => (
            <div key={persona.id} className="card-ovh overflow-hidden group">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
                      <p className="text-sm text-primary-100">{persona.role || 'No role defined'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {persona.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">{persona.description}</p>
                )}
                
                <div className="space-y-3">
                  {persona.goals && (
                    <div className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Goals</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{persona.goals}</p>
                      </div>
                    </div>
                  )}
                  
                  {persona.challenges && (
                    <div className="flex items-start space-x-2">
                      <Briefcase className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Challenges</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{persona.challenges}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingPersona(persona)}
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(persona.id)}
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
          <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No personas yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Create buyer personas to better target your sales materials
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-ovh-primary mt-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Persona
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Persona"
        size="lg"
      >
        <PersonaForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

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
