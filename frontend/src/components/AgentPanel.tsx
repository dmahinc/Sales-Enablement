import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, X, Loader2, ChevronDown, Check, XCircle, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface PendingAction {
  action_id: string
  tool_name: string
  description: string
  parameters: Record<string, unknown>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  pending_action?: PendingAction
  action_status?: 'pending' | 'confirmed' | 'cancelled'
}

const ROLE_GREETINGS: Record<string, string> = {
  sales:
    "Hi! I'm your Sales assistant. I can search materials, share documents, check customer engagement, manage requests, and more. What would you like to do?",
  pmm:
    "Hi! I'm your PMM assistant. I can help manage material requests, check content health, view analytics, and more. What would you like to do?",
  director:
    "Hi! I'm your Director assistant. I have full access to materials, analytics, requests, and sharing. How can I help?",
  admin:
    "Hi! I'm your Admin assistant with full platform access. How can I help?",
}

function generateSessionId(): string {
  return 'agent-' + crypto.randomUUID()
}

interface AgentPanelProps {
  onToggle?: (isOpen: boolean) => void
  isOpen?: boolean
}

export default function AgentPanel({ onToggle, isOpen: isOpenProp }: AgentPanelProps) {
  const { user } = useAuth()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => generateSessionId())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Use prop if provided, otherwise use internal state
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalIsOpen

  const setIsOpen = (value: boolean) => {
    if (isOpenProp === undefined) {
      setInternalIsOpen(value)
    }
    if (onToggle) {
      onToggle(value)
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Prevent any scroll when opening the panel
      const scrollPosition = window.scrollY || window.pageYOffset
      
      // Use setTimeout to ensure the panel is rendered before focusing
      // and prevent scroll behavior
      setTimeout(() => {
        if (inputRef.current) {
          // Restore scroll position before focusing
          window.scrollTo(0, scrollPosition)
          inputRef.current.focus({ preventScroll: true })
          // Restore again after focus in case it changed
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition)
          })
        }
      }, 100)
    }
  }, [isOpen])

  const activePendingAction = messages.find(
    (m) => m.pending_action && m.action_status === 'pending'
  )?.pending_action

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading || activePendingAction) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const { data } = await api.post<{
        message: string
        pending_action: PendingAction | null
        session_id: string
      }>('/agent/chat', { message: text, session_id: sessionId })

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.message,
      }
      if (data.pending_action) {
        assistantMsg.pending_action = data.pending_action
        assistantMsg.action_status = 'pending'
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      const content =
        typeof detail === 'string' && detail
          ? detail
          : 'Sorry, I encountered an error. The AI agent may not be configured. Please try again later.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (action: PendingAction) => {
    setLoading(true)
    setMessages((prev) =>
      prev.map((m) =>
        m.pending_action?.action_id === action.action_id
          ? { ...m, action_status: 'confirmed' as const }
          : m
      )
    )

    try {
      const { data } = await api.post<{ message: string; session_id: string }>(
        '/agent/confirm',
        { session_id: sessionId, action_id: action.action_id }
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I failed to execute the action. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (action: PendingAction) => {
    setLoading(true)
    setMessages((prev) =>
      prev.map((m) =>
        m.pending_action?.action_id === action.action_id
          ? { ...m, action_status: 'cancelled' as const }
          : m
      )
    )

    try {
      const { data } = await api.post<{ message: string; session_id: string }>(
        '/agent/cancel',
        { session_id: sessionId, action_id: action.action_id }
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      // UI already shows cancelled
    } finally {
      setLoading(false)
    }
  }

  const clearChat = async () => {
    setMessages([])
    try {
      await api.delete(`/agent/session?session_id=${sessionId}`)
    } catch {
      // Ignore cleanup errors
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toolLabel = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const roleGreeting = ROLE_GREETINGS[user?.role || ''] || ROLE_GREETINGS.sales

  return (
    <>
      {/* Collapsed button - bottom left (only shown when panel is closed) */}
      {!isOpen && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Save current scroll position
            const scrollY = window.scrollY || window.pageYOffset
            setIsOpen(true)
            // Restore scroll position immediately
            requestAnimationFrame(() => {
              window.scrollTo(0, scrollY)
            })
          }}
          className="fixed bottom-6 left-6 z-[9998] flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 text-white shadow-lg hover:bg-primary-600 transition-all duration-200 hover:shadow-xl hover:scale-105"
          aria-label="Open AI Agent"
        >
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">AI Agent</span>
        </button>
      )}

      {/* Expanded panel - integrated into layout */}
      {isOpen && (
        <div 
          className="flex-shrink-0 flex flex-col w-[33vw] min-w-[400px] max-w-[600px] h-full border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 transition-all duration-300"
          onFocus={(e) => {
            // Prevent scroll when panel receives focus
            e.preventDefault()
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <Bot className="h-4.5 w-4.5 text-primary-500 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  AI Agent
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                  {user?.role} assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={clearChat}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                aria-label="Close panel"
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {roleGreeting}
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>

                {/* Pending action card */}
                {m.pending_action && (
                  <div className="mt-2">
                    <div
                      className={`rounded-xl border p-3.5 ${
                        m.action_status === 'confirmed'
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                          : m.action_status === 'cancelled'
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                            m.action_status === 'confirmed'
                              ? 'bg-emerald-500'
                              : m.action_status === 'cancelled'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                        >
                          {m.action_status === 'confirmed' ? (
                            <Check className="h-3 w-3 text-white" />
                          ) : m.action_status === 'cancelled' ? (
                            <X className="h-3 w-3 text-white" />
                          ) : (
                            <Bot className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {m.action_status === 'confirmed'
                              ? 'Action Executed'
                              : m.action_status === 'cancelled'
                              ? 'Action Cancelled'
                              : 'Action Required'}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                            {m.pending_action.description}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                            {toolLabel(m.pending_action.tool_name)}
                          </p>

                          {m.action_status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleConfirm(m.pending_action!)}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Confirm
                              </button>
                              <button
                                onClick={() => handleCancel(m.pending_action!)}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activePendingAction
                    ? 'Please confirm or cancel the pending action...'
                    : 'Ask me anything...'
                }
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-700 disabled:opacity-50 transition-all"
                disabled={loading || !!activePendingAction}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !!activePendingAction}
                className="rounded-xl bg-primary-500 px-3.5 py-2.5 text-white hover:bg-primary-600 disabled:opacity-40 transition-all duration-150 hover:shadow-md"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
