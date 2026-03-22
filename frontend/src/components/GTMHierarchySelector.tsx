import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { ChevronDown, Search, Check } from 'lucide-react'

interface Segment {
  id: number
  name: string
  parent_segment_id: number | null
}

interface GTMHierarchySelectorProps {
  segmentIds: number[]
  onSegmentIdsChange: (segmentIds: number[]) => void
  required?: boolean
  showLabels?: boolean
}

export default function GTMHierarchySelector({
  segmentIds,
  onSegmentIdsChange,
  required = true,
  showLabels = true,
}: GTMHierarchySelectorProps) {
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: segments = [] } = useQuery<Segment[]>({
    queryKey: ['segments', 'all'],
    queryFn: () => api.get('/segments', { params: { all: true } }).then(res => res.data),
  })

  const gtmTree = useMemo(() => {
    const all = segments as Segment[]
    const parents = all.filter(s => !s.parent_segment_id)
    const children = all.filter(s => s.parent_segment_id != null)
    return parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_segment_id === p.id),
    }))
  }, [segments])

  const flatOptions = useMemo(() => {
    const opts: Array<{ value: number; label: string; parentName?: string }> = []
    gtmTree.forEach(parent => {
      opts.push({ value: parent.id, label: parent.name })
      ;(parent.children || []).forEach((child: Segment) => {
        opts.push({ value: child.id, label: child.name, parentName: parent.name })
      })
    })
    return opts
  }, [gtmTree])

  const filteredTree = useMemo(() => {
    if (!search.trim()) return gtmTree
    const q = search.toLowerCase()
    return gtmTree
      .map(p => ({
        ...p,
        children: (p.children || []).filter((c: Segment) =>
          c.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
        ),
      }))
      .filter(p =>
        p.name.toLowerCase().includes(q) || (p.children && p.children.length > 0)
      )
  }, [gtmTree, search])

  const selectedLabels = useMemo(() => {
    return segmentIds
      .map(id => flatOptions.find(o => o.value === id))
      .filter(Boolean)
      .map(o => o!.parentName ? `${o!.parentName} » ${o!.label}` : o!.label)
  }, [segmentIds, flatOptions])

  const toggleSegment = (id: number) => {
    if (segmentIds.includes(id)) {
      onSegmentIdsChange(segmentIds.filter(s => s !== id))
    } else {
      onSegmentIdsChange([...segmentIds, id])
    }
  }

  return (
    <div className="space-y-2">
      {showLabels && (
        <label className="block text-sm font-medium text-slate-700">
          GTM Segments {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full input-ovh flex items-center justify-between text-left min-h-[42px] ${
            segmentIds.length === 0 && required ? 'border-red-300' : ''
          }`}
        >
          <span className={selectedLabels.length ? 'text-slate-900' : 'text-slate-400'}>
            {selectedLabels.length > 0
              ? selectedLabels.join(', ')
              : 'Select GTM segments'}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search segments..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto py-1 flex-1">
              {filteredTree.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">No segments found</div>
              ) : (
                filteredTree.map(parent => (
                  <div key={parent.id}>
                    <button
                      type="button"
                      onClick={() => toggleSegment(parent.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                        segmentIds.includes(parent.id) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {segmentIds.includes(parent.id) && (
                        <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      )}
                      {!segmentIds.includes(parent.id) && <span className="w-4" />}
                      <span className="font-medium">{parent.name}</span>
                    </button>
                    {(parent.children || []).map((child: Segment) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => toggleSegment(child.id)}
                        className={`w-full text-left pl-6 pr-3 py-1.5 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                          segmentIds.includes(child.id) ? 'bg-primary-50 text-primary-600' : 'text-slate-600'
                        }`}
                      >
                        {segmentIds.includes(child.id) && (
                          <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        )}
                        {!segmentIds.includes(child.id) && <span className="w-4" />}
                        <span className="text-slate-600">{child.name}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {dropdownOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setDropdownOpen(false)
            setSearch('')
          }}
        />
      )}
    </div>
  )
}
