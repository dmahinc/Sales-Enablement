import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { MessageSquare, Send, Search, UserCircle, Clock, FileText, Eye, Download, Calendar, Mail, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: number
  customer_id: number
  sales_contact_id: number | null
  subject: string | null
  message: string
  sent_by_customer: boolean
  is_read: boolean
  read_at: string | null
  parent_message_id: number | null
  created_at: string
  customer_name: string | null
  customer_email: string | null
  sales_contact_name: string | null
}

interface Conversation {
  customer_id: number
  customer_name: string
  customer_email: string
  last_message: Message | null
  unread_count: number
  total_messages: number
  last_activity_at: string | null
}

interface CustomerContext {
  id: number
  email: string
  full_name: string
  company_name?: string
  assigned_date?: string
  shared_materials_count?: number
  total_views?: number
  total_downloads?: number
  last_engagement?: string
}

export default function SalesMessages() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations list
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['sales-conversations', searchQuery],
    queryFn: () => api.get('/sales/messages/conversations', {
      params: searchQuery ? { search: searchQuery } : {}
    }).then(res => res.data),
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  })

  // Fetch unread count
  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['sales-unread-count'],
    queryFn: () => api.get('/sales/messages/unread-count').then(res => res.data),
    refetchInterval: 10000,
  })

  // Fetch selected conversation messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['sales-conversation', selectedCustomerId],
    queryFn: () => api.get(`/sales/messages/${selectedCustomerId}`).then(res => res.data),
    enabled: !!selectedCustomerId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages in active conversation
  })

  // Fetch customer context (engagement info)
  const { data: customerContext } = useQuery<CustomerContext>({
    queryKey: ['customer-context', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null
      try {
        // Use the new engagement endpoint that calculates from MaterialUsage events
        const engagementRes = await api.get(`/sales/customers/${selectedCustomerId}/engagement`)
        return engagementRes.data
      } catch (e: any) {
        console.error('Error fetching engagement data:', e?.response?.data || e?.message || e)
        // Fallback: return basic customer info with zero engagement counts
        // This ensures the UI still shows customer info even if engagement endpoint fails
        try {
          const customerRes = await api.get(`/sales/customers`)
          const customer = (customerRes.data as any[]).find((c: any) => c.id === selectedCustomerId)
          
          if (!customer) return null
          
          // Get shared links count for basic info
          let sharedLinksCount = 0
          try {
            const sharedLinksRes = await api.get(`/shared-links`, { 
              params: { customer_email: customer.email } 
            })
            sharedLinksCount = sharedLinksRes.data?.length || 0
          } catch (e2) {
            // Ignore if endpoint fails
          }
          
          return {
            id: customer.id,
            email: customer.email,
            full_name: customer.full_name,
            company_name: customer.company_name,
            assigned_date: customer.created_at,
            shared_materials_count: sharedLinksCount,
            total_views: 0,
            total_downloads: 0,
            last_engagement: undefined
          }
        } catch (e2) {
          console.error('Fallback also failed:', e2)
          return null
        }
      }
    },
    enabled: !!selectedCustomerId,
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { customer_id: number; subject?: string; message: string; parent_message_id?: number | null }) =>
      api.post('/sales/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-conversation', selectedCustomerId] })
      queryClient.invalidateQueries({ queryKey: ['sales-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['sales-unread-count'] })
      setMessageText('')
      setMessageSubject('')
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) =>
      api.put(`/sales/messages/${messageId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-conversation', selectedCustomerId] })
      queryClient.invalidateQueries({ queryKey: ['sales-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['sales-unread-count'] })
    },
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark unread customer messages as read when viewing conversation
  useEffect(() => {
    if (selectedCustomerId && messages.length > 0) {
      const unreadCustomerMessages = messages.filter(
        msg => msg.sent_by_customer && !msg.is_read
      )
      unreadCustomerMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id)
      })
    }
  }, [selectedCustomerId, messages])

  const handleSendMessage = () => {
    if (!selectedCustomerId || !messageText.trim()) return
    
    sendMessageMutation.mutate({
      customer_id: selectedCustomerId,
      subject: messageSubject.trim() || undefined,
      message: messageText.trim(),
    })
  }

  const formatTime = (dateString: string) => {
    // Ensure timestamp is parsed as UTC if it doesn't have timezone info
    // Backend returns UTC timestamps without timezone suffix (e.g., "2026-02-25T22:10:51.786380")
    // We need to explicitly treat them as UTC
    let date: Date
    if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
      // Already has timezone info
      date = new Date(dateString)
    } else {
      // Naive datetime - assume UTC and append 'Z'
      date = new Date(dateString + 'Z')
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Use minute granularity for events less than 1 hour old (1-59 minutes)
    if (diffMins < 1) {
      return 'Just now'
    }
    // Show minutes for 1-59 minutes
    if (diffMins < 60) {
      return `${diffMins}m ago`
    }
    // After 1 hour (60+ minutes), use hour granularity
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`
    }
    return date.toLocaleDateString()
  }

  const selectedConversation = conversations.find(c => c.customer_id === selectedCustomerId)

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
      {/* Conversations List Sidebar */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Messages</h1>
            {unreadData && unreadData.unread_count > 0 && (
              <span className="px-2 py-1 text-xs font-semibold text-white bg-primary-600 rounded-full">
                {unreadData.unread_count}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 text-center text-slate-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-400" />
              <p>No customers assigned yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {conversations.map((conversation) => (
                <button
                  key={conversation.customer_id}
                  onClick={() => setSelectedCustomerId(conversation.customer_id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    selectedCustomerId === conversation.customer_id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 font-semibold text-sm">
                          {conversation.customer_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {conversation.customer_name}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary-600 rounded-full">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {conversation.customer_email}
                        </p>
                      </div>
                    </div>
                  </div>
                  {conversation.last_message ? (
                    <div className="mt-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {conversation.last_message.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatTime(conversation.last_activity_at || conversation.last_message.created_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                        No messages yet
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col">
        {selectedCustomerId ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-primary-700 dark:text-primary-300 font-semibold">
                      {selectedConversation?.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedConversation?.customer_name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedConversation?.customer_email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
              {messagesLoading ? (
                <div className="text-center text-slate-500 py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sent_by_customer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sent_by_customer
                            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            : 'bg-primary-600 text-white'
                        }`}
                      >
                        {message.subject && (
                          <p className={`font-semibold mb-1 ${
                            message.sent_by_customer ? 'text-slate-900 dark:text-slate-100' : 'text-white'
                          }`}>
                            {message.subject}
                          </p>
                        )}
                        <p className={`text-sm whitespace-pre-wrap ${
                          message.sent_by_customer ? 'text-slate-700 dark:text-slate-300' : 'text-white'
                        }`}>
                          {message.message}
                        </p>
                        <div className={`flex items-center justify-between mt-2 text-xs ${
                          message.sent_by_customer ? 'text-slate-400 dark:text-slate-500' : 'text-primary-100'
                        }`}>
                          <span>{formatTime(message.created_at)}</span>
                          {!message.sent_by_customer && message.is_read && (
                            <span className="ml-2">✓ Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Subject (optional)"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-end space-x-2">
                  <textarea
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    rows={3}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !messageText.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500 dark:text-slate-400">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Context Sidebar */}
      {selectedCustomerId && customerContext && (
        <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Customer Info</h3>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{customerContext.email}</p>
            </div>

            {customerContext.company_name && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Company</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{customerContext.company_name}</p>
              </div>
            )}

            {customerContext.assigned_date && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigned</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(customerContext.assigned_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Engagement Stats */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Engagement</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Materials Shared</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {customerContext.shared_materials_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Views</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {customerContext.total_views || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Downloads</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {customerContext.total_downloads || 0}
                  </span>
                </div>

                {customerContext.last_engagement && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Last Activity</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                      {formatTime(customerContext.last_engagement)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => window.location.href = `/sharing?customer=${selectedCustomerId}`}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>View Shared Materials</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
