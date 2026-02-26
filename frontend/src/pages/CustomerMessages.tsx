import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { MessageSquare, Send, UserCircle, Clock } from 'lucide-react'
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
  sales_contact_name: string | null
}

interface SalesContact {
  id: number
  name: string
  email: string
  role: string
}

export default function CustomerMessages() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch dashboard data to get sales contacts
  const { data: dashboardData } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get('/customers/dashboard').then(res => res.data),
  })

  const salesContacts: SalesContact[] = dashboardData?.sales_contacts || []

  // Fetch messages for selected contact
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['customer-messages', selectedContactId],
    queryFn: () => api.get('/customers/messages', {
      params: selectedContactId ? { sales_contact_id: selectedContactId } : {}
    }).then(res => res.data),
    enabled: !!selectedContactId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { sales_contact_id?: number; subject?: string; message: string; parent_message_id?: number | null }) =>
      api.post('/customers/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages', selectedContactId] })
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
      setMessageText('')
      setMessageSubject('')
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: (error: any) => {
      console.error('Error sending message:', error)
      alert(error?.response?.data?.detail || 'Failed to send message. Please try again.')
    },
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) =>
      api.put(`/customers/messages/${messageId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages', selectedContactId] })
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
    },
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark unread sales messages as read when viewing conversation
  useEffect(() => {
    if (selectedContactId && messages.length > 0) {
      const unreadSalesMessages = messages.filter(
        msg => !msg.sent_by_customer && !msg.is_read
      )
      unreadSalesMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id)
      })
    }
  }, [selectedContactId, messages])

  // Auto-select first contact if available
  useEffect(() => {
    if (salesContacts.length > 0 && !selectedContactId) {
      setSelectedContactId(salesContacts[0].id)
    }
  }, [salesContacts])

  const handleSendMessage = () => {
    if (!selectedContactId || !messageText.trim()) return
    
    sendMessageMutation.mutate({
      sales_contact_id: selectedContactId,
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

  const selectedContact = salesContacts.find(c => c.id === selectedContactId)

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
      {/* Contacts Sidebar */}
      {salesContacts.length > 1 && (
        <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sales Contacts</h1>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {salesContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                  selectedContactId === contact.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-primary-700 dark:text-primary-300 font-semibold text-sm">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {contact.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col">
        {selectedContactId && selectedContact ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <span className="text-primary-700 dark:text-primary-300 font-semibold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedContact.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedContact.email}
                  </p>
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
                      className={`flex ${message.sent_by_customer ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sent_by_customer
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {message.subject && (
                          <p className={`font-semibold mb-1 ${
                            message.sent_by_customer ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {message.subject}
                          </p>
                        )}
                        <p className={`text-sm whitespace-pre-wrap ${
                          message.sent_by_customer ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {message.message}
                        </p>
                        <div className={`flex items-center justify-between mt-2 text-xs ${
                          message.sent_by_customer ? 'text-primary-100' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          <span>{formatTime(message.created_at)}</span>
                          {message.sent_by_customer && message.is_read && (
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
              <p className="text-slate-500 dark:text-slate-400">
                {salesContacts.length === 0 
                  ? 'No sales contacts available. Materials will be shared with you soon.'
                  : 'Select a contact to start messaging'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
