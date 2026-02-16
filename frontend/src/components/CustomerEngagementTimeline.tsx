import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Share2, Eye, Download, Clock, User, Filter, X } from 'lucide-react'
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

interface GroupedEvents {
  dateLabel: string
  dateKey: string
  events: TimelineEvent[]
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

  // Fetch available customers for filter
  const { data: customerStats, isLoading: isLoadingCustomers, error: customerError } = useQuery<CustomerStats[]>({
    queryKey: ['shared-links-customer-stats'],
    queryFn: () => api.get('/shared-links/stats/customers?limit=100').then(res => res.data || []),
    retry: 1,
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

  // Helper function to format date header (must be defined before useMemo)
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

  // Group events by date
  const groupedEvents = useMemo<GroupedEvents[]>(() => {
    if (!events || events.length === 0) {
      return []
    }

    // Group events by date
    const groups = new Map<string, TimelineEvent[]>()
    
    events.forEach(event => {
      const date = new Date(event.timestamp)
      const dateKey = date.toDateString() // e.g., "Mon Jan 15 2024"
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(event)
    })

    // Convert to array and sort by date (newest first)
    const grouped: GroupedEvents[] = Array.from(groups.entries())
      .map(([dateKey, events]) => {
        // Sort events within group by timestamp (newest first)
        const sortedEvents = events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        
        return {
          dateKey,
          dateLabel: formatDateHeader(sortedEvents[0].timestamp),
          events: sortedEvents
        }
      })
      .sort((a, b) => {
        // Sort groups by date (newest first)
        return new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
      })

    return grouped
  }, [events])

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
            disabled={isLoadingCustomers}
          >
            <option value="">All customers</option>
            {isLoadingCustomers ? (
              <option disabled>Loading customers...</option>
            ) : customerError ? (
              <option disabled>Error loading customers</option>
            ) : customerStats && customerStats.length > 0 ? (
              customerStats.map((customer) => (
                <option key={customer.customer_email} value={customer.customer_email}>
                  {customer.customer_name || customer.customer_email}
                </option>
              ))
            ) : (
              <option disabled>No customers found</option>
            )}
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
        <div className="space-y-6">
          {/* Grouped Timeline: Date blocks */}
          {groupedEvents.map((group, groupIndex) => (
            <div 
              key={group.dateKey} 
              className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Date Header */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {group.dateLabel}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ({group.events.length} {group.events.length === 1 ? 'event' : 'events'})
                  </span>
                </div>
              </div>

              {/* Events List */}
              <div className="divide-y divide-slate-100">
                {group.events.map((event, eventIndex) => {
                  const Icon = getEventIcon(event.event_type)
                  const colorClass = getEventColor(event.event_type)
                  const isLast = eventIndex === group.events.length - 1

                  return (
                    <div 
                      key={`${event.shared_link_id}-${event.event_type}-${event.timestamp}`}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${colorClass} shadow-sm`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${colorClass}`}>
                                  {getEventLabel(event.event_type)}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTimestamp(event.timestamp)}
                                </span>
                              </div>
                              
                              <Link
                                to={`/materials`}
                                className="text-sm font-medium text-slate-900 hover:text-primary-600 block truncate"
                              >
                                {event.material_name}
                              </Link>
                            </div>
                          </div>
                          
                          {event.customer_email && (
                            <div className="flex items-center space-x-1 mt-2 text-xs text-slate-600">
                              <User className="w-3.5 h-3.5" />
                              <span className="truncate">
                                {event.customer_name || event.customer_email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
