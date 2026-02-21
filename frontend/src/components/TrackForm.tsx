import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Plus, X, GripVertical, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FileUploadModal from './FileUploadModal'

interface TrackFormProps {
  track?: any
  onClose: () => void
}

export default function TrackForm({ track, onClose }: TrackFormProps) {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    use_case: '',
    learning_objectives: '',
    target_audience: '',
    estimated_duration_minutes: '',
    status: 'draft',
    send_notification: false,
  })

  const [materials, setMaterials] = useState<Array<{
    material_id: number
    order: number
    step_description: string
    is_required: boolean
    material?: any
  }>>([])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadingForMaterialIndex, setUploadingForMaterialIndex] = useState<number | null>(null)

  const queryClient = useQueryClient()

  // Fetch available materials
  const { data: availableMaterials, refetch: refetchMaterials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  useEffect(() => {
    if (track) {
      setFormData({
        name: track.name || '',
        description: track.description || '',
        use_case: track.use_case || '',
        learning_objectives: track.learning_objectives || '',
        target_audience: track.target_audience || '',
        estimated_duration_minutes: track.estimated_duration_minutes?.toString() || '',
        status: track.status || 'draft',
        send_notification: false,
      })
      setMaterials(
        (track.materials || []).map((tm: any) => ({
          material_id: tm.material_id,
          order: tm.order,
          step_description: tm.step_description || '',
          is_required: tm.is_required !== false,
          material: tm.material,
        }))
      )
    }
  }, [track])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tracks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Create error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create track'
      alert(`Create failed: ${errorMessage}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/tracks/${track.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update track'
      alert(`Update failed: ${errorMessage}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData: any = {
      ...formData,
      estimated_duration_minutes: formData.estimated_duration_minutes
        ? parseInt(formData.estimated_duration_minutes)
        : null,
      materials: materials.map((m, idx) => ({
        material_id: m.material_id,
        order: m.order || idx + 1,
        step_description: m.step_description,
        is_required: m.is_required,
      })),
    }

    // Only include send_notification if user is PMM/Director and creating (not updating)
    if (!track && (isDirector || isPMM) && formData.send_notification !== undefined) {
      submitData.send_notification = formData.send_notification
    }

    if (track) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  const addMaterial = () => {
    setMaterials([
      ...materials,
      {
        material_id: 0,
        order: materials.length + 1,
        step_description: '',
        is_required: true,
      },
    ])
  }

  const removeMaterial = (index: number) => {
    const newMaterials = materials.filter((_, i) => i !== index)
    // Reorder
    newMaterials.forEach((m, idx) => {
      m.order = idx + 1
    })
    setMaterials(newMaterials)
  }

  const updateMaterial = (index: number, field: string, value: any) => {
    const newMaterials = [...materials]
    newMaterials[index] = { ...newMaterials[index], [field]: value }
    setMaterials(newMaterials)
  }

  const moveMaterial = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === materials.length - 1)
    ) {
      return
    }

    const newMaterials = [...materials]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newMaterials[index], newMaterials[newIndex]] = [
      newMaterials[newIndex],
      newMaterials[index],
    ]
    // Reorder
    newMaterials.forEach((m, idx) => {
      m.order = idx + 1
    })
    setMaterials(newMaterials)
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Track Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-ovh"
          placeholder="e.g., Disaster Recovery Use Case Track"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Use Case / Business Story *
        </label>
        <input
          type="text"
          required
          value={formData.use_case}
          onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
          className="input-ovh"
          placeholder="e.g., Disaster Recovery for Enterprise"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-ovh"
          placeholder="Brief description of what this track covers"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Learning Objectives
        </label>
        <textarea
          rows={3}
          value={formData.learning_objectives}
          onChange={(e) =>
            setFormData({ ...formData, learning_objectives: e.target.value })
          }
          className="input-ovh"
          placeholder="What will Sales learn from this track?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Target Audience
          </label>
          <input
            type="text"
            value={formData.target_audience}
            onChange={(e) =>
              setFormData({ ...formData, target_audience: e.target.value })
            }
            className="input-ovh"
            placeholder="e.g., Enterprise Sales Reps"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Estimated Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            value={formData.estimated_duration_minutes}
            onChange={(e) =>
              setFormData({ ...formData, estimated_duration_minutes: e.target.value })
            }
            className="input-ovh"
            placeholder="e.g., 60"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="input-ovh"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Materials Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-slate-700">
            Track Materials (in order)
          </label>
          <button
            type="button"
            onClick={addMaterial}
            className="btn-ovh-secondary text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Material
          </button>
        </div>

        <div className="space-y-3">
          {materials.map((material, index) => (
            <div
              key={index}
              className="card-ovh p-4 border-2 border-slate-200"
            >
              <div className="flex items-start space-x-3">
                <div className="flex flex-col space-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => moveMaterial(index, 'up')}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-primary-500 disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-500">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveMaterial(index, 'down')}
                    disabled={index === materials.length - 1}
                    className="text-slate-400 hover:text-primary-500 disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <select
                      required
                      value={material.material_id}
                      onChange={(e) =>
                        updateMaterial(index, 'material_id', parseInt(e.target.value))
                      }
                      className="input-ovh"
                    >
                      <option value={0}>Select Material</option>
                      {availableMaterials?.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.material_type?.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                    {material.material_id === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadingForMaterialIndex(index)
                          setIsUploadModalOpen(true)
                        }}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Can't find it? Upload new material
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={material.step_description}
                    onChange={(e) =>
                      updateMaterial(index, 'step_description', e.target.value)
                    }
                    className="input-ovh"
                    placeholder="What does this step teach? (optional)"
                  />

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={material.is_required}
                      onChange={(e) =>
                        updateMaterial(index, 'is_required', e.target.checked)
                      }
                      className="mr-2"
                    />
                    <label className="text-sm text-slate-600">Required step</label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeMaterial(index)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {materials.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No materials added yet. Click "Add Material" to start building the track.
            </div>
          )}
        </div>
      </div>

      {/* Send Notification (only for PMM/Director, only on create) */}
      {!track && (isDirector || isPMM) && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="send_notification"
            checked={formData.send_notification}
            onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
          />
          <label htmlFor="send_notification" className="ml-2 text-sm text-slate-700">
            Send notification to all users about this track
          </label>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button type="button" onClick={onClose} className="btn-ovh-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-ovh-primary disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : track
            ? 'Update'
            : 'Create'}
        </button>
      </div>
    </form>

    {/* Upload Material Modal - Outside form to prevent event bubbling */}
    <FileUploadModal
      isOpen={isUploadModalOpen}
      onClose={() => {
        setIsUploadModalOpen(false)
        setUploadingForMaterialIndex(null)
      }}
      allowOptionalSorting={true}
      keepOpenOnSuccess={false}
      onUploadSuccess={(uploadedMaterial) => {
        try {
          // Refetch materials to get the latest list
          refetchMaterials()
          
          // If uploading for a specific material row, update that row
          if (uploadingForMaterialIndex !== null) {
            updateMaterial(uploadingForMaterialIndex, 'material_id', uploadedMaterial.id)
            updateMaterial(uploadingForMaterialIndex, 'material', uploadedMaterial)
          } else {
            // Otherwise, add as a new material
            setMaterials([
              ...materials,
              {
                material_id: uploadedMaterial.id,
                order: materials.length + 1,
                step_description: '',
                is_required: true,
                material: uploadedMaterial,
              },
            ])
          }
          setUploadingForMaterialIndex(null)
        } catch (error) {
          console.error('Error handling uploaded material:', error)
          alert('Material uploaded successfully, but there was an error adding it to the track. Please refresh and try again.')
        }
      }}
    />
  </>
  )
}
