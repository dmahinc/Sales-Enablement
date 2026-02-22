import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { FileText, Activity, Search, LogOut, LayoutDashboard, BarChart3, BookOpen, Users, Share2, Newspaper, Megaphone, LucideIcon, ChevronDown, Moon, Sun } from 'lucide-react'
import NotificationBell from './NotificationBell'

type NavItem = 
  | { path: string; label: string; icon: LucideIcon }
  | { type: 'section'; label: string }

export default function Layout() {
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Not authenticated. Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin' || user?.is_superuser
  const isDirector = user?.role === 'director'
  const isPMM = user?.role === 'pmm'
  const isSales = user?.role === 'sales'

  // Base navigation items available to all roles
  const baseNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  // Director-specific navigation with section titles
  // Structure:
  // - MONITORING & ANALYTICS: Dashboard, Material Sharing, Usage Analytics
  // - MATERIAL & ENABLEMENT: Manage Material, Enablement Tracks
  // - NEWS: Latest Product Releases, Marketing Updates
  // - MANAGEMENT: Users Management
  const directorNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sharing', label: 'Material Sharing', icon: Share2 },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Material', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
    { type: 'section', label: 'MANAGEMENT' },
    { path: '/users', label: 'Users Management', icon: Users },
  ]

  // PMM-specific navigation with section titles (same structure as Director, but no Material Sharing or Users)
  // Structure:
  // - MONITORING & ANALYTICS: Dashboard, Usage Analytics
  // - MATERIAL & ENABLEMENT: Manage Materials, Enablement Tracks
  // - NEWS: Latest Product Releases, Marketing Updates
  const pmmNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  // Sales-specific navigation with section titles
  // Structure:
  // - MATERIAL & ENABLEMENT: Explore Materials, Enablement Tracks
  // - CUSTOMER ENGAGEMENT: My Shares
  // - NEWS: Latest Product Releases, Marketing Updates
  const salesNavItems = [
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Explore Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'CUSTOMER ENGAGEMENT' },
    { path: '/sharing', label: 'My Shares', icon: Share2 },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
  ]

  // Admin gets all items (Admin is Director's role) - same order as Director
  const adminNavItems = [
    { type: 'section', label: 'MONITORING & ANALYTICS' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sharing', label: 'Material Sharing', icon: Share2 },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { type: 'section', label: 'MATERIAL & ENABLEMENT' },
    { path: '/materials', label: 'Manage Material', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { type: 'section', label: 'NEWS' },
    { path: '/product-releases', label: 'Latest Product Releases', icon: Newspaper },
    { path: '/marketing-updates', label: 'Marketing Updates', icon: Megaphone },
    { type: 'section', label: 'MANAGEMENT' },
    { path: '/users', label: 'Users Management', icon: Users },
  ]

  // Select navigation based on role
  let navItems = baseNavItems
  if (isAdmin) {
    navItems = adminNavItems
  } else if (isDirector) {
    navItems = directorNavItems
  } else if (isPMM) {
    navItems = pmmNavItems
  } else if (isSales) {
    navItems = salesNavItems
  }

  // Close user menu when clicking outside
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300">
      {/* Vertical Sidebar */}
      <aside className="w-64 sidebar-ovh flex-shrink-0 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors duration-300">
          <img 
            src={theme === 'dark' ? "/logo-icon-white.svg" : "/logo-icon.svg"} 
            alt="Product Enablement & Customer Engagement Platform" 
            className="h-16 w-auto max-w-full transition-opacity duration-300" 
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item, index) => {
              // Handle section titles
              if ('type' in item && item.type === 'section') {
                return (
                  <div
                    key={`section-${index}`}
                    className="px-4 py-2 mt-4 first:mt-0"
                  >
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                )
              }
              
              // Handle regular menu items
              if ('path' in item && 'icon' in item) {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-l-4 border-primary-500 dark:border-primary-400 -ml-1 pl-5'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              }
              
              return null
            })}
          </div>
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between transition-colors duration-300">
          <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-400 tracking-tight">Product Enablement & Customer Engagement Platform</h1>
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              )}
            </button>
            <NotificationBell />
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 transition-colors duration-300">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-1 capitalize">
                      {user?.role || 'user'}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
