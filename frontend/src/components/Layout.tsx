import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { FileText, Activity, Search, LogOut, LayoutDashboard, BarChart3, BookOpen, Users, Share2, Newspaper, Megaphone, LucideIcon, ChevronDown, Moon, Sun, Bell, UserCircle, MessageSquare, Layers, ClipboardList, Building2 } from 'lucide-react'
import NotificationBell from './NotificationBell'
import AgentPanel from './AgentPanel'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

type NavItem = 
  | { path: string; label: string; icon: LucideIcon; badge?: number }
  | { type: 'section'; label: string }

export default function Layout() {
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleAgentToggle = (isOpen: boolean) => {
    setAgentOpen(isOpen)
    // Collapse sidebar when agent opens to make room
    setSidebarCollapsed(isOpen)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ovh-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--ovh-bg)] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Not authenticated. Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const role = (user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || user?.is_superuser
  const isDirector = role === 'director'
  const isPMM = role === 'pmm'
  const isSales = role === 'sales'
  const isCustomer = role === 'customer'

  const baseNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  const directorNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sharing', label: 'Material Sharing', icon: Share2 },
    { path: '/deal-rooms', label: 'Digital Sales Rooms', icon: Building2 },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Material', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
    { type: 'section', label: 'MANAGEMENT' },
    { path: '/product-hierarchy', label: 'Product Hierarchy & Icons', icon: Layers },
    { path: '/users', label: 'Users Management', icon: Users },
  ]

  const pmmNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sharing', label: 'Material Sharing', icon: Share2 },
    { path: '/deal-rooms', label: 'Digital Sales Rooms', icon: Building2 },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Materials', icon: FileText },
    { path: '/material-requests', label: 'Requests for Materials', icon: ClipboardList },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  const { data: unreadMessagesData } = useQuery<{ unread_count: number }>({
    queryKey: ['sales-unread-count'],
    queryFn: () => api.get('/sales/messages/unread-count').then(res => res.data),
    enabled: isSales,
    refetchInterval: 30000,
  })

  const salesNavItems = [
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Explore Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'CUSTOMER ENGAGEMENT' },
    { path: '/my-customers', label: 'My Customers', icon: UserCircle },
    { path: '/deal-rooms', label: 'Digital Sales Rooms', icon: Building2 },
    { path: '/messages', label: 'Conversations', icon: MessageSquare, badge: unreadMessagesData?.unread_count },
    { path: '/sharing', label: 'My Shared Materials', icon: Share2 },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  const { data: customerUnreadData } = useQuery<{ unread_messages_count: number }>({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get('/customers/dashboard').then(res => res.data),
    enabled: isCustomer,
    refetchInterval: 30000,
    select: (data) => ({ unread_messages_count: data?.unread_messages_count || 0 }),
  })

  const customerNavItems = [
    { path: '/', label: 'My Shared Materials', icon: FileText },
    { path: '/my-deal-rooms', label: 'My Deal Rooms', icon: Building2 },
    { path: '/messages', label: 'Conversations', icon: MessageSquare, badge: customerUnreadData?.unread_messages_count },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ]

  const adminNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sharing', label: 'Material Sharing', icon: Share2 },
    { path: '/deal-rooms', label: 'Digital Sales Rooms', icon: Building2 },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Material', icon: FileText },
    { path: '/material-requests', label: 'Requests for Materials', icon: ClipboardList },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
    { type: 'section', label: 'MANAGEMENT' },
    { path: '/product-hierarchy', label: 'Product Hierarchy & Icons', icon: Layers },
    { path: '/users', label: 'Users Management', icon: Users },
  ]

  let navItems = baseNavItems
  if (isAdmin) {
    navItems = adminNavItems
  } else if (isDirector) {
    navItems = directorNavItems
  } else if (isPMM) {
    navItems = pmmNavItems
  } else if (isSales) {
    navItems = salesNavItems
  } else if (isCustomer) {
    navItems = customerNavItems
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Prefer avatar_data_url (base64) - no separate HTTP request, avoids 404/CORS issues
  const avatarSrc = user?.avatar_data_url || user?.avatar_url || ''

  return (
    <div className="min-h-screen bg-[var(--ovh-bg)] dark:bg-slate-900 flex transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`sidebar-ovh flex-shrink-0 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`px-5 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors duration-300 ${sidebarCollapsed ? 'px-2' : ''}`}>
          {sidebarCollapsed ? (
            <img 
              src={theme === 'dark' ? "/logo-icon-white.svg" : "/logo-icon.svg"} 
              alt="OVHcloud" 
              className="h-10 w-10 transition-opacity duration-300" 
            />
          ) : (
            <img 
              src={theme === 'dark' ? "/logo-icon-white.svg" : "/logo-icon.svg"} 
              alt="Product Enablement & Customer Engagement Platform" 
              className="h-14 w-auto max-w-full transition-opacity duration-300" 
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item, index) => {
              if ('type' in item && item.type === 'section') {
                if (sidebarCollapsed) return null // Hide section labels when collapsed
                return (
                  <div key={`section-${index}`} className="px-3 pt-6 pb-3 first:pt-0">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                )
              }
              
              if ('path' in item && 'icon' in item) {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                const badge = 'badge' in item ? item.badge : undefined
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group relative flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] ${sidebarCollapsed ? '' : 'mr-2.5'} flex-shrink-0 transition-colors ${
                      isActive 
                        ? 'text-primary-500 dark:text-primary-400' 
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                    }`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold text-white bg-primary-500 rounded-full min-w-[18px] text-center">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {sidebarCollapsed && badge !== undefined && badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-slate-800"></span>
                    )}
                  </Link>
                )
              }
              
              return null
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content Area - includes page content and agent panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between transition-colors duration-300 flex-shrink-0">
          <h1 className={`text-lg font-semibold text-slate-800 dark:text-slate-200 tracking-tight font-display ${isCustomer ? 'text-base' : ''}`}>
            {isCustomer ? 'OVHcloud Customer Portal' : 'Product Enablement & Customer Engagement Platform'}
          </h1>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors duration-150"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </button>
            <NotificationBell />
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center ring-2 ring-primary-200/50 dark:ring-primary-700/30 overflow-hidden">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                      {initials}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 transition-colors duration-300">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                      {user?.role || 'user'}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2.5" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area - Agent Panel and Page content side by side */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Agent Panel - integrated into layout (between sidebar and main content) */}
          <AgentPanel onToggle={handleAgentToggle} isOpen={agentOpen} />
          
          {/* Page Content */}
          <div className={`flex-1 overflow-y-auto py-8 px-5 sm:px-6 lg:px-10 bg-[var(--ovh-bg)] dark:bg-slate-900 transition-all duration-300 ${agentOpen ? 'min-w-0' : ''}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
