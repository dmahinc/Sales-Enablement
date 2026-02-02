import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

interface SegmentFormProps {
  segment?: any
  onClose: () => void
}

export default function SegmentForm({ segment, onClose }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    characteristics: '',
    firmographics: '',
    technographics: '',
    buying_behavior: '',
    pain_points: '',
    messaging_preferences: '',
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    if (segment) {
      setFormData({
        name: segment.name || '',
        display_name: segment.display_name || '',
        characteristics: segment.characteristics || '',
        firmographics: segment.firmographics || '',
        technographics: segment.technographics || '',
        buying_behavior: segment.buying_behavior || '',
        pain_points: segment.pain_points || '',
        messaging_preferences: segment.messaging_preferences || '',
      })
    }
  }, [segment])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/segments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/segments/${segment.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (segment) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Display Name *</label>
        <input
          type="text"
          required
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Characteristics</label>
        <textarea
          rows={3}
          value={formData.characteristics}
          onChange={(e) => setFormData({ ...formData, characteristics: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Firmographics</label>
        <textarea
          rows={3}
          value={formData.firmographics}
          onChange={(e) => setFormData({ ...formData, firmographics: e.target.value })}
          placeholder="Industry, company size, revenue..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Technographics</label>
        <textarea
          rows={3}
          value={formData.technographics}
          onChange={(e) => setFormData({ ...formData, technographics: e.target.value })}
          placeholder="Tech stack, cloud adoption..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Buying Behavior</label>
        <textarea
          rows={3}
          value={formData.buying_behavior}
          onChange={(e) => setFormData({ ...formData, buying_behavior: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Pain Points</label>
        <textarea
          rows={3}
          value={formData.pain_points}
          onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Messaging Preferences</label>
        <textarea
          rows={3}
          value={formData.messaging_preferences}
          onChange={(e) => setFormData({ ...formData, messaging_preferences: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : segment ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
