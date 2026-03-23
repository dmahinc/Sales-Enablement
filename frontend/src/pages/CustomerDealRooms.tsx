import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { Building2, Loader, AlertCircle, ExternalLink, Calendar } from 'lucide-react'

interface DealRoom {
  id: number
  name: string
  company_name?: string
  opportunity_name?: string
  unique_token: string
  expires_at?: string
  updated_at?: string
}

export default function CustomerDealRooms() {
  const { user } = useAuth()
  const { data: rooms = [], isLoading, error } = useQuery<DealRoom[]>({
    queryKey: ['customer-deal-rooms'],
    queryFn: () => api.get('/customers/deal-rooms').then(res => res.data),
    enabled: user?.role === 'customer',
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no rooms or endpoint not ready)
      if (error?.response?.status === 404) return false
      return failureCount < 2
    },
  })

  if (user && user.role !== 'customer') {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-10 w-10 text-[#006dc7] animate-spin" />
      </div>
    )
  }

  // 404 = no rooms or endpoint not yet available — show friendly empty state
  const is404 = (error as any)?.response?.status === 404
  if (error && !is404) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 max-w-md text-center border border-slate-200 dark:border-slate-700">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Temporarily unable to load rooms</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Please try again in a moment. If the issue persists, contact your sales representative.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#006dc7] dark:text-[#21dadb]" />
            My Deal Rooms
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Digital Sales Rooms shared with you by your sales contacts.
          </p>
        </div>

        {(rooms.length === 0 || is404) ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No rooms yet</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
              When a sales rep shares a Digital Sales Room with you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <Link
                key={room.id}
                to={`/room/${room.unique_token}`}
                className="block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-[#006dc7]/40 dark:hover:border-[#21dadb]/40 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {room.name}
                    </h3>
                    {room.company_name && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {room.company_name}
                      </p>
                    )}
                    {room.opportunity_name && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {room.opportunity_name}
                      </p>
                    )}
                    {room.expires_at && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Expires {new Date(room.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-[#006dc7] dark:text-[#21dadb]">
                    Open
                    <ExternalLink className="w-5 h-5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
