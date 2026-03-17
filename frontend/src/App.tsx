import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DirectorDashboard from './pages/DirectorDashboard'
import PMMDashboard from './pages/PMMDashboard'
import SalesDashboard from './pages/SalesDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import CustomerMaterials from './pages/CustomerMaterials'
import Materials from './pages/Materials'
import HealthDashboard from './pages/HealthDashboard'
import UsageAnalytics from './pages/UsageAnalytics'
import Tracks from './pages/Tracks'
import TrackDetail from './pages/TrackDetail'
import TrackEditView from './pages/TrackEditView'
import Users from './pages/Users'
import ProductHierarchy from './pages/ProductHierarchy'
import ShareHistory from './pages/ShareHistory'
import ShareView from './pages/ShareView'
import RoomView from './pages/RoomView'
import DealRooms from './pages/DealRooms'
import RoomEditView from './pages/RoomEditView'
import RoomAnalytics from './pages/RoomAnalytics'
import Login from './pages/Login'
import ProductReleases from './pages/ProductReleases'
import MarketingUpdates from './pages/MarketingUpdates'
import Notifications from './pages/Notifications'
import MyCustomers from './pages/MyCustomers'
import SalesMessages from './pages/SalesMessages'
import CustomerMessages from './pages/CustomerMessages'
import MaterialRequests from './pages/MaterialRequests'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import CustomerDealRooms from './pages/CustomerDealRooms'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function RoleBasedDashboard() {
  const { user, loading } = useAuth()
  
  useEffect(() => {
    console.log('RoleBasedDashboard - User:', user, 'Loading:', loading, 'Role:', user?.role)
  }, [user, loading])
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading user...</div>
  }
  
  if (!user) {
    console.log('RoleBasedDashboard - No user, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  console.log('RoleBasedDashboard - Rendering dashboard for role:', user.role)
  
  // Route to role-specific dashboard
  // PMM has the same dashboard as Director
  try {
    switch (user.role) {
      case 'director':
        return <DirectorDashboard />
      case 'pmm':
        return <DirectorDashboard />
      case 'sales':
        console.log('RoleBasedDashboard - Rendering SalesDashboard')
        return <SalesDashboard />
      case 'customer':
        console.log('RoleBasedDashboard - Rendering CustomerMaterials')
        return <CustomerMaterials />
      default:
        console.log('RoleBasedDashboard - Unknown role, using default Dashboard')
        // Fallback to generic dashboard for admin or unknown roles
        return <Dashboard />
    }
  } catch (error) {
    console.error('RoleBasedDashboard - Error rendering dashboard:', error)
    return <div className="p-4 text-red-600">Error loading dashboard: {error instanceof Error ? error.message : 'Unknown error'}</div>
  }
}

function RoleBasedMessages() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (user.role === 'sales') {
    return <SalesMessages />
  }
  
  if (user.role === 'customer') {
    return <CustomerMessages />
  }
  
  return <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<ShareView />} />
      <Route
        path="/room/:token"
        element={
          <ProtectedRoute>
            <RoomView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deal-rooms/:id/edit"
        element={
          <ProtectedRoute>
            <RoomEditView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracks/:id/edit"
        element={
          <ProtectedRoute>
            <TrackEditView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedDashboard />} />
        <Route path="materials" element={<Materials />} />
        <Route path="material-requests" element={<MaterialRequests />} />
        <Route path="health" element={<HealthDashboard />} />
        <Route 
          path="analytics" 
          element={
            <ProtectedRoute>
              <UsageAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route path="sharing" element={<ShareHistory />} />
        <Route path="deal-rooms" element={<DealRooms />} />
        <Route path="deal-rooms/:id/analytics" element={<RoomAnalytics />} />
        <Route path="tracks" element={<Tracks />} />
        <Route path="tracks/:id" element={<TrackDetail />} />
        <Route path="product-hierarchy" element={<ProductHierarchy />} />
        <Route path="users" element={<Users />} />
        <Route path="product-releases" element={<ProductReleases />} />
        <Route path="marketing-updates" element={<MarketingUpdates />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="my-customers" element={<MyCustomers />} />
        <Route path="messages" element={<RoleBasedMessages />} />
        <Route path="my-deal-rooms" element={<CustomerDealRooms />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
