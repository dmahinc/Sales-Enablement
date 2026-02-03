import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Copy, Check, Mail, User, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react'
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

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/shared-links', data),
    onSuccess: (response) => {
      setShareUrl(response.data.share_url)
      queryClient.invalidateQueries({ queryKey: ['shared-links'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create shareable link'
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
    setCustomerEmail('')
    setCustomerName('')
    setExpiresInDays(90)
    setCopied(false)
    onClose()
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
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Track which customer received this document
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

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={handleClose} className="btn-ovh-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-ovh-primary disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Generate Link'}
            </button>
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
