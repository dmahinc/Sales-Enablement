import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Eye,
  Download,
  Save,
  FileText,
  ArrowLeft,
  Pencil,
  ExternalLink,
  GripVertical,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import ContentViewerModal from '../components/ContentViewerModal'
import MaterialThumbnail from '../components/MaterialThumbnail'

type TrackMaterial = {
  id: number
  material_id: number
  order: number
  step_description?: string
  is_required: boolean
  material?: {
    id: number
    name: string
    description?: string
    file_path?: string
    file_format?: string
  }
}

type Track = {
  id: number
  name: string
  description?: string
  use_case: string
  learning_objectives?: string
  target_audience?: string
  estimated_duration_minutes?: number
  status: string
  materials: TrackMaterial[]
}

export default function TrackEditView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const trackId = id ? parseInt(id, 10) : NaN

  const [localTrack, setLocalTrack] = useState<Partial<Track> | null>(null)
  const [addMaterialOpen, setAddMaterialOpen] = useState(false)
  const [viewerMaterial, setViewerMaterial] = useState<{ id: number; name: string; fileFormat?: string } | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  const canManage = user?.role === 'director' || user?.role === 'pmm' || user?.is_superuser

  const { data: track, isLoading, error } = useQuery<Track>({
    queryKey: ['track-edit', trackId],
    queryFn: () => api.get(`/tracks/${trackId}`).then(res => res.data),
    enabled: !isNaN(trackId),
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials-published'],
    queryFn: () => api.get('/materials?status=published&limit=200').then(res => res.data),
    enabled: !!track,
  })

  const trackData = localTrack ?? track
  const materialIdsInTrack = new Set((trackData?.materials ?? []).map(m => m.material_id))
  const availableMaterials = (materials as any[]).filter((m: any) => !materialIdsInTrack.has(m.id))

  const updateTrackMutation = useMutation({
    mutationFn: (data: Partial<Track>) => api.put(`/tracks/${trackId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-edit', trackId] })
      queryClient.invalidateQueries({ queryKey: ['track', trackId] })
      setLocalTrack(null)
      setSaveFeedback('Saved')
      setTimeout(() => setSaveFeedback(null), 2000)
    },
    onError: (err: Error) => {
      setSaveFeedback(err?.message || 'Save failed')
      setTimeout(() => setSaveFeedback(null), 3000)
    },
  })

  const addMaterialMutation = useMutation({
    mutationFn: (materialId: number) =>
      api.post(`/tracks/${trackId}/materials`, {
        material_id: materialId,
        order: (trackData?.materials ?? []).length + 1,
        step_description: '',
        is_required: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-edit', trackId] })
      queryClient.invalidateQueries({ queryKey: ['track', trackId] })
      setAddMaterialOpen(false)
    },
  })

  const removeMaterialMutation = useMutation({
    mutationFn: (materialId: number) => api.delete(`/tracks/${trackId}/materials/${materialId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-edit', trackId] })
      queryClient.invalidateQueries({ queryKey: ['track', trackId] })
    },
  })

  const updateMaterialMutation = useMutation({
    mutationFn: ({
      materialId,
      data,
    }: {
      materialId: number
      data: { order?: number; step_description?: string; is_required?: boolean }
    }) => api.patch(`/tracks/${trackId}/materials/${materialId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-edit', trackId] })
      queryClient.invalidateQueries({ queryKey: ['track', trackId] })
    },
  })

  const handleSaveTrack = useCallback(() => {
    if (!track) return
    if (!localTrack) {
      setSaveFeedback('No changes to save')
      setTimeout(() => setSaveFeedback(null), 2000)
      return
    }
    const payload: Record<string, unknown> = {}
    const editableFields = [
      'name',
      'description',
      'use_case',
      'learning_objectives',
      'target_audience',
      'estimated_duration_minutes',
      'status',
    ] as const
    for (const field of editableFields) {
      if (field in localTrack) {
        const newVal = localTrack[field]
        const origVal = track[field]
        if (newVal !== origVal) {
          payload[field] = newVal ?? (field === 'estimated_duration_minutes' ? null : '')
        }
      }
    }
    if (Object.keys(payload).length > 0) {
      updateTrackMutation.mutate(payload)
    } else {
      setSaveFeedback('No changes to save')
      setTimeout(() => setSaveFeedback(null), 2000)
    }
  }, [track, localTrack, updateTrackMutation])

  const handleFieldChange = (field: keyof Track, value: string | number | undefined) => {
    setLocalTrack(prev => (prev ? { ...prev, [field]: value } : { [field]: value }))
  }

  const handleDownload = async (materialId: number) => {
    if (downloading) return
    setDownloading(materialId)
    try {
      const res = await api.get(`/materials/${materialId}/download`, { responseType: 'blob' })
      const blob = res.data as Blob
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const cd = (res.headers as any)['content-disposition']
      let filename = `material-${materialId}.pdf`
      if (cd) {
        const m = (cd as string).match(/filename\*=UTF-8''(.+)/i) || (cd as string).match(/filename="?([^";]+)"?/i)
        if (m) filename = decodeURIComponent(m[1].replace(/['"]/g, ''))
      }
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const moveMaterial = (index: number, direction: 'up' | 'down') => {
    const mats = [...(trackData?.materials ?? [])]
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index >= mats.length - 1) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[mats[index], mats[newIndex]] = [mats[newIndex], mats[index]]
    const reordered = mats.map((m, i) => ({
      material_id: m.material_id,
      order: i + 1,
      step_description: m.step_description ?? '',
      is_required: m.is_required,
    }))
    updateTrackMutation.mutate({ materials: reordered })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center p-4">
        <p className="text-slate-600">
          <Link to="/login" className="text-[#006dc7] font-medium hover:underline">
            Sign in
          </Link>{' '}
          to edit this track.
        </p>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center p-4">
        <p className="text-slate-600">You don&apos;t have permission to edit tracks.</p>
        <Link to={`/tracks/${trackId}`} className="text-[#006dc7] font-medium hover:underline ml-2">
          View track
        </Link>
      </div>
    )
  }

  if (isLoading || !track) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center">
        <Loader className="h-12 w-12 text-[#006dc7] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center border border-slate-200">
          <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-5" />
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Track Not Found</h1>
          <p className="text-slate-600 mb-4">You may not have permission to edit this track.</p>
          <Link to="/tracks" className="text-[#006dc7] font-medium hover:underline">
            Back to Tracks
          </Link>
        </div>
      </div>
    )
  }

  const platformUrl = import.meta.env.VITE_PLATFORM_URL || window.location.origin

  return (
    <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900">
      {/* Edit mode banner - same as DSR */}
      <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between gap-4">
        <span className="font-medium flex items-center gap-2 shrink-0">
          <Pencil className="w-4 h-4" />
          Editing mode — changes are saved as you edit
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`${platformUrl}/tracks/${trackId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/80 bg-transparent hover:bg-white/20 text-white font-semibold text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </a>
          <button
            onClick={() => navigate('/tracks')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/60 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
          <button
            onClick={handleSaveTrack}
            disabled={updateTrackMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-amber-600 hover:bg-amber-50 font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {updateTrackMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
          {saveFeedback && (
            <span className="text-sm font-semibold text-white drop-shadow-sm">{saveFeedback}</span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        {/* Header - editable */}
        <header className="mb-10">
          <input
            type="text"
            value={trackData?.name ?? track.name}
            onChange={e => handleFieldChange('name', e.target.value)}
            onBlur={handleSaveTrack}
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none w-full mb-2"
          />
          <input
            type="text"
            value={trackData?.use_case ?? track.use_case}
            onChange={e => handleFieldChange('use_case', e.target.value)}
            onBlur={handleSaveTrack}
            placeholder="Use case / business story"
            className="text-sm text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none w-full max-w-xl placeholder-slate-400"
          />
        </header>

        {/* Overview - editable */}
        <section className="mb-10 p-6 rounded-2xl bg-[#e4f1fb]/80 dark:bg-[#003b6b]/20 border border-[#006dc7]/20 dark:border-[#006dc7]/30">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#006dc7] dark:text-[#21dadb] mb-3">
            Overview
          </h2>
          <textarea
            value={trackData?.description ?? track.description ?? ''}
            onChange={e => handleFieldChange('description', e.target.value)}
            onBlur={handleSaveTrack}
            placeholder="Brief description of what this track covers"
            className="w-full bg-transparent text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap border-0 focus:ring-0 focus:outline-none resize-none min-h-[60px] mb-4"
            rows={2}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Learning objectives
              </label>
              <textarea
                value={trackData?.learning_objectives ?? track.learning_objectives ?? ''}
                onChange={e => handleFieldChange('learning_objectives', e.target.value)}
                onBlur={handleSaveTrack}
                placeholder="What will Sales learn?"
                className="input-ovh w-full"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Target audience
              </label>
              <input
                type="text"
                value={trackData?.target_audience ?? track.target_audience ?? ''}
                onChange={e => handleFieldChange('target_audience', e.target.value)}
                onBlur={handleSaveTrack}
                placeholder="e.g., Enterprise Sales Reps"
                className="input-ovh w-full"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Estimated duration (min)
              </label>
              <input
                type="number"
                min="1"
                value={trackData?.estimated_duration_minutes ?? track.estimated_duration_minutes ?? ''}
                onChange={e =>
                  handleFieldChange(
                    'estimated_duration_minutes',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                onBlur={handleSaveTrack}
                className="input-ovh w-24"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
              <select
                value={trackData?.status ?? track.status}
                onChange={e => handleFieldChange('status', e.target.value)}
                onBlur={handleSaveTrack}
                className="input-ovh w-32"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </section>

        {/* Materials - WYSIWYG */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
            Courses
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
            Track Materials
          </h3>

          {(trackData?.materials?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-4">No materials yet. Add materials to build the learning path.</p>
              <button
                onClick={() => setAddMaterialOpen(true)}
                className="btn-ovh-secondary text-sm py-2 px-4 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add material
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(trackData?.materials ?? []).map((tm, index) => (
                <div
                  key={tm.id}
                  className="group flex items-start gap-4 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center gap-0.5 pt-1 flex-shrink-0">
                    <button
                      onClick={() => moveMaterial(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-[#006dc7] disabled:opacity-30"
                      title="Move up"
                    >
                      <GripVertical className="w-4 h-4 rotate-90" />
                    </button>
                    <span className="text-xs font-medium text-slate-500">{index + 1}</span>
                    <button
                      onClick={() => moveMaterial(index, 'down')}
                      disabled={index >= (trackData?.materials?.length ?? 0) - 1}
                      className="p-1 rounded text-slate-400 hover:text-[#006dc7] disabled:opacity-30"
                      title="Move down"
                    >
                      <GripVertical className="w-4 h-4 -rotate-90" />
                    </button>
                  </div>
                  <MaterialThumbnail
                    materialId={tm.material_id}
                    fileFormat={tm.material?.file_format}
                    useAuth
                    className="flex-shrink-0 w-24 h-32 rounded-xl"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {tm.material?.name || 'Material not found'}
                    </p>
                    <textarea
                      value={tm.step_description ?? ''}
                      onChange={e => {
                        setLocalTrack(prev => ({
                          ...prev,
                          materials: (prev?.materials ?? track.materials).map(m =>
                            m.material_id === tm.material_id ? { ...m, step_description: e.target.value } : m
                          ),
                        }))
                      }}
                      onBlur={e =>
                        updateMaterialMutation.mutate({
                          materialId: tm.material_id,
                          data: { step_description: (e.target as HTMLTextAreaElement).value },
                        })
                      }
                      placeholder="What does this step teach? (optional)"
                      className="input-ovh w-full text-sm"
                      rows={2}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tm.is_required}
                        onChange={e =>
                          updateMaterialMutation.mutate({
                            materialId: tm.material_id,
                            data: { is_required: e.target.checked },
                          })
                        }
                        className="w-4 h-4 rounded text-[#006dc7] focus:ring-[#006dc7]/30"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Required step</span>
                    </label>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() =>
                          setViewerMaterial({
                            id: tm.material_id,
                            name: tm.material?.name || 'Material',
                            fileFormat: tm.material?.file_format,
                          })
                        }
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#006dc7] dark:text-[#21dadb] hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(tm.material_id)}
                        disabled={downloading === tm.material_id || !tm.material?.file_path}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-50"
                      >
                        {downloading === tm.material_id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMaterialMutation.mutate(tm.material_id)}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-900/50 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAddMaterialOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-[#006dc7] hover:text-[#006dc7] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add material
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Add material modal */}
      {addMaterialOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Add material to track</h3>
              <button
                onClick={() => setAddMaterialOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableMaterials.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 py-4">
                  All published materials are already in this track. Add more materials from the Materials library first.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableMaterials.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => addMaterialMutation.mutate(m.id)}
                      disabled={addMaterialMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <FileText className="w-8 h-8 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewerMaterial && (
        <ContentViewerModal
          isOpen={!!viewerMaterial}
          onClose={() => setViewerMaterial(null)}
          materialId={viewerMaterial.id}
          materialName={viewerMaterial.name}
          fileFormat={viewerMaterial.fileFormat}
          useAuth
          onDownload={() => handleDownload(viewerMaterial.id)}
        />
      )}
    </div>
  )
}
