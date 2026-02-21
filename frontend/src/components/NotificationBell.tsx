import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
// Simple date formatting function (no external dependency needed)
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

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [], refetch, error } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?unread_only=false').then(res => {
      console.log('Notifications API response:', res.data)
      return res.data
    }).catch(err => {
      console.error('Error fetching notifications:', err)
      throw err
    }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch unread count
  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(res => res.data),
    refetchInterval: 30000,
  })

  const unreadCount = unreadData?.unread_count || 0

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      api.put(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }
    setIsOpen(false)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const getNotificationLink = (notification: Notification): string => {
    if (notification.link_path) {
      return notification.link_path
    }
    // Default links based on type
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

  const allUnread = notifications.filter(n => !n.is_read)
  const allRead = notifications.filter(n => n.is_read)
  
  // Show up to 5 notifications total, prioritizing unread
  const maxDisplay = 5
  const unreadToShow = allUnread.slice(0, maxDisplay)
  const remainingSlots = maxDisplay - unreadToShow.length
  const readToShow = allRead.slice(0, remainingSlots)
  
  const unreadNotifications = unreadToShow
  const readNotifications = readToShow
  const totalDisplayed = unreadNotifications.length + readNotifications.length
  const hasMoreNotifications = notifications.length > totalDisplayed

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-primary-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {error ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Error loading notifications</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <>
                {/* Unread notifications */}
                {unreadNotifications.length > 0 && (
                  <div className="p-2">
                    {unreadNotifications.map((notification) => (
                      <Link
                        key={notification.id}
                        to={getNotificationLink(notification)}
                        onClick={() => handleNotificationClick(notification)}
                        className="block p-3 mb-2 rounded-lg bg-primary-50 hover:bg-primary-100 border-l-4 border-primary-500 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-slate-500">
                              {notification.sent_by_name && (
                                <span className="mr-2">by {notification.sent_by_name}</span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at))}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-primary-500"></div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Read notifications */}
                {readNotifications.length > 0 && (
                  <div className="p-2 border-t border-slate-200">
                    {readNotifications.map((notification) => (
                      <Link
                        key={notification.id}
                        to={getNotificationLink(notification)}
                        onClick={() => handleNotificationClick(notification)}
                        className="block p-3 mb-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-slate-400">
                              {notification.sent_by_name && (
                                <span className="mr-2">by {notification.sent_by_name}</span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at))}
                              </span>
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

          {/* Footer with "See all" link */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-slate-200">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {hasMoreNotifications 
                  ? `See all notifications (${notifications.length})`
                  : 'See all notifications'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
