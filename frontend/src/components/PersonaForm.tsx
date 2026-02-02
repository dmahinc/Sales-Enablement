import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

interface PersonaFormProps {
  persona?: any
  onClose: () => void
}

export default function PersonaForm({ persona, onClose }: PersonaFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
    goals: '',
    challenges: '',
    preferred_content: '',
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name || '',
        role: persona.role || '',
        description: persona.description || '',
        goals: persona.goals || '',
        challenges: persona.challenges || '',
        preferred_content: persona.preferred_content || '',
      })
    }
  }, [persona])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/personas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/personas/${persona.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (persona) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Persona Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-ovh"
            placeholder="e.g., IT Decision Maker"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Role / Title</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="input-ovh"
            placeholder="e.g., CTO, IT Director"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-ovh"
          placeholder="Brief description of this persona"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Goals & Objectives</label>
        <textarea
          rows={3}
          value={formData.goals}
          onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          className="input-ovh"
          placeholder="What are they trying to achieve?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Challenges & Pain Points</label>
        <textarea
          rows={3}
          value={formData.challenges}
          onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
          className="input-ovh"
          placeholder="What problems do they face?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Content Types</label>
        <input
          type="text"
          value={formData.preferred_content}
          onChange={(e) => setFormData({ ...formData, preferred_content: e.target.value })}
          className="input-ovh"
          placeholder="e.g., Technical whitepapers, ROI calculators"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="btn-ovh-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-ovh-primary disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : persona ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
