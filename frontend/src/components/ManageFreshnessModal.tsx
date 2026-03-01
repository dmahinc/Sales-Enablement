import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { X, CheckCircle, Clock, AlertTriangle, Search, ChevronUp, ChevronDown, Leaf } from 'lucide-react'

interface FreshnessMaterial {
  id: number
  name: string
  material_type: string | null
  other_type_description: string | null
  product_name: string | null
  universe_name: string | null
  status: string
  last_updated: string | null
  freshness_score: number
  health_score: number
}

interface AcknowledgeResult {
  material_id: number
  last_updated: string
  freshness_score: number
  health_score: number
}

function formatMaterialType(m: FreshnessMaterial): string {
  if (!m.material_type) return 'Unknown'
  const t = m.material_type.toLowerCase().trim()
  if (t === 'other' && m.other_type_description) return m.other_type_description
  return m.material_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Never'
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function FreshnessBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const label = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-700'
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${label} w-8 text-right`}>{score}%</span>
    </div>
  )
}

interface Props {
  onClose: () => void
}

export default function ManageFreshnessModal({ onClose }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'freshness_score' | 'last_updated' | 'name'>('freshness_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [confirming, setConfirming] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [acknowledged, setAcknowledged] = useState<Record<number, AcknowledgeResult>>({})

  const { data: materials = [], isLoading } = useQuery<FreshnessMaterial[]>({
    queryKey: ['health-my-materials'],
    queryFn: () => api.get('/health/my-materials').then(r => r.data),
  })

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.post(`/health/material/${id}/acknowledge-freshness`, { note: note || null }).then(r => r.data),
    onSuccess: (data: AcknowledgeResult) => {
      setAcknowledged(prev => ({ ...prev, [data.material_id]: data }))
      setConfirming(null)
      setNote('')
      // Invalidate health dashboard so scores refresh
      queryClient.invalidateQueries({ queryKey: ['health-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['health-my-materials'] })
    },
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return materials
      .filter(m =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.product_name || '').toLowerCase().includes(q) ||
        (m.universe_name || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let va: number | string, vb: number | string
        if (sortField === 'freshness_score') {
          va = acknowledged[a.id]?.freshness_score ?? a.freshness_score
          vb = acknowledged[b.id]?.freshness_score ?? b.freshness_score
        } else if (sortField === 'last_updated') {
          va = (acknowledged[a.id]?.last_updated ?? a.last_updated) || ''
          vb = (acknowledged[b.id]?.last_updated ?? b.last_updated) || ''
        } else {
          va = a.name.toLowerCase()
          vb = b.name.toLowerCase()
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [materials, search, sortField, sortDir, acknowledged])

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary-500" />
      : <ChevronDown className="w-3 h-3 text-primary-500" />
  }

  const isPmm = user?.role === 'pmm'
  const staleCount = filtered.filter(m => (acknowledged[m.id]?.freshness_score ?? m.freshness_score) < 70).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Manage Freshness</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isPmm
                  ? 'Acknowledge that your materials are still current — this resets their freshness score.'
                  : 'Acknowledge that materials are still current — this resets their freshness score.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search materials…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-ovh pl-9 py-1.5 text-sm w-full"
            />
          </div>
          {staleCount > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {staleCount} material{staleCount !== 1 ? 's' : ''} need attention
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
              <span className="ml-3 text-sm text-slate-500">Loading materials…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">
                {search ? 'No materials match your search' : 'No materials to manage'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200">
                  <th
                    className="text-left px-6 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <span className="flex items-center gap-1">Material <SortIcon field="name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Product</th>
                  <th
                    className="text-left px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort('last_updated')}
                  >
                    <span className="flex items-center gap-1">Last Updated <SortIcon field="last_updated" /></span>
                  </th>
                  <th
                    className="text-left px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort('freshness_score')}
                  >
                    <span className="flex items-center gap-1">Freshness <SortIcon field="freshness_score" /></span>
                  </th>
                  <th className="text-right px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(material => {
                  const result = acknowledged[material.id]
                  const currentScore = result?.freshness_score ?? material.freshness_score
                  const currentDate = result?.last_updated ?? material.last_updated
                  const isConfirming = confirming === material.id
                  const justAcknowledged = !!result

                  return (
                    <tr
                      key={material.id}
                      className={`hover:bg-slate-50 transition-colors ${justAcknowledged ? 'bg-emerald-50/40' : ''}`}
                    >
                      {/* Material */}
                      <td className="px-6 py-3">
                        <div className="flex items-start gap-2">
                          {justAcknowledged && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          )}
                          {!justAcknowledged && currentScore < 40 && (
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          {!justAcknowledged && currentScore >= 40 && currentScore < 70 && (
                            <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 leading-snug line-clamp-2 max-w-[220px]">
                              {material.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatMaterialType(material)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-700">{material.product_name || '—'}</span>
                        {material.universe_name && (
                          <p className="text-xs text-slate-400">{material.universe_name}</p>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs ${justAcknowledged ? 'text-emerald-600 font-medium' : 'text-slate-600'}`}>
                          {formatRelativeDate(currentDate)}
                        </span>
                      </td>

                      {/* Freshness */}
                      <td className="px-4 py-3">
                        <FreshnessBar score={currentScore} />
                      </td>

                      {/* Action */}
                      <td className="px-6 py-3 text-right">
                        {justAcknowledged ? (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            Acknowledged
                          </span>
                        ) : isConfirming ? (
                          <div className="flex flex-col items-end gap-2">
                            <input
                              type="text"
                              placeholder="Optional note…"
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              className="input-ovh text-xs py-1 px-2 w-44"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') acknowledgeMutation.mutate({ id: material.id, note })
                                if (e.key === 'Escape') { setConfirming(null); setNote('') }
                              }}
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setConfirming(null); setNote('') }}
                                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => acknowledgeMutation.mutate({ id: material.id, note })}
                                disabled={acknowledgeMutation.isPending}
                                className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1 rounded-lg transition-colors"
                              >
                                {acknowledgeMutation.isPending ? 'Saving…' : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setConfirming(material.id); setNote('') }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filtered.length} of {materials.length} material{materials.length !== 1 ? 's' : ''}
          </span>
          <span className="italic">
            Acknowledging resets the freshness clock to today without re-uploading the file.
          </span>
        </div>
      </div>
    </div>
  )
}
