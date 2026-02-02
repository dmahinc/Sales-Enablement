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
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/materials/${material.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      onClose()
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Material Type *</label>
          <select
            required
            value={formData.material_type}
            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
          <label className="block text-sm font-medium text-gray-700">Audience *</label>
          <select
            required
            value={formData.audience}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="internal">Internal</option>
            <option value="customer_facing">Customer Facing</option>
            <option value="shared_asset">Shared Asset</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Universe Name</label>
          <input
            type="text"
            value={formData.universe_name}
            onChange={(e) => setFormData({ ...formData, universe_name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="cloud, compute, storage"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
        <input
          type="text"
          value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="scalability, performance, security"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Use Cases (comma-separated)</label>
        <input
          type="text"
          value={formData.use_cases}
          onChange={(e) => setFormData({ ...formData, use_cases: e.target.value })}
          placeholder="disaster recovery, backup, modernization"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Pain Points (comma-separated)</label>
        <input
          type="text"
          value={formData.pain_points}
          onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
          placeholder="cost optimization, vendor lock-in, compliance"
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
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : material ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
