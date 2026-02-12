import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Share2, Eye, Download, Clock, FileText, User, Filter, X } from 'lucide-react'
import { Link } from 'react-router-dom'

interface TimelineEvent {
  event_type: 'shared' | 'viewed' | 'downloaded'
  timestamp: string
  material_id: number
  material_name: string
  customer_email?: string | null
  customer_name?: string | null
  shared_link_id: number
}

interface Material {
  id: number
  name: string
}

interface CustomerStats {
  customer_email: string
  customer_name?: string | null
}

export default function CustomerEngagementTimeline({ 
  limit = 20,
  startDate,
  endDate
}: { 
  limit?: number
  startDate?: string
  endDate?: string
}) {
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [materialFilter, setMaterialFilter] = useState<number | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('') // 'shared', 'viewed', 'downloaded', or '' for all
  const [windowWidth, setWindowWidth] = useState<number>(1200)

  // Handle window resize
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Set initial width
    setWindowWidth(window.innerWidth)
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch available customers for filter
  const { data: customerStats } = useQuery<CustomerStats[]>({
    queryKey: ['shared-links-customer-stats'],
    queryFn: () => api.get('/shared-links/stats/customers?limit=100').then(res => res.data),
  })

  // Fetch available materials for filter
  const { data: materials } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  const { data: events, isLoading, error } = useQuery<TimelineEvent[]>({
    queryKey: ['customer-engagement-timeline', limit, customerFilter, materialFilter, eventTypeFilter, startDate, endDate],
    queryFn: () => {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit.toString())
      if (customerFilter) queryParams.append('customer_email', customerFilter)
      if (materialFilter) queryParams.append('material_id', materialFilter.toString())
      if (eventTypeFilter) queryParams.append('event_type', eventTypeFilter)
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)
      return api.get(`/shared-links/timeline?${queryParams}`).then(res => res.data)
    },
  })

  // Calculate events per row based on container width (estimate ~280px per event card)
  // MUST be called before any conditional returns
  const eventsPerRow = useMemo(() => {
    // Account for padding/margins: subtract ~80px for container padding
    const availableWidth = windowWidth - 80
    return Math.max(2, Math.floor(availableWidth / 280)) // ~280px per card, minimum 2 per row
  }, [windowWidth])
  
  // Organize events into rows with snake pattern (alternating directions)
  // MUST be called before any conditional returns
  const eventRows = useMemo(() => {
    if (!events || events.length === 0) {
      return []
    }
    
    const rows: TimelineEvent[][] = []
    for (let i = 0; i < events.length; i += eventsPerRow) {
      const row = events.slice(i, i + eventsPerRow)
      rows.push(row)
    }
    return rows
  }, [events, eventsPerRow])

  const hasActiveFilters = customerFilter || materialFilter || eventTypeFilter

  const clearFilters = () => {
    setCustomerFilter('')
    setMaterialFilter(null)
    setEventTypeFilter('')
  }

  // Render filters section (always visible)
  const renderFilters = () => (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Customer Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Customer
          </label>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All customers</option>
            {customerStats?.map((customer) => (
              <option key={customer.customer_email} value={customer.customer_email}>
                {customer.customer_name || customer.customer_email}
              </option>
            ))}
          </select>
        </div>

        {/* Material Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Material
          </label>
          <select
            value={materialFilter || ''}
            onChange={(e) => setMaterialFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All materials</option>
            {materials?.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>

        {/* Event Type Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Event Type
          </label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All events</option>
            <option value="shared">Shared only</option>
            <option value="viewed">Viewed only</option>
            <option value="downloaded">Downloaded only</option>
          </select>
        </div>
      </div>

      {/* Info note about viewed vs downloaded */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>Note:</strong> "Viewed" means the customer accessed the shared link page. "Downloaded" means they downloaded the document. These are separate events.
        </p>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {renderFilters()}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-4 border-primary-500 border-t-transparent"></div>
          <span className="ml-3 text-sm text-slate-500">Loading timeline...</span>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Timeline error:', error)
    return (
      <div className="space-y-4">
        {renderFilters()}
        <div className="text-center py-12">
          <Share2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-sm font-medium text-slate-900 mb-2">Error loading timeline</h3>
          <p className="text-xs text-slate-500">
            Please refresh the page or contact support if the issue persists
          </p>
        </div>
      </div>
    )
  }

  const hasNoResults = !events || events.length === 0

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'shared':
        return Share2
      case 'viewed':
        return Eye
      case 'downloaded':
        return Download
      default:
        return Clock
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'shared':
        return 'bg-primary-500 text-white'
      case 'viewed':
        return 'bg-violet-500 text-white'
      case 'downloaded':
        return 'bg-emerald-500 text-white'
      default:
        return 'bg-slate-500 text-white'
    }
  }

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'shared':
        return 'Shared'
      case 'viewed':
        return 'Viewed'
      case 'downloaded':
        return 'Downloaded'
      default:
        return eventType
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatDateHeader = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (eventDate.getTime() === today.getTime()) {
      return 'Today'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (eventDate.getTime() === yesterday.getTime()) {
      return 'Yesterday'
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters - always visible */}
      {renderFilters()}

      {/* Timeline or empty state */}
      {hasNoResults ? (
        <div className="text-center py-12">
          <Share2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-sm font-medium text-slate-900 mb-2">
            {hasActiveFilters ? 'No events match your filters' : 'No activity yet'}
          </h3>
          <p className="text-xs text-slate-500">
            {hasActiveFilters 
              ? 'Try adjusting your filters or clear them to see all events'
              : 'Start sharing materials with customers to see engagement timeline'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Snake layout: Multiple vertical timelines arranged horizontally */}
          {eventRows.length > 0 ? (
            <div className="flex flex-row gap-8 flex-wrap">
              {eventRows.map((row, rowIndex) => {
                const isEvenRow = rowIndex % 2 === 0
                // For snake pattern: even rows go left-to-right, odd rows go right-to-left
                const rowEvents = isEvenRow ? row : [...row].reverse()
                
                return (
                  <div 
                    key={rowIndex} 
                    className={`flex-1 min-w-[300px] max-w-[400px] ${isEvenRow ? '' : 'order-last'}`}
                    style={isEvenRow ? {} : { order: eventRows.length - rowIndex }}
                  >
                    {/* Vertical timeline for this column */}
                    <div className="relative">
                      {/* Date header for this column */}
                      {rowEvents.length > 0 && (
                        <div className="sticky top-0 bg-white z-10 py-2 mb-4">
                          <h3 className="text-sm font-semibold text-slate-700">
                            {formatDateHeader(rowEvents[0].timestamp)}
                          </h3>
                        </div>
                      )}

                      {/* Vertical line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                      {/* Events */}
                      <div className="space-y-4">
                        {rowEvents.map((event, eventIndex) => {
                          const Icon = getEventIcon(event.event_type)
                          const colorClass = getEventColor(event.event_type)
                          const isLast = eventIndex === rowEvents.length - 1

                          return (
                            <div key={`${event.shared_link_id}-${event.event_type}-${event.timestamp}`} className="relative flex items-start">
                              {/* Icon circle */}
                              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colorClass} shadow-sm`}>
                                <Icon className="w-4 h-4" />
                              </div>

                              {/* Content */}
                              <div className="ml-4 flex-1 min-w-0 pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
                                        {getEventLabel(event.event_type)}
                                      </span>
                                      <span className="text-xs text-slate-400">{formatTimestamp(event.timestamp)}</span>
                                    </div>
                                    
                                    <Link
                                      to={`/materials`}
                                      className="text-sm font-medium text-slate-900 hover:text-primary-600 truncate block"
                                    >
                                      {event.material_name}
                                    </Link>
                                    
                                    {event.customer_email && (
                                      <div className="flex items-center space-x-1 mt-1 text-xs text-slate-500">
                                        <User className="w-3 h-3" />
                                        <span className="truncate">
                                          {event.customer_name || event.customer_email}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Share2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-sm font-medium text-slate-900 mb-2">No events to display</h3>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
