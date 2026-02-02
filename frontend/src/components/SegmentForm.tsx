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
    description: '',
    industry: '',
    company_size: '',
    region: '',
    key_drivers: '',
    pain_points: '',
    buying_criteria: '',
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    if (segment) {
      setFormData({
        name: segment.name || '',
        description: segment.description || '',
        industry: segment.industry || '',
        company_size: segment.company_size || '',
        region: segment.region || '',
        key_drivers: segment.key_drivers || '',
        pain_points: segment.pain_points || '',
        buying_criteria: segment.buying_criteria || '',
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Segment Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-ovh"
          placeholder="e.g., Enterprise Financial Services"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-ovh"
          placeholder="Brief description of this market segment"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
          <select
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="input-ovh"
          >
            <option value="">Select Industry</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Retail">Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Technology">Technology</option>
            <option value="Public Sector">Public Sector</option>
            <option value="Education">Education</option>
            <option value="Media & Entertainment">Media & Entertainment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Company Size</label>
          <select
            value={formData.company_size}
            onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
            className="input-ovh"
          >
            <option value="">Select Size</option>
            <option value="Startup (1-50)">Startup (1-50)</option>
            <option value="SMB (51-500)">SMB (51-500)</option>
            <option value="Mid-Market (501-2000)">Mid-Market (501-2000)</option>
            <option value="Enterprise (2000+)">Enterprise (2000+)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className="input-ovh"
          >
            <option value="">Select Region</option>
            <option value="EMEA">EMEA</option>
            <option value="Americas">Americas</option>
            <option value="APAC">APAC</option>
            <option value="Global">Global</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Key Business Drivers</label>
        <textarea
          rows={2}
          value={formData.key_drivers}
          onChange={(e) => setFormData({ ...formData, key_drivers: e.target.value })}
          className="input-ovh"
          placeholder="What drives their business decisions?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Pain Points</label>
        <textarea
          rows={2}
          value={formData.pain_points}
          onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
          className="input-ovh"
          placeholder="What challenges do they face?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Buying Criteria</label>
        <textarea
          rows={2}
          value={formData.buying_criteria}
          onChange={(e) => setFormData({ ...formData, buying_criteria: e.target.value })}
          className="input-ovh"
          placeholder="What factors influence their purchasing decisions?"
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
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : segment ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
