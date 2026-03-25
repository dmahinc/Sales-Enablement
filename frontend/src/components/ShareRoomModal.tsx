import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { Send, Copy, Check, X, Plus } from 'lucide-react'
import Modal from './Modal'

interface ShareRoomModalProps {
  roomId: number
  roomName: string
  roomUrl: string
  isOpen: boolean
  onClose: () => void
}

export default function ShareRoomModal({
  roomId,
  roomName,
  roomUrl,
  isOpen,
  onClose,
}: ShareRoomModalProps) {
  const [recipients, setRecipients] = useState<string[]>([])
  const [recipientInput, setRecipientInput] = useState('')
  const [subject, setSubject] = useState(`${roomName} - Digital Sales Room`)
  const [message, setMessage] = useState('')
  const [sendSeparate, setSendSeparate] = useState(true)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sendMutation = useMutation({
    mutationFn: (data: {
      recipients: string[]
      subject: string
      message: string
      send_separate: boolean
    }) => api.post(`/deal-rooms/${roomId}/send-email`, data),
    onSuccess: () => {
      setRecipients([])
      setMessage('')
      setSubject(`${roomName} - Digital Sales Room`)
      alert('Emails sent successfully!')
      onClose()
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || 'Failed to send emails')
    },
  })

  const addRecipient = () => {
    const email = recipientInput.trim()
    if (email && email.includes('@') && !recipients.includes(email)) {
      setRecipients([...recipients, email])
      setRecipientInput('')
      inputRef.current?.focus()
    }
  }

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    if (recipients.length === 0) {
      alert('Please add at least one recipient')
      return
    }
    if (!subject.trim()) {
      alert('Please enter a subject line')
      return
    }
    sendMutation.mutate({
      recipients,
      subject: subject.trim(),
      message: message.trim(),
      send_separate: sendSeparate,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Digital Sales Room" size="lg">
      <div className="space-y-6">
        {/* Recipients */}
      <p className="text-sm text-warm-600 bg-warm-50 border border-warm-200 rounded-lg p-3">
        <strong>Account access:</strong> To invite someone who will <strong>sign in</strong> with a role (viewer, contributor, co-host), use the{' '}
        <strong>Invite</strong> button on the Digital Sales Rooms list or open <strong>Edit room</strong> → <strong>People &amp; access</strong>. This
        modal sends an email with the room link only.
      </p>

      <div>
        <label className="block text-sm font-medium text-warm-800 mb-2">Email Recipients</label>
          <div className="flex flex-wrap gap-2 p-3 border border-warm-300 rounded-lg bg-white">
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="hover:text-primary-600"
                  aria-label={`Remove ${email}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
              placeholder="Add email address..."
              className="flex-1 min-w-[180px] px-2 py-1 border-0 focus:ring-0 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={addRecipient}
              disabled={!recipientInput.trim() || !recipientInput.includes('@')}
              className="btn-ovh-secondary flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add recipient"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <p className="text-xs text-warm-600 mt-1">Add at least one recipient (Enter or click Add). Subject and message are optional.</p>
        </div>

        {/* Send logic */}
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-2">Sending</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendSeparate}
                onChange={() => setSendSeparate(true)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Send separate emails to each individual</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!sendSeparate}
                onChange={() => setSendSeparate(false)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Send one email to group</span>
            </label>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-2">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-ovh w-full"
            placeholder="e.g. SilverTower x Edge Follow Up"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-2">Email Body</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-ovh w-full min-h-[120px]"
            placeholder="Hi Team, It was great chatting with you. Here are some resources to pass along and review ahead..."
          />
        </div>

        {/* Link */}
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-2">Room Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={roomUrl}
              className="input-ovh flex-1 bg-warm-100 text-sm"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="btn-ovh-secondary flex items-center gap-2 px-4"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-warm-200">
        <button type="button" onClick={onClose} className="btn-ovh-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={recipients.length === 0 || sendMutation.isPending}
          className="btn-ovh-primary flex items-center gap-2 disabled:opacity-50"
        >
          {sendMutation.isPending ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}
