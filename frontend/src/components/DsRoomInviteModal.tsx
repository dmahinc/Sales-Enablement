import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader } from 'lucide-react'
import { api } from '../services/api'
import Modal from './Modal'

type Candidate = { id: number; email: string; full_name: string }

type Role = 'viewer' | 'contributor' | 'co_host'

interface DsRoomInviteModalProps {
  roomId: number
  isOpen: boolean
  onClose: () => void
  onInvited: () => void
  /** e.g. dark:bg-slate-800 for token room page */
  panelClassName?: string
}

export default function DsRoomInviteModal({
  roomId,
  isOpen,
  onClose,
  onInvited,
  panelClassName = '',
}: DsRoomInviteModalProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [customerUserId, setCustomerUserId] = useState<number | ''>('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [sendRoomInviteEmail, setSendRoomInviteEmail] = useState(true)
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false)

  const {
    data: candidates = [],
    isPending: candidatesPending,
    isError: candidatesError,
  } = useQuery<Candidate[]>({
    queryKey: ['deal-room-invite-candidates', roomId],
    queryFn: () => api.get(`/deal-rooms/${roomId}/invite-customer-candidates`).then(r => r.data),
    // Load as soon as room is known so opening the modal is not blocked on first fetch.
    enabled: !!roomId,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!isOpen) return
    setMode('existing')
    setCustomerUserId('')
    setEmail('')
    setFirstName('')
    setLastName('')
    setPassword('')
    setRole('viewer')
    setSendRoomInviteEmail(true)
    setSendWelcomeEmail(false)
  }, [isOpen, roomId])

  useEffect(() => {
    if (mode === 'existing' && candidates.length > 0 && customerUserId === '') {
      setCustomerUserId(candidates[0].id)
    }
  }, [mode, candidates, customerUserId])

  const inviteMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/deal-rooms/${roomId}/participants`, body),
    onSuccess: (res) => {
      const d = res.data as {
        notification_email_sent?: boolean | null
        account_created?: boolean | null
        welcome_email_sent?: boolean | null
      }
      if (d.account_created && sendWelcomeEmail && d.welcome_email_sent === false) {
        alert(
          'Account created, but the welcome email could not be sent. Share the password with the contact manually.'
        )
      }
      queryClient.invalidateQueries({ queryKey: ['deal-room-participants', roomId] })
      onInvited()
      onClose()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not add access'
      alert(typeof msg === 'string' ? msg : 'Could not add access')
    },
  })

  const handleSubmit = () => {
    if (mode === 'existing') {
      if (!customerUserId) {
        alert('No contacts available. Switch to "New account" or add customers under Sales first.')
        return
      }
      inviteMutation.mutate({
        customer_user_id: customerUserId,
        role,
        send_notification_email: sendRoomInviteEmail,
      })
      return
    }
    const em = email.trim()
    if (!em.includes('@')) {
      alert('Enter a valid email')
      return
    }
    if (!firstName.trim() || !lastName.trim() || password.length < 8) {
      alert('First name, last name, and a password of at least 8 characters are required for a new account.')
      return
    }
    inviteMutation.mutate({
      email: em,
      role,
      send_notification_email: sendRoomInviteEmail,
      create_customer_if_missing: true,
      new_customer_first_name: firstName.trim(),
      new_customer_last_name: lastName.trim(),
      new_customer_password: password,
      new_customer_send_welcome_email: sendWelcomeEmail,
    })
  }

  const noContacts = !candidatesPending && !candidatesError && candidates.length === 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite to this room" size="lg">
      <div className={`px-6 py-4 space-y-4 text-left ${panelClassName}`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          People need a platform login that matches the email you grant access to. Use an existing contact
          tied to this room&apos;s owner, or create a customer account (attached to the room owner when they
          are in Sales).
        </p>

        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              mode === 'existing'
                ? 'bg-[#006dc7] text-white dark:bg-[#21dadb] dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Existing contact
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              mode === 'new'
                ? 'bg-[#006dc7] text-white dark:bg-[#21dadb] dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            New account
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="space-y-3">
            {candidatesPending ? (
              <div className="flex justify-center py-6">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : candidatesError ? (
              <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                Could not load contacts. Check your connection and try again, or use <strong>New account</strong>.
              </p>
            ) : noContacts ? (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                No platform customers are assigned to you or this room&apos;s creator yet (Sales: assigned to you or
                created by you). Use <strong>New account</strong> to provision one, or add customers in your Sales
                workspace first.
              </p>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Customer
                </label>
                <select
                  value={customerUserId}
                  onChange={(e) => setCustomerUserId(e.target.value ? Number(e.target.value) : '')}
                  className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
                placeholder="they will sign in with this email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Initial password (min 8 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
                autoComplete="new-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                className="rounded border-slate-300"
              />
              Send welcome email with login instructions (if SMTP is configured)
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Role in room</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="input-ovh w-full text-sm dark:bg-slate-800 dark:border-slate-600"
          >
            <option value="viewer">Viewer — view, Messages</option>
            <option value="contributor">Contributor — + download &amp; action plan</option>
            <option value="co_host">Co-host — + invite others</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={sendRoomInviteEmail}
            onChange={(e) => setSendRoomInviteEmail(e.target.checked)}
            className="rounded border-slate-300"
          />
          Send Digital Sales Room invitation email (link + role)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ovh-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              inviteMutation.isPending ||
              (mode === 'existing' && (noContacts || !customerUserId)) ||
              (mode === 'new' && (!email.trim() || !firstName.trim() || !lastName.trim() || password.length < 8))
            }
            className="btn-ovh-primary disabled:opacity-50"
          >
            {inviteMutation.isPending ? 'Saving…' : 'Add access'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
