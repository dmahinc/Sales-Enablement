import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'

// Simple date formatting function
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

interface Notification {
  id: number
  title: string
  message: string
  notification_type: 'material' | 'product_release' | 'marketing_update' | 'track'
  target_id: number
  link_path: string | null
  sent_by_name: string | null
  sent_by_email: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export default function Notifications() {
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?unread_only=false').then(res => res.data),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      api.put(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  const getNotificationLink = (notification: Notification): string => {
    if (notification.link_path) {
      return notification.link_path
    }
    switch (notification.notification_type) {
      case 'material':
        return '/materials'
      case 'product_release':
        return '/product-releases'
      case 'marketing_update':
        return '/marketing-updates'
      case 'track':
        return '/tracks'
      default:
        return '/'
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const unreadNotifications = notifications.filter(n => !n.is_read)
  const readNotifications = notifications.filter(n => n.is_read)
  const hasUnread = unreadNotifications.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Error loading notifications. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {hasUnread && (
              <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                {unreadNotifications.length} unread
              </span>
            )}
          </div>
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-200">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Bell className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            <>
              {/* Unread notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  {unreadNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={getNotificationLink(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className="block p-6 hover:bg-primary-50 transition-colors border-l-4 border-primary-500 bg-primary-50/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="h-2 w-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-base font-semibold text-slate-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-slate-600 mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center mt-3 text-xs text-slate-500">
                                {notification.sent_by_name && (
                                  <span className="mr-3">by {notification.sent_by_name}</span>
                                )}
                                <span>{formatDistanceToNow(new Date(notification.created_at))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {readNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={getNotificationLink(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className="block p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-slate-700">
                            {notification.title}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-3 text-xs text-slate-400">
                            {notification.sent_by_name && (
                              <span className="mr-3">by {notification.sent_by_name}</span>
                            )}
                            <span>{formatDistanceToNow(new Date(notification.created_at))}</span>
                            {notification.is_read && (
                              <span className="ml-3 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
