import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Copy, Check, Mail, User, Calendar, Link as LinkIcon, AlertCircle, Send, ChevronDown, Plus, X } from 'lucide-react'
import Modal from './Modal'
import { useAuth } from '../contexts/AuthContext'

interface ShareLinkModalProps {
  materialId: number
  materialName: string
  isOpen: boolean
  onClose: () => void
}

interface Customer {
  id: number
  email: string
  full_name: string
}

export default function ShareLinkModal({ materialId, materialName, isOpen, onClose }: ShareLinkModalProps) {
  const { user } = useAuth()
  const isSales = user?.role === 'sales'
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(90)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLinkId, setShareLinkId] = useState<number | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [createCustomerData, setCreateCustomerData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: '',
    password: '',
    send_welcome_email: false,
  })

  const queryClient = useQueryClient()

  // Fetch customers for sales users
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['sales-customers'],
    queryFn: () => api.get('/sales/customers').then(res => res.data),
    enabled: isSales && isOpen,
  })

  // When customer is selected from dropdown, populate fields
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomerId)
      if (customer) {
        setCustomerEmail(customer.email)
        setCustomerName(customer.full_name)
        // Company name is stored in SharedLink, not User, so we'll leave it empty
        // It will be set when creating the shared link if needed
        setIsManualEntry(false)
      }
    } else if (!selectedCustomerId && isSales) {
      // Clear fields when no customer selected (for sales users)
      setCustomerEmail('')
      setCustomerName('')
      setCompanyName('')
    }
  }, [selectedCustomerId, customers, isSales])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/shared-links', data),
    onSuccess: (response) => {
      setShareUrl(response.data.share_url)
      setShareLinkId(response.data.id)
      queryClient.invalidateQueries({ queryKey: ['shared-links'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create shareable link'
      alert(`Error: ${errorMessage}`)
    },
  })

  const sendEmailMutation = useMutation({
    mutationFn: ({ linkId, email }: { linkId: number, email: string }) => 
      api.post(`/shared-links/${linkId}/send-email`, null, {
        params: { customer_email: email }
      }),
    onSuccess: () => {
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 5000)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to send email'
      alert(`Error: ${errorMessage}`)
    },
  })

  const assignCustomerMutation = useMutation({
    mutationFn: (data: { email: string; first_name?: string; last_name?: string; full_name?: string; company_name?: string }) =>
      api.post('/sales/customers/assign', data),
    onSuccess: (response) => {
      // Customer assigned/created successfully
      queryClient.invalidateQueries({ queryKey: ['sales-customers'] })
    },
    onError: (error: any) => {
      console.error('Error assigning customer:', error)
      // Don't block sharing if assignment fails - just log it
    },
  })

  const createCustomerMutation = useMutation({
    mutationFn: (data: { email: string; first_name: string; last_name: string; company_name?: string; password: string; send_welcome_email: boolean }) =>
      api.post('/sales/customers/assign', data),
    onSuccess: (response, variables) => {
      // Customer created successfully
      queryClient.invalidateQueries({ queryKey: ['sales-customers'] })
      // Populate the form with the new customer
      setCustomerEmail(response.data.email)
      setCustomerName(response.data.full_name)
      // Company name will be stored in SharedLink when creating the link
      if (variables.company_name) {
        setCompanyName(variables.company_name)
      }
      setSelectedCustomerId(response.data.id)
      setIsManualEntry(false)
      setShowCreateCustomerModal(false)
      
      // Show password if email was not sent
      if (response.data.password) {
        alert(`Customer created successfully!\n\nEmail: ${response.data.email}\nPassword: ${response.data.password}\n\nPlease share these credentials with the customer manually.`)
      } else if (response.data.email_sent) {
        alert('Customer created successfully! Welcome email has been sent.')
      }
      
      // Reset create form
      setCreateCustomerData({
        first_name: '',
        last_name: '',
        email: '',
        company_name: '',
        password: '',
        send_welcome_email: false,
      })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create customer'
      alert(`Error: ${errorMessage}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For sales users, get customer info from selected customer
    if (isSales && selectedCustomerId) {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
      if (selectedCustomer) {
        setCustomerEmail(selectedCustomer.email)
        setCustomerName(selectedCustomer.full_name)
        // Company name will be retrieved from SharedLink later
      }
    }
    
    // Create shared link
    createMutation.mutate({
      material_id: materialId,
      customer_email: customerEmail || null,
      customer_name: customerName || null,
      company_name: companyName || null,
      expires_in_days: expiresInDays,
    })
  }

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setShareUrl(null)
    setShareLinkId(null)
    setSelectedCustomerId(null)
    setCustomerEmail('')
    setCustomerName('')
    setCompanyName('')
    setExpiresInDays(90)
    setCopied(false)
    setEmailSent(false)
    setSendingEmail(false)
    setIsManualEntry(false)
    onClose()
  }

  const handleCustomerSelect = (customerId: number | null) => {
    setSelectedCustomerId(customerId)
    if (customerId === null) {
      setCustomerEmail('')
      setCustomerName('')
      setCompanyName('')
      setIsManualEntry(false)
    }
  }

  const handleManualEmailChange = (email: string) => {
    setCustomerEmail(email)
    // For sales users, manual entry is not used anymore (only dropdown)
    // This is kept for non-sales users
  }

  const handleSendEmail = () => {
    if (!shareLinkId || !customerEmail.trim()) {
      return
    }
    
    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(customerEmail.trim())) {
      alert('Please enter a valid email address')
      return
    }
    
    sendEmailMutation.mutate({ linkId: shareLinkId, email: customerEmail.trim() })
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createCustomerData.first_name || !createCustomerData.last_name || !createCustomerData.email || !createCustomerData.password) {
      alert('Please fill in all required fields (First Name, Last Name, Email, Password)')
      return
    }
    if (createCustomerData.password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }
    createCustomerMutation.mutate({
      email: createCustomerData.email.trim(),
      first_name: createCustomerData.first_name.trim(),
      last_name: createCustomerData.last_name.trim(),
      company_name: createCustomerData.company_name.trim() || undefined,
      password: createCustomerData.password,
      send_welcome_email: createCustomerData.send_welcome_email,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share Document" size="lg">
      {!shareUrl ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-700">
              <strong>Document:</strong> {materialName}
            </p>
          </div>

          {/* Customer Selection - Only for Sales users */}
          {isSales && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Select Customer (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Customer</span>
                </button>
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => handleCustomerSelect(e.target.value ? Number(e.target.value) : null)}
                  className="input-ovh pl-10 appearance-none"
                  disabled={sendingEmail}
                >
                  <option value="">-- Select a customer --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} ({customer.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Select from your assigned customers, or create a new one.
              </p>
            </div>
          )}

          {/* Customer Email for non-sales users */}
          {!isSales && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => handleManualEmailChange(e.target.value)}
                  className="input-ovh pl-10"
                  placeholder="customer@example.com"
                  disabled={sendingEmail}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Track which customer received this document. If provided, you can send the link by email.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Expires In
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="input-ovh pl-10"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>

          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create shareable link'}
              </p>
            </div>
          )}

          {emailSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">
                <Check className="w-4 h-4 inline mr-2" />
                Email sent successfully! The customer will receive an invitation to discover the document.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-end items-center gap-3 flex-wrap">
              <button type="button" onClick={handleClose} className="btn-ovh-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  // First generate the link, then send email
                  if (!customerEmail.trim()) {
                    alert('Please enter an email address')
                    return
                  }
                  
                  // Basic email validation
                  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  if (!emailPattern.test(customerEmail.trim())) {
                    alert('Please enter a valid email address')
                    return
                  }
                  
                  if (sendingEmail) {
                    return
                  }
                  
                  setSendingEmail(true)
                  
                  try {
                    // If sales user and manually entered customer info (not selected from dropdown), assign/create customer first
                    if (isSales && isManualEntry && customerEmail.trim() && !selectedCustomerId) {
                      try {
                        // Split customerName into first_name and last_name if provided
                        const nameParts = customerName.trim().split(/\s+/)
                        const first_name = nameParts[0] || undefined
                        const last_name = nameParts.slice(1).join(' ') || undefined
                        
                        await api.post('/sales/customers/assign', {
                          email: customerEmail.trim(),
                          first_name: first_name,
                          last_name: last_name,
                          company_name: companyName.trim() || undefined,
                        })
                        queryClient.invalidateQueries({ queryKey: ['sales-customers'] })
                      } catch (error) {
                        // Continue even if assignment fails
                        console.error('Failed to assign customer:', error)
                      }
                    }
                    
                    // Generate link first
                    const response = await api.post('/shared-links', {
                      material_id: materialId,
                      customer_email: customerEmail.trim() || null,
                      customer_name: customerName || null,
                      company_name: companyName || null,
                      expires_in_days: expiresInDays,
                    })
                    
                    const linkId = response.data.id
                    const shareUrlValue = response.data.share_url
                    
                    setShareUrl(shareUrlValue)
                    setShareLinkId(linkId)
                    queryClient.invalidateQueries({ queryKey: ['shared-links'] })
                    
                    // Then send email
                    await api.post(`/shared-links/${linkId}/send-email`, null, {
                      params: { customer_email: customerEmail.trim() }
                    })
                    
                    setEmailSent(true)
                    setTimeout(() => setEmailSent(false), 5000)
                  } catch (error: any) {
                    const errorMessage = error.response?.data?.detail || 'Failed to create link or send email'
                    alert(`Error: ${errorMessage}`)
                  } finally {
                    setSendingEmail(false)
                  }
                }}
                className="btn-ovh-primary whitespace-nowrap"
                style={{ 
                  minWidth: '180px',
                  opacity: (!customerEmail.trim() || sendingEmail) ? 0.6 : 1,
                  cursor: (!customerEmail.trim() || sendingEmail) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send className="w-4 h-4 mr-2 inline" />
                {sendingEmail ? 'Sending...' : 'Send Link by Email'}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-ovh-primary disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Generate Link'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-900">Shareable link created!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Copy this link and share it with your customer. The link will expire in {expiresInDays} days.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Shareable Link
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="input-ovh pl-10 pr-20 bg-slate-50"
                />
              </div>
              <button
                onClick={handleCopy}
                className="btn-ovh-secondary whitespace-nowrap"
                title="Copy link"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {customerEmail && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-600">
                <strong>Customer:</strong> {customerName || customerEmail}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                This share is tracked and will appear in your sharing history.
              </p>
            </div>
          )}

          {/* Send Link by Email Section */}
          {customerEmail && (
            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Send Link by Email
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    readOnly
                    className="input-ovh pl-10 bg-slate-50"
                    placeholder="customer@example.com"
                    disabled={sendEmailMutation.isPending}
                  />
                </div>
                <button
                  onClick={handleSendEmail}
                  disabled={!customerEmail.trim() || sendEmailMutation.isPending || emailSent}
                  className="btn-ovh-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Link by Email
                    </>
                  )}
                </button>
              </div>
              {emailSent && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    <Check className="w-4 h-4 inline mr-2" />
                    Email sent successfully! The customer will receive an invitation to discover the document.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button onClick={handleClose} className="btn-ovh-primary">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Create Customer
                </h2>
                <button
                  onClick={() => {
                    setShowCreateCustomerModal(false)
                    setCreateCustomerData({
                      first_name: '',
                      last_name: '',
                      email: '',
                      company_name: '',
                      password: '',
                      send_welcome_email: false,
                    })
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createCustomerData.first_name}
                      onChange={(e) => setCreateCustomerData({ ...createCustomerData, first_name: e.target.value })}
                      className="input-ovh w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createCustomerData.last_name}
                      onChange={(e) => setCreateCustomerData({ ...createCustomerData, last_name: e.target.value })}
                      className="input-ovh w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createCustomerData.email}
                    onChange={(e) => setCreateCustomerData({ ...createCustomerData, email: e.target.value })}
                    className="input-ovh w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={createCustomerData.company_name}
                    onChange={(e) => setCreateCustomerData({ ...createCustomerData, company_name: e.target.value })}
                    className="input-ovh w-full"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createCustomerData.password}
                    onChange={(e) => setCreateCustomerData({ ...createCustomerData, password: e.target.value })}
                    className="input-ovh w-full"
                    placeholder="Minimum 8 characters"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Sales will set the initial password for the customer
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={createCustomerData.send_welcome_email}
                      onChange={(e) => setCreateCustomerData({ ...createCustomerData, send_welcome_email: e.target.checked })}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Send customer a welcome email
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustomerModal(false)
                      setCreateCustomerData({
                        first_name: '',
                        last_name: '',
                        email: '',
                        company_name: '',
                        password: '',
                        send_welcome_email: false,
                      })
                    }}
                    className="btn-ovh-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="btn-ovh-primary"
                  >
                    {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
