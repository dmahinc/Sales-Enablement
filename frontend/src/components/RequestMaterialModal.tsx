import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import Modal from './Modal'
import ProductHierarchySelector from './ProductHierarchySelector'

interface RequestMaterialModalProps {
  isOpen: boolean
  onClose: () => void
}


const AUDIENCE_CATEGORIES = {
  'executive': {
    label: 'Executive / Strategic Personas',
    personas: ['CIO', 'CTO', 'CFO', 'CEO/Founder']
  },
  'it_operations': {
    label: 'IT & Operations Personas',
    personas: [
      'IT Manager / Infrastructure Manager',
      'Cloud Architect/Solutions Architect',
      'DevOps Engineer/platform Engineer',
      'Systems Administrator/Network Administrator',
      'Site Reliability Engineering (SRE)'
    ]
  },
  'security_compliance': {
    label: 'Security & Compliance Personas',
    personas: ['CISO', 'Compliance Officer', 'Data Protection Officer (DPO)', 'Security Engineer/security Analyst']
  },
  'development_application': {
    label: 'Development & Application Personas',
    personas: [
      'Software Developer / Application Developer',
      'Data Engineer',
      'Data Scientist / ML Engineer'
    ]
  },
  'line_of_business': {
    label: 'Line-of-Business & Product Personas',
    personas: [
      'Marketing / Digital Marketing Manager',
      'Product Manager / Product Owner',
      'Operations Manager / Business Unit Head'
    ]
  },
  'procurement_vendor': {
    label: 'Procurement & Vendor Management Personas',
    personas: ['Procurement Manager / Vendor Manager', 'Legal Counsel']
  },
  'emerging_specialized': {
    label: 'Emerging / Specialized Personas',
    personas: [
      'AI / ML Product Lead',
      'IoT / Edge Computing Engineer',
      'Cloud Evangelist / Innovation Manager'
    ]
  }
}

export default function RequestMaterialModal({ isOpen, onClose }: RequestMaterialModalProps) {
  const [formData, setFormData] = useState({
    material_type: '',
    universe_id: null as number | null,
    category_id: null as number | null,
    product_id: null as number | null,
    description: '',
    priority: 'medium',
    selectedAudienceCategories: [] as string[],
    selectedPersonas: {} as Record<string, string[]>, // {categoryKey: [personas]}
    use_case: '',
    needed_by_date: '',
    additional_notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/material-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      onClose()
      // Reset form
      setFormData({
        material_type: '',
        universe_id: null,
        category_id: null,
        product_id: null,
        description: '',
        priority: 'medium',
        selectedAudienceCategories: [],
        selectedPersonas: {},
        use_case: '',
        needed_by_date: '',
        additional_notes: '',
      })
      setErrors({})
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create material request'
      setErrors({ submit: errorMessage })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.material_type) newErrors.material_type = 'Material type is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Build products structure
    const productsData: any = {}
    if (formData.universe_id) {
      productsData.universe_ids = [formData.universe_id]
    }
    if (formData.category_id) {
      productsData.category_ids = [formData.category_id]
    }
    if (formData.product_id) {
      productsData.product_ids = [formData.product_id]
    }

    // Build target audience structure
    const targetAudience: any = {}
    if (formData.selectedAudienceCategories.length > 0) {
      targetAudience.categories = formData.selectedAudienceCategories
    }
    if (Object.keys(formData.selectedPersonas).length > 0) {
      targetAudience.personas = formData.selectedPersonas
    }

    // Prepare request data
    const requestData: any = {
      material_type: formData.material_type,
      description: formData.description,
      priority: formData.priority,
    }

    if (Object.keys(productsData).length > 0) {
      requestData.universe_ids = productsData.universe_ids || []
      requestData.category_ids = productsData.category_ids || []
      requestData.products = productsData.product_ids || []
    }

    if (Object.keys(targetAudience).length > 0) {
      requestData.target_audience = targetAudience
    }

    if (formData.use_case) {
      requestData.use_case = formData.use_case
    }
    if (formData.needed_by_date) {
      requestData.needed_by_date = new Date(formData.needed_by_date).toISOString()
    }
    if (formData.additional_notes) {
      requestData.additional_notes = formData.additional_notes
    }

    createMutation.mutate(requestData)
  }

  const toggleAudienceCategory = (categoryKey: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedAudienceCategories.includes(categoryKey)
      const newCategories = isSelected
        ? prev.selectedAudienceCategories.filter(c => c !== categoryKey)
        : [...prev.selectedAudienceCategories, categoryKey]
      
      // If deselecting category, remove all personas from that category
      const newPersonas = { ...prev.selectedPersonas }
      if (isSelected) {
        delete newPersonas[categoryKey]
      }
      
      return {
        ...prev,
        selectedAudienceCategories: newCategories,
        selectedPersonas: newPersonas
      }
    })
  }

  const togglePersona = (categoryKey: string, persona: string) => {
    setFormData(prev => {
      const categoryPersonas = prev.selectedPersonas[categoryKey] || []
      const newPersonas = {
        ...prev.selectedPersonas,
        [categoryKey]: categoryPersonas.includes(persona)
          ? categoryPersonas.filter(p => p !== persona)
          : [...categoryPersonas, persona]
      }
      return { ...prev, selectedPersonas: newPersonas }
    })
  }

  const selectAllPersonasInCategory = (categoryKey: string) => {
    const allPersonas = AUDIENCE_CATEGORIES[categoryKey as keyof typeof AUDIENCE_CATEGORIES].personas
    setFormData(prev => ({
      ...prev,
      selectedPersonas: {
        ...prev.selectedPersonas,
        [categoryKey]: allPersonas
      },
      selectedAudienceCategories: prev.selectedAudienceCategories.includes(categoryKey)
        ? prev.selectedAudienceCategories
        : [...prev.selectedAudienceCategories, categoryKey]
    }))
  }


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Material" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Material Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Material Type *
          </label>
          <select
            value={formData.material_type}
            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
            className={`input-ovh w-full ${errors.material_type ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select material type</option>
            <option value="Product Brief">Product Brief</option>
            <option value="Sales Deck">Sales Deck</option>
            <option value="Sales Enablement Deck">Sales Enablement Deck</option>
            <option value="Datasheet">Datasheet</option>
            <option value="Battle Card">Battle Card</option>
            <option value="Handling Objection">Handling Objection</option>
            <option value="One Pager">One Pager</option>
            <option value="Case Study">Case Study</option>
            <option value="Referral Architecture">Referral Architecture</option>
            <option value="Other">Other</option>
          </select>
          {errors.material_type && (
            <p className="mt-1 text-sm text-red-500">{errors.material_type}</p>
          )}
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Product
          </label>
          <p className="text-xs text-slate-500 mb-3">
            You may select a universe only, a universe and category, or all three (universe, category, and product)
          </p>
          <ProductHierarchySelector
            universeId={formData.universe_id}
            categoryId={formData.category_id}
            productId={formData.product_id}
            onUniverseChange={(id) => {
              setFormData(prev => ({
                ...prev,
                universe_id: id,
                category_id: null, // Reset category when universe changes
                product_id: null, // Reset product when universe changes
              }))
            }}
            onCategoryChange={(id) => {
              setFormData(prev => ({
                ...prev,
                category_id: id,
                product_id: null, // Reset product when category changes
              }))
            }}
            onProductChange={(id) => {
              setFormData(prev => ({
                ...prev,
                product_id: id,
              }))
            }}
            required={false}
            showLabels={true}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description / Needs *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className={`input-ovh w-full ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Explain what material you need and why..."
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Priority *
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="input-ovh w-full"
            required
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Target Audience
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Select one or more categories and personas within each category
          </p>
          
          <div className="space-y-4 border border-slate-300 rounded-lg p-4 max-h-96 overflow-y-auto">
            {Object.entries(AUDIENCE_CATEGORIES).map(([categoryKey, categoryData]) => {
              const isCategorySelected = formData.selectedAudienceCategories.includes(categoryKey)
              const categoryPersonas = formData.selectedPersonas[categoryKey] || []
              const allPersonasSelected = categoryData.personas.every(p => categoryPersonas.includes(p))
              
              return (
                <div key={categoryKey} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCategorySelected}
                        onChange={() => toggleAudienceCategory(categoryKey)}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {categoryData.label}
                      </span>
                    </label>
                    {isCategorySelected && (
                      <button
                        type="button"
                        onClick={() => selectAllPersonasInCategory(categoryKey)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        {allPersonasSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  
                  {isCategorySelected && (
                    <div className="ml-6 mt-2 space-y-1">
                      {categoryData.personas.map((persona) => (
                        <label
                          key={persona}
                          className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={categoryPersonas.includes(persona)}
                            onChange={() => togglePersona(categoryKey, persona)}
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-slate-600">{persona}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Use Case */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Use Case
          </label>
          <textarea
            value={formData.use_case}
            onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
            rows={3}
            className="input-ovh w-full"
            placeholder="Describe the specific use case or scenario..."
          />
        </div>

        {/* Needed By Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Needed By Date
          </label>
          <input
            type="date"
            value={formData.needed_by_date}
            onChange={(e) => setFormData({ ...formData, needed_by_date: e.target.value })}
            className="input-ovh w-full"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.additional_notes}
            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            rows={3}
            className="input-ovh w-full"
            placeholder="Any other requirements or context..."
          />
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="btn-ovh-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-ovh-primary disabled:opacity-50"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
