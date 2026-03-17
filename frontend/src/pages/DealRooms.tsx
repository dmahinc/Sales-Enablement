import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  Plus,
  Copy,
  ExternalLink,
  BarChart3,
  Loader,
  Trash2,
  Edit,
  Building2,
  Calendar,
  FileText,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const JOURNEY_SECTIONS = [
  '1. Problem & Business Case',
  '2. Solution Walkthrough',
  '3. Validation',
  '4. Commercials & Legal',
  'All Materials',
]

type Room = {
  id: number
  unique_token: string
  name: string
  company_name?: string
  customer_email?: string
  access_count: number
  last_accessed_at?: string
  expires_at: string
  is_active: boolean
  room_url: string
  materials: { material_id: number; material_name: string; section_name?: string }[]
  action_plan: { id: number; title: string; status: string }[]
}

export default function DealRooms() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    customer_email: '',
    customer_name: '',
    company_name: '',
    opportunity_name: '',
    welcome_message: '',
    executive_summary: '',
    welcome_video_url: '',
    expires_in_days: 90,
    material_ids: [] as number[],
    section_names: {} as Record<number, string>,
    persona_ids: {} as Record<number, number | null>,
    action_plan: [] as { title: string; description: string; due_date: string; status: string; assignee: string }[],
  })
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['deal-rooms'],
    queryFn: () => api.get('/deal-rooms').then(res => res.data),
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials-published'],
    queryFn: () => api.get('/materials?status=published&limit=200').then(res => res.data),
    enabled: showCreate,
  })

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then(res => res.data),
    enabled: showCreate,
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/deal-rooms', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-rooms'] })
      setShowCreate(false)
      resetCreateForm()
    },
  })

  const resetCreateForm = () =>
    setCreateForm({
      name: '',
      description: '',
      customer_email: '',
      customer_name: '',
      company_name: '',
      opportunity_name: '',
      welcome_message: '',
      executive_summary: '',
      welcome_video_url: '',
      expires_in_days: 90,
      material_ids: [],
      section_names: {},
      persona_ids: {},
      action_plan: [],
    })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/deal-rooms/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-rooms'] }),
  })

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('Room URL copied to clipboard')
  }

  const handleCreate = () => {
    const materialsPayload = createForm.material_ids.map((mid, i) => {
      const personaId = createForm.persona_ids[mid]
      const sectionName = createForm.section_names[mid]
      const persona = personaId ? (personas as any[]).find((p: any) => p.id === personaId) : null
      return {
        material_id: mid,
        persona_id: personaId || undefined,
        section_name: sectionName || (persona?.name ? `${persona.name} view` : undefined),
        display_order: i,
      }
    })
    const actionPlanPayload = createForm.action_plan.map((ap, i) => ({
      title: ap.title,
      description: ap.description || undefined,
      due_date: ap.due_date || undefined,
      status: ap.status || 'pending',
      assignee: ap.assignee || undefined,
      display_order: i,
    }))
    createMutation.mutate({
      name: createForm.name,
      description: createForm.description || undefined,
      customer_email: createForm.customer_email || undefined,
      customer_name: createForm.customer_name || undefined,
      company_name: createForm.company_name || undefined,
      opportunity_name: createForm.opportunity_name || undefined,
      welcome_message: createForm.welcome_message || undefined,
      executive_summary: createForm.executive_summary || undefined,
      welcome_video_url: createForm.welcome_video_url || undefined,
      expires_in_days: createForm.expires_in_days,
      materials: materialsPayload,
      action_plan: actionPlanPayload,
    })
  }

  const toggleMaterial = (id: number) => {
    setCreateForm(prev => ({
      ...prev,
      material_ids: prev.material_ids.includes(id)
        ? prev.material_ids.filter(m => m !== id)
        : [...prev.material_ids, id],
    }))
  }

  const setSection = (materialId: number, section: string) => {
    setCreateForm(prev => ({
      ...prev,
      section_names: { ...prev.section_names, [materialId]: section || '' },
    }))
  }

  const setPersona = (materialId: number, personaId: number | null) => {
    const persona = personaId ? (personas as any[]).find((p: any) => p.id === personaId) : null
    setCreateForm(prev => ({
      ...prev,
      persona_ids: { ...prev.persona_ids, [materialId]: personaId },
      section_names: personaId && persona
        ? { ...prev.section_names, [materialId]: `${persona.name} view` }
        : prev.section_names,
    }))
  }

  const addActionPlanItem = () => {
    setCreateForm(prev => ({
      ...prev,
      action_plan: [...prev.action_plan, { title: '', description: '', due_date: '', status: 'pending', assignee: '' }],
    }))
  }

  const updateActionPlanItem = (index: number, field: string, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      action_plan: prev.action_plan.map((ap, i) => (i === index ? { ...ap, [field]: value } : ap)),
    }))
  }

  const removeActionPlanItem = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      action_plan: prev.action_plan.filter((_, i) => i !== index),
    }))
  }

  const platformUrl = import.meta.env.VITE_PLATFORM_URL || window.location.origin

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Digital Sales Rooms</h1>
          <p className="text-slate-600 mt-1">
            Create branded microsites per opportunity. Curate materials, action plans, and track engagement.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-ovh-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Room
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card-ovh p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-700 mb-2">No deal rooms yet</h2>
          <p className="text-slate-500 mb-6">
            Create your first Digital Sales Room to present a curated story to your buying committee.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-ovh-primary">
            Create Your First Room
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rooms.map(room => (
            <div
              key={room.id}
              className="card-ovh p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">{room.name}</h3>
                  {!room.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">Inactive</span>
                  )}
                </div>
                {room.company_name && (
                  <p className="text-sm text-slate-500 mt-1">{room.company_name}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {room.materials?.length || 0} materials
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {room.access_count} views
                  </span>
                  {room.last_accessed_at && (
                    <span>Last viewed: {new Date(room.last_accessed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${platformUrl}/room/${room.unique_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ovh-secondary text-sm py-2 px-3 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
                <button
                  onClick={() => copyUrl(`${platformUrl}/room/${room.unique_token}`)}
                  className="btn-ovh-secondary text-sm py-2 px-3 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy URL
                </button>
                <Link
                  to={`/deal-rooms/${room.id}/edit`}
                  className="btn-ovh-secondary text-sm py-2 px-3 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
                <Link
                  to={`/deal-rooms/${room.id}/analytics`}
                  className="btn-ovh-secondary text-sm py-2 px-3 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Link>
                <button
                  onClick={() => deleteMutation.mutate(room.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Deactivate room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Create Digital Sales Room</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-ovh w-full"
                  placeholder="e.g. Acme Corp - Object Storage Deal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
                <input
                  type="text"
                  value={createForm.company_name}
                  onChange={e => setCreateForm(prev => ({ ...prev, company_name: e.target.value }))}
                  className="input-ovh w-full"
                  placeholder="Customer company"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer email</label>
                  <input
                    type="email"
                    value={createForm.customer_email}
                    onChange={e => setCreateForm(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="input-ovh w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer name</label>
                  <input
                    type="text"
                    value={createForm.customer_name}
                    onChange={e => setCreateForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="input-ovh w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Welcome message</label>
                <textarea
                  value={createForm.welcome_message}
                  onChange={e => setCreateForm(prev => ({ ...prev, welcome_message: e.target.value }))}
                  className="input-ovh w-full"
                  rows={2}
                  placeholder="Short welcome text for the room header."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Executive summary</label>
                <textarea
                  value={createForm.executive_summary}
                  onChange={e => setCreateForm(prev => ({ ...prev, executive_summary: e.target.value }))}
                  className="input-ovh w-full"
                  rows={3}
                  placeholder="What we heard from you / Why us - short paragraph for buyers."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Welcome video URL</label>
                <input
                  type="url"
                  value={createForm.welcome_video_url}
                  onChange={e => setCreateForm(prev => ({ ...prev, welcome_video_url: e.target.value }))}
                  className="input-ovh w-full"
                  placeholder="Loom, YouTube, or Vimeo URL (e.g. https://www.loom.com/share/xxx)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Materials (select persona/section)</label>
                <div className="border border-slate-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                  {(materials as any[]).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={createForm.material_ids.includes(m.id)}
                        onChange={() => toggleMaterial(m.id)}
                      />
                      <span className="flex-1 text-sm font-medium">{m.name}</span>
                      {createForm.material_ids.includes(m.id) && (
                        <div className="flex gap-2 items-center flex-wrap">
                          <select
                            value={JOURNEY_SECTIONS.includes(createForm.section_names[m.id] || '') ? createForm.section_names[m.id] : '__custom__'}
                            onChange={e => setSection(m.id, e.target.value === '__custom__' ? '' : e.target.value)}
                            className="input-ovh text-sm w-48"
                          >
                            <option value="">Select section</option>
                            {JOURNEY_SECTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="__custom__">Custom...</option>
                          </select>
                          {(!createForm.section_names[m.id] || !JOURNEY_SECTIONS.includes(createForm.section_names[m.id])) && (
                            <input
                              type="text"
                              value={createForm.section_names[m.id] || ''}
                              onChange={e => setSection(m.id, e.target.value)}
                              placeholder="Section name"
                              className="input-ovh text-sm w-36"
                            />
                          )}
                          <select
                            value={createForm.persona_ids[m.id] || ''}
                            onChange={e => setPersona(m.id, e.target.value ? parseInt(e.target.value) : null)}
                            className="input-ovh text-sm w-36"
                          >
                            <option value="">Persona (optional)</option>
                            {(personas as any[]).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Action plan (milestones)</label>
                <div className="space-y-3">
                  {createForm.action_plan.map((ap, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={ap.title}
                          onChange={e => updateActionPlanItem(i, 'title', e.target.value)}
                          placeholder="Milestone title"
                          className="input-ovh text-sm"
                        />
                        <input
                          type="date"
                          value={ap.due_date}
                          onChange={e => updateActionPlanItem(i, 'due_date', e.target.value)}
                          className="input-ovh text-sm"
                        />
                        <input
                          type="text"
                          value={ap.description}
                          onChange={e => updateActionPlanItem(i, 'description', e.target.value)}
                          placeholder="Description"
                          className="input-ovh text-sm col-span-2"
                        />
                        <select
                          value={ap.status}
                          onChange={e => updateActionPlanItem(i, 'status', e.target.value)}
                          className="input-ovh text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <input
                          type="text"
                          value={ap.assignee}
                          onChange={e => updateActionPlanItem(i, 'assignee', e.target.value)}
                          placeholder="Assignee (sales/customer)"
                          className="input-ovh text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActionPlanItem(i)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addActionPlanItem}
                    className="btn-ovh-secondary text-sm py-2 px-3 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add milestone
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expires in (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={createForm.expires_in_days}
                  onChange={e => setCreateForm(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) || 90 }))}
                  className="input-ovh w-24"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-ovh-secondary">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || createMutation.isPending}
                className="btn-ovh-primary disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
