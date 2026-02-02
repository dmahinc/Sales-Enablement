import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

interface MaterialFormProps {
  material?: any
  onClose: () => void
}

export default function MaterialForm({ material, onClose }: MaterialFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    material_type: 'product_brief',
    audience: 'internal',
    product_name: '',
    universe_name: '',
    status: 'draft',
    description: '',
    tags: '',
    keywords: '',
    use_cases: '',
    pain_points: '',
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        material_type: material.material_type || 'product_brief',
        audience: material.audience || 'internal',
        product_name: material.product_name || '',
        universe_name: material.universe_name || '',
        status: material.status || 'draft',
        description: material.description || '',
        tags: Array.isArray(material.tags) ? material.tags.join(', ') : material.tags || '',
        keywords: Array.isArray(material.keywords) ? material.keywords.join(', ') : material.keywords || '',
        use_cases: Array.isArray(material.use_cases) ? material.use_cases.join(', ') : material.use_cases || '',
        pain_points: Array.isArray(material.pain_points) ? material.pain_points.join(', ') : material.pain_points || '',
      })
    }
  }, [material])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Create error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create material'
      alert(`Create failed: ${errorMessage}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/materials/${material.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update material'
      alert(`Update failed: ${errorMessage}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : [],
      use_cases: formData.use_cases ? formData.use_cases.split(',').map(uc => uc.trim()) : [],
      pain_points: formData.pain_points ? formData.pain_points.split(',').map(pp => pp.trim()) : [],
    }
    
    if (material) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-ovh"
          placeholder="Enter material name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Material Type *</label>
          <select
            required
            value={formData.material_type}
            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
            className="input-ovh"
          >
            <option value="product_brief">Product Brief</option>
            <option value="sales_enablement_deck">Sales Enablement Deck</option>
            <option value="product_portfolio">Product Portfolio</option>
            <option value="sales_deck">Sales Deck</option>
            <option value="datasheet">Datasheet</option>
            <option value="product_catalog">Product Catalog</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Audience *</label>
          <select
            required
            value={formData.audience}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            className="input-ovh"
          >
            <option value="internal">Internal</option>
            <option value="customer_facing">Customer Facing</option>
            <option value="shared_asset">Shared Asset</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Product Name</label>
          <input
            type="text"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="input-ovh"
            placeholder="e.g., Public Cloud Compute"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Universe</label>
          <select
            value={formData.universe_name}
            onChange={(e) => setFormData({ ...formData, universe_name: e.target.value })}
            className="input-ovh"
          >
            <option value="">Select Universe</option>
            <option value="Public Cloud">Public Cloud</option>
            <option value="Private Cloud">Private Cloud</option>
            <option value="Bare Metal">Bare Metal</option>
            <option value="Hosting & Collaboration">Hosting & Collaboration</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="input-ovh"
        >
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-ovh"
          placeholder="Brief description of the material"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="cloud, compute, storage"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Keywords</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            placeholder="scalability, performance"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Use Cases</label>
          <input
            type="text"
            value={formData.use_cases}
            onChange={(e) => setFormData({ ...formData, use_cases: e.target.value })}
            placeholder="disaster recovery, backup"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Pain Points</label>
          <input
            type="text"
            value={formData.pain_points}
            onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
            placeholder="cost optimization, vendor lock-in"
            className="input-ovh"
          />
          <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
        </div>
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
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : material ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
