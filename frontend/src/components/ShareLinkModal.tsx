import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Copy, Check, Mail, User, Calendar, Link as LinkIcon, AlertCircle, Send } from 'lucide-react'
import Modal from './Modal'

interface ShareLinkModalProps {
  materialId: number
  materialName: string
  isOpen: boolean
  onClose: () => void
}

export default function ShareLinkModal({ materialId, materialName, isOpen, onClose }: ShareLinkModalProps) {
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(90)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLinkId, setShareLinkId] = useState<number | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const queryClient = useQueryClient()

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      material_id: materialId,
      customer_email: customerEmail || null,
      customer_name: customerName || null,
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
    setCustomerEmail('')
    setCustomerName('')
    setExpiresInDays(90)
    setCopied(false)
    setEmailSent(false)
    setSendingEmail(false)
    onClose()
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share Document" size="lg">
      {!shareUrl ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-700">
              <strong>Document:</strong> {materialName}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer Email (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="input-ovh pl-10"
                placeholder="customer@example.com"
                disabled={sendingEmail}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Track which customer received this document. If provided, you can send the link by email.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer Name (Optional)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-ovh pl-10"
                placeholder="Customer Company Name"
              />
            </div>
          </div>

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
                    // Generate link first
                    const response = await api.post('/shared-links', {
                      material_id: materialId,
                      customer_email: customerEmail.trim() || null,
                      customer_name: customerName || null,
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
    </Modal>
  )
}
