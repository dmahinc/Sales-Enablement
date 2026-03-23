import { useState, useMemo, useCallback, useRef } from 'react'
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
  Check,
  Calendar,
  Pencil,
  ExternalLink,
  Save,
  FileText,
  ArrowLeft,
  ImagePlus,
  ImageIcon,
  FileSpreadsheet,
  Presentation,
  Video,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import ContentViewerModal from '../components/ContentViewerModal'
import MaterialThumbnail from '../components/MaterialThumbnail'
import { parseVideoEmbedUrl } from '../utils/videoEmbed'

const JOURNEY_SECTIONS = [
  '1. Problem & Business Case',
  '2. Solution Walkthrough',
  '3. Validation',
  '4. Commercials & Legal',
  'All Materials',
]

type RoomMaterial = {
  id: number
  material_id: number
  material_name: string
  material_type?: string
  file_name?: string
  file_format?: string
  persona_id?: number
  persona_name?: string
  section_name?: string
  display_order: number
}

type ActionPlanItem = {
  id: number
  title: string
  description?: string
  due_date?: string
  status: string
  assignee?: string
  display_order: number
}

type Room = {
  id: number
  unique_token: string
  name: string
  company_name?: string
  welcome_message?: string
  executive_summary?: string
  welcome_video_url?: string
  customer_logo_url?: string
  materials: RoomMaterial[]
  action_plan: ActionPlanItem[]
}

function buildMaterialsBySection(materials: RoomMaterial[]): Record<string, RoomMaterial[]> {
  const sections: Record<string, RoomMaterial[]> = {}
  for (const m of materials) {
    const sec = m.section_name || 'All Materials'
    if (!sections[sec]) sections[sec] = []
    sections[sec].push(m)
  }
  for (const sec of Object.keys(sections)) {
    sections[sec] = [...sections[sec]].sort((a, b) => a.display_order - b.display_order)
  }
  const ordered: Record<string, RoomMaterial[]> = {}
  for (const s of JOURNEY_SECTIONS) {
    if (s in sections) ordered[s] = sections[s]
  }
  for (const s of Object.keys(sections).sort()) {
    if (!(s in ordered)) ordered[s] = sections[s]
  }
  return ordered
}

export default function RoomEditView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const roomId = id ? parseInt(id, 10) : NaN

  const [localRoom, setLocalRoom] = useState<Partial<Room> | null>(null)
  const [addMaterialSection, setAddMaterialSection] = useState<string | null>(null)
  const [emptySections, setEmptySections] = useState<string[]>([])
  const [editingSection, setEditingSection] = useState<{ name: string; value: string } | null>(null)
  const [viewerMaterial, setViewerMaterial] = useState<{ id: number; name: string; fileFormat?: string } | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [recentsExpanded, setRecentsExpanded] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data: room, isLoading, error } = useQuery<Room>({
    queryKey: ['deal-room-edit', roomId],
    queryFn: () => api.get(`/deal-rooms/${roomId}`).then(res => res.data),
    enabled: !isNaN(roomId),
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials-published'],
    queryFn: () => api.get('/materials?status=published&limit=200').then(res => res.data),
    enabled: !!room,
  })

  const roomData = localRoom ?? room
  const sections = useMemo(() => {
    if (!roomData?.materials) return {}
    return buildMaterialsBySection(roomData.materials)
  }, [roomData?.materials])

  const sectionNames = useMemo(() => {
    const keys = Object.keys(sections)
    const fromMaterials = [...JOURNEY_SECTIONS.filter(s => s in sections || keys.length === 0), ...keys.filter(s => !JOURNEY_SECTIONS.includes(s))]
    const empty = emptySections.filter(s => !fromMaterials.includes(s))
    return [...fromMaterials, ...empty]
  }, [sections, emptySections])

  const materialIdsInRoom = useMemo(() => new Set((roomData?.materials ?? []).map(m => m.material_id)), [roomData?.materials])
  const availableMaterials = useMemo(() => (materials as any[]).filter((m: any) => !materialIdsInRoom.has(m.id)), [materials, materialIdsInRoom])

  const updateRoomMutation = useMutation({
    mutationFn: (data: Partial<Room>) => api.put(`/deal-rooms/${roomId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] })
      setLocalRoom(null)
      setSaveFeedback('Saved')
      setTimeout(() => setSaveFeedback(null), 2000)
    },
    onError: (err: Error) => {
      setSaveFeedback(err?.message || 'Save failed')
      setTimeout(() => setSaveFeedback(null), 3000)
    },
  })

  const addMaterialMutation = useMutation({
    mutationFn: ({ section, materialId }: { section: string; materialId: number }) =>
      api.post(`/deal-rooms/${roomId}/materials`, {
        material_id: materialId,
        section_name: section || undefined,
        display_order: (roomData?.materials ?? []).filter(m => (m.section_name || 'All Materials') === section).length,
      }),
    onSuccess: (_, { section }) => {
      queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] })
      setAddMaterialSection(null)
      setEmptySections(prev => prev.filter(s => s !== section))
    },
  })

  const removeMaterialMutation = useMutation({
    mutationFn: (materialId: number) => api.delete(`/deal-rooms/${roomId}/materials/${materialId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const updateMaterialMutation = useMutation({
    mutationFn: ({ materialId, data }: { materialId: number; data: { section_name?: string; display_order?: number } }) =>
      api.patch(`/deal-rooms/${roomId}/materials/${materialId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const updateSectionName = useCallback(
    (oldName: string, newName: string) => {
      if (oldName === newName) return
      const mats = sections[oldName] ?? []
      mats.forEach((m, i) => {
        updateMaterialMutation.mutate({
          materialId: m.material_id,
          data: { section_name: newName || undefined, display_order: i },
        })
      })
    },
    [sections, updateMaterialMutation]
  )

  const addActionPlanMutation = useMutation({
    mutationFn: (item: Partial<ActionPlanItem>) =>
      api.post(`/deal-rooms/${roomId}/action-plan`, {
        title: item.title || 'New milestone',
        status: 'pending',
        display_order: (roomData?.action_plan ?? []).length,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const updateActionPlanMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Partial<ActionPlanItem> }) =>
      api.put(`/deal-rooms/${roomId}/action-plan/${itemId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/deal-rooms/${roomId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const removeLogoMutation = useMutation({
    mutationFn: () => api.delete(`/deal-rooms/${roomId}/logo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const deleteActionPlanMutation = useMutation({
    mutationFn: (itemId: number) => api.delete(`/deal-rooms/${roomId}/action-plan/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-edit', roomId] }),
  })

  const handleSaveRoom = () => {
    if (!room) return
    if (!localRoom) {
      setSaveFeedback('No changes to save')
      setTimeout(() => setSaveFeedback(null), 2000)
      return
    }
    const payload: Record<string, unknown> = {}
    const editableFields = ['name', 'company_name', 'welcome_message', 'executive_summary', 'welcome_video_url'] as const
    for (const field of editableFields) {
      if (field in localRoom) {
        const newVal = localRoom[field]
        const origVal = room[field]
        if (newVal !== origVal) {
          payload[field] = newVal ?? ''
        }
      }
    }
    if (Object.keys(payload).length > 0) {
      updateRoomMutation.mutate(payload)
    } else {
      setSaveFeedback('No changes to save')
      setTimeout(() => setSaveFeedback(null), 2000)
    }
  }

  const handleFieldChange = (field: keyof Room, value: string | undefined) => {
    setLocalRoom(prev => (prev ? { ...prev, [field]: value } : { [field]: value }))
  }

  const handleDownload = async (materialId: number) => {
    if (downloading) return
    setDownloading(materialId)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${apiUrl}/deal-rooms/token/${roomData?.unique_token}/materials/${materialId}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const cd = res.headers.get('content-disposition')
      let filename = `material-${materialId}.pdf`
      if (cd) {
        const m = cd.match(/filename\*=UTF-8''(.+)/i) || cd.match(/filename="?([^";]+)"?/i)
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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center p-4">
        <p className="text-slate-600">
          <Link to="/login" className="text-[#006dc7] font-medium hover:underline">Sign in</Link> to edit this room.
        </p>
      </div>
    )
  }

  if (isLoading || !room) {
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
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Room Not Found</h1>
          <p className="text-slate-600 mb-4">You may not have permission to edit this room.</p>
          <Link to="/deal-rooms" className="text-[#006dc7] font-medium hover:underline">Back to Deal Rooms</Link>
        </div>
      </div>
    )
  }

  const videoEmbed = (roomData?.welcome_video_url || room.welcome_video_url) ? parseVideoEmbedUrl(roomData?.welcome_video_url || room.welcome_video_url!) : null
  const platformUrl = import.meta.env.VITE_PLATFORM_URL || window.location.origin

  return (
    <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900">
      {/* Edit mode banner */}
      <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between gap-4">
        <span className="font-medium flex items-center gap-2 shrink-0">
          <Pencil className="w-5 h-5" />
          Editing mode — changes are saved as you edit
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`${platformUrl}/room/${roomData?.unique_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/80 bg-transparent hover:bg-white/20 text-white font-semibold text-sm transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Preview
          </a>
          <button
            onClick={() => navigate('/deal-rooms')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/60 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to list
          </button>
          <button
            onClick={handleSaveRoom}
            disabled={updateRoomMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-amber-600 hover:bg-amber-50 font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {updateRoomMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save
          </button>
          {saveFeedback && (
            <span className="text-sm font-semibold text-white drop-shadow-sm">{saveFeedback}</span>
          )}
        </div>
      </div>

      {/* Header - editable, compact; customer logo or upload */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={logoInputRef}
              accept=".png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) uploadLogoMutation.mutate(f)
                e.target.value = ''
              }}
            />
            {roomData?.customer_logo_url ? (
              <div className="relative group">
                <img
                  src={roomData.customer_logo_url}
                  alt="Customer logo"
                  className="h-9 max-w-[140px] object-contain object-left"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 bg-black/40 rounded transition-opacity">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                    className="p-1 rounded bg-white/90 text-slate-700 hover:bg-white text-xs"
                    title="Change logo"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLogoMutation.mutate()}
                    disabled={removeLogoMutation.isPending}
                    className="p-1 rounded bg-red-500/90 text-white hover:bg-red-600 text-xs"
                    title="Remove logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="w-9 h-9 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-[#006dc7] hover:text-[#006dc7] transition-colors"
                title="Upload customer logo"
              >
                {uploadLogoMutation.isPending ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5" />
                )}
              </button>
            )}
            <div>
              <input
                type="text"
                value={roomData?.name ?? room.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                onBlur={handleSaveRoom}
                className="text-lg font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none w-full max-w-md"
              />
              <input
                type="text"
                value={roomData?.company_name ?? room.company_name ?? ''}
                onChange={e => handleFieldChange('company_name', e.target.value)}
                onBlur={handleSaveRoom}
                placeholder="Company name"
                className="text-sm text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none w-full max-w-md mt-0.5 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero - editable, bento layout */}
      <section className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/30 border-b border-slate-200 dark:border-slate-700 pb-8 md:pb-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {videoEmbed && (
              <div className="lg:col-span-8 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Video</span>
                </div>
                <div className="rounded-xl overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800 aspect-video">
                {videoEmbed.type === 'direct' ? (
                  <video src={videoEmbed.embedUrl} controls className="w-full h-full" />
                ) : (
                  <iframe
                    src={videoEmbed.embedUrl}
                    title="Welcome video"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )}
                </div>
              </div>
            )}
            {/* Block: Text */}
            <div className={videoEmbed ? 'lg:col-span-4' : 'lg:col-span-12'}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Text</span>
              </div>
              <div className="space-y-4">
                <div className="p-4 md:p-5 rounded-xl bg-[#e4f1fb]/80 dark:bg-[#003b6b]/20 border border-[#006dc7]/20 dark:border-[#006dc7]/30">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#006dc7] dark:text-[#21dadb] mb-2">
                    Executive Summary
                  </h2>
                  <textarea
                    value={roomData?.executive_summary ?? room.executive_summary ?? ''}
                    onChange={e => handleFieldChange('executive_summary', e.target.value)}
                    onBlur={handleSaveRoom}
                    placeholder="What we heard from you / Why us — short paragraph for buyers."
                    className="w-full bg-transparent text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap border-0 focus:ring-0 focus:outline-none resize-none min-h-[60px]"
                    rows={4}
                  />
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Welcome video URL</label>
                    <input
                      type="url"
                      value={roomData?.welcome_video_url ?? room.welcome_video_url ?? ''}
                      onChange={e => handleFieldChange('welcome_video_url', e.target.value)}
                      onBlur={handleSaveRoom}
                      placeholder="Loom, YouTube, or Vimeo URL"
                      className="input-ovh w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Welcome message (optional)</label>
                    <textarea
                      value={roomData?.welcome_message ?? room.welcome_message ?? ''}
                      onChange={e => handleFieldChange('welcome_message', e.target.value)}
                      onBlur={handleSaveRoom}
                      placeholder="Short welcome text"
                      className="input-ovh w-full text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating add bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">Add content:</span>
          <button
            onClick={() => setAddMaterialSection(addMaterialSection || JOURNEY_SECTIONS[0])}
            className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600"
            title="Add document"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const name = `New section ${emptySections.length + 1}`
              setEmptySections(prev => [...prev, name])
              setAddMaterialSection(name)
            }}
            className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600"
            title="Add section"
          >
            <Presentation className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 md:pt-4 md:pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="xl:col-span-9">
        {/* Block: Documents */}
        <section className="mb-8 pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Documents</h2>
            </div>
            <button
              onClick={() => setAddMaterialSection(JOURNEY_SECTIONS[0])}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add content
            </button>
          </div>

          {(roomData?.materials?.length ?? 0) === 0 && emptySections.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-4">No materials yet. Add materials to each section below.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {JOURNEY_SECTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setAddMaterialSection(s)}
                    className="btn-ovh-secondary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add to {s}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const name = `New section ${emptySections.length + 1}`
                    setEmptySections(prev => [...prev, name])
                    setAddMaterialSection(name)
                  }}
                  className="btn-ovh-secondary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add new section
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {sectionNames.map(sectionName => {
                const mats = sections[sectionName] || []
                return (
                  <div
                    key={sectionName}
                    className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                      <input
                        type="text"
                        value={editingSection?.name === sectionName ? editingSection.value : sectionName}
                        onFocus={() => setEditingSection({ name: sectionName, value: sectionName })}
                        onChange={e =>
                          setEditingSection(prev =>
                            prev && prev.name === sectionName ? { ...prev, value: e.target.value } : prev
                          )
                        }
                        onBlur={() => {
                          if (
                            editingSection &&
                            editingSection.name === sectionName &&
                            editingSection.value.trim() !== sectionName &&
                            mats.length > 0
                          ) {
                            updateSectionName(sectionName, editingSection.value.trim())
                          }
                          setEditingSection(null)
                        }}
                        className="flex-1 font-semibold text-slate-800 dark:text-slate-200 text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none"
                      />
                      <button
                        onClick={() => setAddMaterialSection(sectionName)}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400"
                        title="Add material"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {mats.map(m => (
                        <div
                          key={m.id}
                          className="group rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:shadow-lg relative"
                        >
                          <button
                            onClick={() => removeMaterialMutation.mutate(m.material_id)}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewerMaterial({ id: m.material_id, name: m.material_name, fileFormat: m.file_format })}
                            className="w-full text-left block"
                          >
                            <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                              <MaterialThumbnail
                                materialId={m.material_id}
                                token={roomData?.unique_token!}
                                fileFormat={m.file_format}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-3">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm line-clamp-2">{m.material_name}</p>
                              {m.persona_name && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.persona_name}</p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">{m.section_name || 'All Materials'}</p>
                            </div>
                          </button>
                          <div className="px-3 pb-3 flex gap-2">
                            <button
                              onClick={() => setViewerMaterial({ id: m.material_id, name: m.material_name, fileFormat: m.file_format })}
                              className="flex-1 py-1.5 text-xs font-medium text-[#006dc7] hover:bg-[#006dc7]/10 rounded-lg"
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleDownload(m.material_id)}
                              disabled={downloading === m.material_id}
                              className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                            >
                              {downloading === m.material_id ? <Loader className="w-3.5 h-3.5 animate-spin inline mr-1" /> : <Download className="w-3.5 h-3.5 inline mr-1" />}
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => {
                  const name = `New section ${emptySections.length + 1}`
                  setEmptySections(prev => [...prev, name])
                  setAddMaterialSection(name)
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-[#006dc7] hover:text-[#006dc7] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add new section
              </button>
            </div>
          )}
        </section>

        {/* Action plan - compact grid */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#006dc7] dark:text-[#21dadb]" />
            Action Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(roomData?.action_plan ?? room.action_plan ?? []).map(item => (
              <div
                key={item.id}
                className="flex items-start gap-5 p-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div
                  className={`w-8 h-8 rounded-full mt-0.5 flex items-center justify-center flex-shrink-0 ${
                    item.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : item.status === 'in_progress'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}
                >
                  {item.status === 'completed' ? <Check className="w-5 h-5" /> : null}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={e =>
                      setLocalRoom(prev => ({
                        ...prev,
                        action_plan: (prev?.action_plan ?? room.action_plan).map(a =>
                          a.id === item.id ? { ...a, title: e.target.value } : a
                        ),
                      }))
                    }
                    onBlur={() =>
                      updateActionPlanMutation.mutate({
                        itemId: item.id,
                        data: {
                          ...item,
                          due_date: item.due_date ? `${item.due_date}`.split('T')[0] : undefined,
                        },
                      })
                    }
                    className="w-full text-lg font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none"
                  />
                  <textarea
                    value={item.description ?? ''}
                    onChange={e =>
                      setLocalRoom(prev => ({
                        ...prev,
                        action_plan: (prev?.action_plan ?? room.action_plan).map(a =>
                          a.id === item.id ? { ...a, description: e.target.value } : a
                        ),
                      }))
                    }
                    onBlur={() =>
                      updateActionPlanMutation.mutate({
                        itemId: item.id,
                        data: {
                          ...item,
                          due_date: item.due_date ? `${item.due_date}`.split('T')[0] : undefined,
                        },
                      })
                    }
                    placeholder="Description"
                    className="w-full text-sm text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006dc7] focus:outline-none resize-none"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-4">
                    <input
                      type="date"
                      value={item.due_date ? `${item.due_date}`.split('T')[0] : ''}
                      onChange={e =>
                        setLocalRoom(prev => ({
                          ...prev,
                          action_plan: (prev?.action_plan ?? room.action_plan).map(a =>
                            a.id === item.id ? { ...a, due_date: e.target.value } : a
                          ),
                        }))
                      }
                      onBlur={() =>
                        updateActionPlanMutation.mutate({
                          itemId: item.id,
                          data: {
                            ...item,
                            due_date: item.due_date ? `${item.due_date}`.split('T')[0] : undefined,
                          },
                        })
                      }
                      className="input-ovh text-sm w-40"
                    />
                    <select
                      value={item.status}
                      onChange={e =>
                        updateActionPlanMutation.mutate({
                          itemId: item.id,
                          data: { ...item, status: e.target.value },
                        })
                      }
                      className="input-ovh text-sm w-32"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input
                      type="text"
                      value={item.assignee ?? ''}
                      onChange={e =>
                        setLocalRoom(prev => ({
                          ...prev,
                          action_plan: (prev?.action_plan ?? room.action_plan).map(a =>
                            a.id === item.id ? { ...a, assignee: e.target.value } : a
                          ),
                        }))
                      }
                      onBlur={() =>
                        updateActionPlanMutation.mutate({
                          itemId: item.id,
                          data: {
                            ...item,
                            due_date: item.due_date ? `${item.due_date}`.split('T')[0] : undefined,
                          },
                        })
                      }
                      placeholder="Assignee"
                      className="input-ovh text-sm w-32"
                    />
                  </div>
                </div>
                <button
                  onClick={() => deleteActionPlanMutation.mutate(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addActionPlanMutation.mutate({})}
              disabled={addActionPlanMutation.isPending}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-[#006dc7] hover:text-[#006dc7] transition-colors"
            >
              {addActionPlanMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Add milestone
            </button>
          </div>
        </section>

        <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#006dc7] flex items-center justify-center">
              <span className="text-white font-bold text-sm">OVH</span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              © 2026 OVHcloud Product Enablement & Customer Engagement Platform
            </span>
          </div>
        </footer>
          </div>

          {/* Recents sidebar - collapsed by default */}
          <aside className="xl:col-span-3">
            <div className="sticky top-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setRecentsExpanded(!recentsExpanded)}
                className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {recentsExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recents</h3>
                  {availableMaterials.length > 0 && !recentsExpanded && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">({availableMaterials.length})</span>
                  )}
                </div>
              </button>
              {recentsExpanded && (
              <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-3">
                  Available materials — click to add to a section
                </p>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {availableMaterials.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">All materials added</p>
                ) : (
                  availableMaterials.slice(0, 20).map((m: any) => {
                    const isPdf = (m.file_format || m.file_name || '').toLowerCase().includes('pdf')
                    const isSheet = (m.file_format || m.file_name || '').toLowerCase().match(/xlsx|xls|csv/)
                    const isPres = (m.file_format || m.file_name || '').toLowerCase().match(/pptx|ppt/)
                    return (
                      <button
                        key={m.id}
                        onClick={() => addMaterialMutation.mutate({ section: JOURNEY_SECTIONS[0], materialId: m.id })}
                        disabled={addMaterialMutation.isPending}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left group"
                      >
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100" />
                        <span
                          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                            isPres
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                              : isSheet
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                              : isPdf
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          {isPres ? <Presentation className="w-4 h-4" /> : isSheet ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{m.name}</span>
                      </button>
                    )
                  })
                )}
                </div>
              </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Add material modal */}
      {addMaterialSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Add material to &quot;{addMaterialSection}&quot;
              </h3>
              <button onClick={() => setAddMaterialSection(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableMaterials.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 py-4">
                  All published materials are already in this room. Add more materials from the Materials library first.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableMaterials.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => addMaterialMutation.mutate({ section: addMaterialSection, materialId: m.id })}
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

      {viewerMaterial && roomData?.unique_token && (
        <ContentViewerModal
          isOpen={!!viewerMaterial}
          onClose={() => setViewerMaterial(null)}
          materialId={viewerMaterial.id}
          materialName={viewerMaterial.name}
          fileFormat={viewerMaterial.fileFormat}
          token={roomData.unique_token}
          onDownload={() => handleDownload(viewerMaterial.id)}
        />
      )}
    </div>
  )
}
