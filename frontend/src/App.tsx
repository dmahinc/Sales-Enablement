import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Materials from './pages/Materials'
import HealthDashboard from './pages/HealthDashboard'
import Discovery from './pages/Discovery'
import UsageAnalytics from './pages/UsageAnalytics'
import Tracks from './pages/Tracks'
import TrackDetail from './pages/TrackDetail'
import Users from './pages/Users'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './contexts/AuthContext'

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="materials" element={<Materials />} />
        <Route path="health" element={<HealthDashboard />} />
        <Route path="analytics" element={<UsageAnalytics />} />
        <Route path="tracks" element={<Tracks />} />
        <Route path="tracks/:id" element={<TrackDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="discovery" element={<Discovery />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
