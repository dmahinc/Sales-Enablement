import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { 
  FileText, 
  Download,
  MessageSquare,
  User,
  Mail,
  Clock,
  CheckCircle,
  Send,
  X,
  Eye
} from 'lucide-react'
import Modal from '../components/Modal'

interface SharedMaterial {
  material_id: number
  material_name: string
  material_type: string
  product_name?: string
  universe_name?: string
  file_name?: string
  file_format?: string
  shared_at?: string
  shared_by?: string
  shared_by_email?: string
  share_token: string
  access_count: number
  download_count: number
  expires_at?: string
}

interface SalesContact {
  id: number
  name: string
  email: string
  role: string
}

interface Message {
  id: number
  sales_contact_id?: number
  sales_contact_name?: string
  subject?: string
  message: string
  sent_by_customer: boolean
  is_read: boolean
  created_at: string
  parent_message_id?: number
}

export default function CustomerDashboard() {
  const [selectedContact, setSelectedContact] = useState<SalesContact | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageSubject, setMessageSubject] = useState('')
  const [messageText, setMessageText] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<SharedMaterial | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get('/customers/dashboard').then(res => res.data),
  })

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['customer-messages', selectedContact?.id],
    queryFn: () => api.get('/customers/messages', {
      params: selectedContact ? { sales_contact_id: selectedContact.id } : {}
    }).then(res => res.data),
    enabled: !!selectedContact,
  })

  const queryClient = useQueryClient()

  const sendMessageMutation = useMutation({
    mutationFn: (data: { sales_contact_id?: number, subject?: string, message: string }) =>
      api.post('/customers/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages'] })
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
      setShowMessageModal(false)
      setMessageSubject('')
      setMessageText('')
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) =>
      api.put(`/customers/messages/${messageId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages'] })
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
    },
  })

  const handleDownload = async (material: SharedMaterial) => {
    try {
      const response = await api.get(`/shared-links/token/${material.share_token}/download`, {
        responseType: 'blob',
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = material.file_name || material.material_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Refresh dashboard to update download counts
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] })
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download material. The link may have expired.')
    }
  }

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      alert('Please enter a message')
      return
    }

    sendMessageMutation.mutate({
      sales_contact_id: selectedContact?.id,
      subject: messageSubject.trim() || undefined,
      message: messageText.trim(),
    })
  }

  const handleOpenMessage = (contact: SalesContact) => {
    setSelectedContact(contact)
    setShowMessageModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading dashboard. Please try again later.</p>
        </div>
      </div>
    )
  }

  const sharedMaterials: SharedMaterial[] = data?.shared_materials || []
  const salesContacts: SalesContact[] = data?.sales_contacts || []
  const unreadCount = data?.unread_messages_count || 0

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-400">My Customer Portal</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Access your shared materials and communicate with your sales contact</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Shared Materials</p>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-400 mt-2">
                {sharedMaterials.length}
              </p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Sales Contacts</p>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-400 mt-2">
                {salesContacts.length}
              </p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900 p-3 rounded-lg">
              <User className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="card-ovh p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Unread Messages</p>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-400 mt-2">
                {unreadCount}
              </p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-lg">
              <MessageSquare className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Contacts */}
      {salesContacts.length > 0 && (
        <div className="card-ovh">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-400">Your Sales Contacts</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salesContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{contact.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{contact.email}</p>
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                        {contact.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenMessage(contact)}
                    className="mt-4 w-full btn-ovh-secondary text-sm flex items-center justify-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shared Materials */}
      <div className="card-ovh">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-400">Shared Materials</h2>
        </div>
        <div className="p-6">
          {sharedMaterials.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No materials have been shared with you yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedMaterials.map((material) => (
                <div
                  key={material.material_id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{material.material_name}</h3>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-400">
                            {material.product_name && (
                              <span className="flex items-center space-x-1">
                                <span>Product:</span>
                                <span className="font-medium">{material.product_name}</span>
                              </span>
                            )}
                            {material.universe_name && (
                              <span className="flex items-center space-x-1">
                                <span>Universe:</span>
                                <span className="font-medium">{material.universe_name}</span>
                              </span>
                            )}
                            {material.shared_by && (
                              <span className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>Shared by {material.shared_by}</span>
                              </span>
                            )}
                            {material.shared_at && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(material.shared_at).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-500">
                            <span className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{material.access_count} views</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Download className="h-3 w-3" />
                              <span>{material.download_count} downloads</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <a
                        href={`/share/${material.share_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ovh-secondary text-sm flex items-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </a>
                      <button
                        onClick={() => handleDownload(material)}
                        className="btn-ovh-primary text-sm flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      <Modal
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false)
          setSelectedContact(null)
          setMessageSubject('')
          setMessageText('')
        }}
        title={`Message ${selectedContact?.name || 'Sales Contact'}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Message Thread */}
          {selectedContact && messages.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Message History</h3>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sent_by_customer
                        ? 'bg-primary-50 dark:bg-primary-900 ml-8'
                        : 'bg-slate-50 dark:bg-slate-800 mr-8'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {msg.sent_by_customer ? 'You' : msg.sales_contact_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{msg.subject}</p>
                    )}
                    <p className="text-sm text-slate-700 dark:text-slate-300">{msg.message}</p>
                    {!msg.is_read && !msg.sent_by_customer && (
                      <button
                        onClick={() => markAsReadMutation.mutate(msg.id)}
                        className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Message Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Subject (Optional)
              </label>
              <input
                type="text"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject..."
                className="input-ovh w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Message *
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                rows={6}
                className="input-ovh w-full"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMessageModal(false)
                  setMessageSubject('')
                  setMessageText('')
                }}
                className="btn-ovh-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !messageText.trim()}
                className="btn-ovh-primary flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
