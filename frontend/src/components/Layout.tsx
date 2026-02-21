import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FileText, Activity, Search, LogOut, LayoutDashboard, BarChart3, BookOpen, Users, Share2, Newspaper, Megaphone } from 'lucide-react'
import NotificationBell from './NotificationBell'

export default function Layout() {
  const { user, logout, loading } = useAuth()
  const location = useLocation()

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

  // Director-specific navigation (monitoring and governance)
  const directorNavItems = [
    ...baseNavItems,
    { path: '/materials', label: 'Manage Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { path: '/users', label: 'Team Management', icon: Users },
  ]

  // PMM-specific navigation (same as Director except Users management)
  const pmmNavItems = [
    ...baseNavItems,
    { path: '/materials', label: 'Manage Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
  ]

  // Sales-specific navigation (consumption and sharing)
  const salesNavItems = [
    ...baseNavItems,
    { path: '/materials', label: 'Explore Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { path: '/sharing', label: 'My Shares', icon: Share2 },
  ]

  // Admin gets all items (Admin is Director's role)
  const adminNavItems = [
    ...baseNavItems,
    { path: '/materials', label: 'Manage Materials', icon: FileText },
    { path: '/tracks', label: 'Enablement Tracks', icon: BookOpen },
    { path: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
    { path: '/sharing', label: 'Sharing', icon: Share2 },
    { path: '/users', label: 'Users', icon: Users },
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Vertical Sidebar */}
      <aside className="w-64 sidebar-ovh flex-shrink-0 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <img src="/logo-icon.svg" alt="Products & Solutions Enablement" className="h-10 w-10" />
            <span className="text-lg font-semibold text-primary-700 hidden sm:block">Products & Solutions</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-500 -ml-1 pl-5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-primary-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {user?.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-primary-600 font-medium mt-0.5 capitalize">
                {user?.role || 'user'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-end">
          <NotificationBell />
        </div>
        <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
