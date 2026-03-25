import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, AlertCircle, Loader, Calendar, MessageSquare, Send, Eye, Check, Users, Activity, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import ContentViewerModal from '../components/ContentViewerModal'
import DsRoomInviteModal from '../components/DsRoomInviteModal'
import MaterialThumbnail from '../components/MaterialThumbnail'
import { parseVideoEmbedUrl } from '../utils/videoEmbed'

const JOURNEY_SECTIONS = [
  '1. Problem & Business Case',
  '2. Solution Walkthrough',
  '3. Validation',
  '4. Commercials & Legal',
  'All Materials',
]

export default function RoomView() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [viewerMaterial, setViewerMaterial] = useState<{ id: number; name: string; fileFormat?: string } | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: room, isLoading, error } = useQuery({
    queryKey: ['deal-room', token],
    queryFn: () => api.get(`/deal-rooms/token/${token}`).then(res => res.data),
    retry: false,
  })

  const { data: messages = [], isError: messagesError } = useQuery({
    queryKey: ['room-messages', room?.id],
    queryFn: () => api.get(`/deal-rooms/${room!.id}/messages`).then(res => res.data),
    enabled: !!room?.id && !!user,
    refetchInterval: 5000,
    retry: false,
  })

  const perms = (room as {
    my_permissions?: {
      can_message?: boolean
      can_download_materials?: boolean
      can_update_action_plan?: boolean
      can_invite_participants?: boolean
    }
    id?: number
  })?.my_permissions
  const canDownloadMaterials = !perms || perms.can_download_materials !== false
  const canUpdateActionPlan = !perms || perms.can_update_action_plan !== false
  const canMessage = !!user && !messagesError && (!perms || perms.can_message !== false)
  const canInviteOthers = !!perms?.can_invite_participants

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => api.post(`/deal-rooms/${room!.id}/messages`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-messages', room?.id] })
      setMessageText('')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
  })

  const markCompleteMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: number }) =>
      api.patch(`/deal-rooms/${room!.id}/action-plan/${itemId}/status`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-room', token] })
    },
  })

  const { data: participantList = [] } = useQuery({
    queryKey: ['deal-room-participants', room?.id],
    queryFn: () => api.get(`/deal-rooms/${room!.id}/participants`).then(res => res.data),
    enabled: !!room?.id && !!user && canInviteOthers,
  })

  const deleteParticipantMutation = useMutation({
    mutationFn: (participantId: number) => api.delete(`/deal-rooms/${room!.id}/participants/${participantId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-room-participants', room?.id] }),
  })

  // Force scroll to top on mount and when room content loads (prevents anchor/browser scroll to middle)
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto'
      }
    }
  }, [])
  useEffect(() => {
    if (room && !isLoading) {
      window.scrollTo(0, 0)
      // Delayed scroll to catch async content (messages, iframe) that may trigger browser scroll
      const id = setTimeout(() => window.scrollTo(0, 0), 400)
      return () => clearTimeout(id)
    }
  }, [room, isLoading])

  const handleDownload = async (materialId: number) => {
    if (downloading) return
    setDownloading(materialId)
    try {
      const res = await api.get(`/deal-rooms/token/${token}/materials/${materialId}/download`, {
        responseType: 'blob',
      })
      const blob = res.data as Blob
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const cd = res.headers['content-disposition']
      let filename = `material-${materialId}.pdf`
      if (cd) {
        const m = String(cd).match(/filename\*=UTF-8''(.+)/i) || String(cd).match(/filename="?([^";]+)"?/i)
        if (m) filename = decodeURIComponent(m[1].replace(/['"]/g, ''))
      }
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const handleSend = () => {
    if (!messageText.trim() || !room) return
    sendMessageMutation.mutate(messageText.trim())
  }

  const canMarkComplete = (item: { assignee?: string }) => {
    if (!user || !canUpdateActionPlan) return false
    return item.assignee === 'customer' || item.assignee === 'both'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center">
        <Loader className="h-12 w-12 text-[#006dc7] animate-spin" />
      </div>
    )
  }

  if (error || !room) {
    const is403 = (error as any)?.response?.status === 403
    return (
      <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 max-w-md text-center border border-slate-200 dark:border-slate-700">
          <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-5" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {is403 ? 'Access Denied' : 'Room Not Found'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {is403
              ? "You don't have access to this room. If you believe this is an error, contact your sales representative."
              : 'This Digital Sales Room is invalid, expired, or has been deactivated.'}
          </p>
        </div>
      </div>
    )
  }

  const sections = room.materials_by_section || {}
  const sectionNames = [...JOURNEY_SECTIONS.filter(s => s in sections), ...Object.keys(sections).filter(s => !JOURNEY_SECTIONS.includes(s))]
  const videoEmbed = room.welcome_video_url ? parseVideoEmbedUrl(room.welcome_video_url) : null

  // Flatten all materials with section for bento grid
  const allMaterials: { m: any; section: string }[] = []
  sectionNames.forEach(sectionName => {
    (sections[sectionName] || []).forEach((m: any) => allMaterials.push({ m, section: sectionName }))
  })

  return (
    <div className="min-h-screen bg-[#f7fafc] dark:bg-slate-900">
      {/* Compact header - customer logo or default OVH */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {room.customer_logo_url ? (
              <img
                src={room.customer_logo_url}
                alt="Customer logo"
                className="h-9 max-w-[140px] object-contain object-left"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#006dc7] flex items-center justify-center">
                <span className="text-white font-bold text-sm">OVH</span>
              </div>
            )}
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">{room.name}</h1>
              {room.company_name && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{room.company_name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero banner - personalized with Shared by avatar */}
      <section className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-primary-50 via-white to-teal-50/30 dark:from-slate-800 dark:to-slate-900/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-wrap items-start gap-4">
            {(room as any).created_by_name && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow">
                  {(room as any).created_by_avatar_url ? (
                    <img
                      src={(room as any).created_by_avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                      {((room as any).created_by_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shared by</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{(room as any).created_by_name}</p>
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Hello {(room as any).customer_name || (room as any).company_name || 'Team'},
              </h2>
              {room.welcome_message && (
                <p className="text-slate-700 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                  {room.welcome_message}
                </p>
              )}
            </div>
          </div>

          {/* Video + Executive Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mt-6">
            {videoEmbed && (
              <div className={`flex flex-col ${room.executive_summary ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
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
            {room.executive_summary && (
              <div className={`flex flex-col ${videoEmbed ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
                <div className="h-full p-4 md:p-5 rounded-xl bg-primary-50/80 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2">
                    Executive Summary
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {room.executive_summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Main content - bento materials + action plan */}
          <div className="xl:col-span-8 space-y-6">
            {/* Bento materials grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Materials & Documents</h2>
              </div>

              {allMaterials.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 py-6 text-sm">No materials in this room yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                  {allMaterials.map(({ m, section }) => (
                    <div
                      key={m.id}
                      className="group rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:shadow-lg hover:border-[#006dc7]/40 dark:hover:border-[#21dadb]/40 transition-all duration-200"
                    >
                      <button
                        onClick={() => setViewerMaterial({ id: m.material_id, name: m.material_name, fileFormat: m.file_format })}
                        className="w-full text-left block"
                      >
                        <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden">
                          <MaterialThumbnail
                            materialId={m.material_id}
                            token={token!}
                            fileFormat={m.file_format}
                            fill
                            className="object-cover"
                          />
                        </div>
                          <div className="p-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm group-hover:text-[#006dc7] dark:group-hover:text-[#21dadb] line-clamp-2">
                              {m.material_name}
                            </p>
                            {m.persona_name && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.persona_name}</p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{section}</p>
                          </div>
                        </button>
                        <div className="px-3 pb-3 flex gap-2">
                          <button
                            onClick={() => setViewerMaterial({ id: m.material_id, name: m.material_name, fileFormat: m.file_format })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#006dc7] dark:text-[#21dadb] hover:bg-[#006dc7]/10 dark:hover:bg-[#21dadb]/10 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(m.material_id)}
                            disabled={!canDownloadMaterials || downloading === m.material_id}
                            title={!canDownloadMaterials ? 'Download not enabled for your access level' : undefined}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {downloading === m.material_id ? (
                              <Loader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* Action plan - compact grid */}
            {room.action_plan && room.action_plan.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#006dc7] dark:text-[#21dadb]" />
                  Action Plan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {room.action_plan.map((item: any) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        item.status === 'completed'
                          ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : item.status === 'in_progress'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-600'
                        }`}
                      >
                        {item.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                        item.status === 'completed'
                          ? 'text-slate-500 dark:text-slate-400 line-through'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                          {item.due_date && (
                            <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                          )}
                          {item.assignee && <span>Assignee: {item.assignee}</span>}
                          <span className="capitalize">{item.status}</span>
                        </div>
                      </div>
                      {canMarkComplete(item) && item.status !== 'completed' && (
                        <button
                          onClick={() => markCompleteMutation.mutate({ itemId: item.id })}
                          disabled={markCompleteMutation.isPending}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {markCompleteMutation.isPending ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Complete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar - People, Activity, Messages */}
          <aside className="xl:col-span-4 space-y-4">
            {/* People */}
            <div className="xl:sticky xl:top-24">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                People
              </h2>
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                {room.company_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {room.company_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{room.company_name}</p>
                      {(room as any).customer_name && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{(room as any).customer_name}</p>
                      )}
                    </div>
                  </div>
                )}
                {(room as any).created_by_name && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-primary-600 text-xs font-semibold">
                        {((room as any).created_by_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{(room as any).created_by_name}</p>
                      <p className="text-xs text-slate-500">Sales</p>
                    </div>
                  </div>
                )}
                {!room.company_name && !(room as any).created_by_name && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Stakeholders in this deal</p>
                )}
              </div>
            </div>

            {canInviteOthers && user && (
              <div className="xl:sticky xl:top-24 mt-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary-500" />
                  Invite people
                </h2>
                <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add someone with an existing contact linked to this room&apos;s owner, or create a customer account (email + password) so they can
                    sign in. Viewer: view and messages. Contributor: also download. Co-host: can invite others.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    className="w-full py-2 rounded-lg bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white text-sm font-medium"
                  >
                    Invite someone…
                  </button>
                  {room?.id && (
                    <DsRoomInviteModal
                      roomId={room.id}
                      isOpen={inviteModalOpen}
                      onClose={() => setInviteModalOpen(false)}
                      onInvited={() => queryClient.invalidateQueries({ queryKey: ['deal-room-participants', room.id] })}
                    />
                  )}
                  {Array.isArray(participantList) && participantList.length > 0 && (
                    <ul className="text-xs border-t border-slate-200 dark:border-slate-600 pt-3 space-y-2 max-h-40 overflow-y-auto">
                      {(participantList as { id: number; email: string; role: string }[]).map(p => (
                        <li key={p.id} className="flex items-start justify-between gap-2">
                          <span className="text-slate-700 dark:text-slate-300 break-all">{p.email}</span>
                          <span className="text-slate-500 shrink-0 capitalize">{p.role.replace('_', ' ')}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${p.email}?`)) deleteParticipantMutation.mutate(p.id)
                            }}
                            className="text-red-600 hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Activity */}
            {(room as any).activity && (room as any).activity.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-500" />
                  Activity
                </h2>
                <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-2 max-h-48 overflow-y-auto">
                  {(room as any).activity.map((a: any, i: number) => (
                    <div key={i} className="text-sm">
                      <p className="text-slate-800 dark:text-slate-200">
                        <span className="font-medium">{a.material_name}</span> {a.action_label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.used_at ? new Date(a.used_at).toLocaleString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!user ? (
              <div className="xl:sticky xl:top-24 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <MessageSquare className="w-5 h-5 inline mr-2 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400 text-sm">
                  <Link to="/login" className="text-[#006dc7] dark:text-[#21dadb] font-medium hover:underline">Sign in</Link>
                  {' '}to message your sales rep or buying committee.
                </span>
              </div>
            ) : (
              <div className="xl:sticky xl:top-24">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#006dc7] dark:text-[#21dadb]" />
                  Messages
                </h2>
                {messagesError ? (
                  <p className="text-slate-500 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
                    You do not have access to messages in this room. Sign in with the email you were invited with, or contact your sales representative.
                  </p>
                ) : (
                  <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">No messages yet. Start the conversation.</p>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sent_by_customer ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-4 py-3 ${
                                msg.sent_by_customer
                                  ? 'bg-[#006dc7]/10 dark:bg-[#21dadb]/20 text-slate-800 dark:text-slate-200'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {msg.sender_name && (
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">{msg.sender_name}</p>
                              )}
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    {canMessage && (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                        <input
                          type="text"
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-[#006dc7]/30 focus:border-[#006dc7] outline-none transition-all"
                        />
                        <button
                          onClick={() => handleSend()}
                          disabled={!messageText.trim() || sendMessageMutation.isPending}
                          className="px-4 py-2 rounded-lg bg-[#006dc7] hover:bg-[#005294] dark:bg-[#21dadb] dark:hover:bg-[#1cc0c1] text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                          {sendMessageMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* Site footer */}
        <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#006dc7] flex items-center justify-center">
                <span className="text-white font-bold text-xs">OVH</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                © 2026 OVHcloud Product Enablement & Customer Engagement Platform
              </span>
            </div>
          </div>
        </footer>
      </main>

      {viewerMaterial && token && (
        <ContentViewerModal
          isOpen={!!viewerMaterial}
          onClose={() => setViewerMaterial(null)}
          materialId={viewerMaterial.id}
          materialName={viewerMaterial.name}
          fileFormat={viewerMaterial.fileFormat}
          token={token}
          onDownload={canDownloadMaterials ? () => handleDownload(viewerMaterial.id) : undefined}
        />
      )}
    </div>
  )
}
