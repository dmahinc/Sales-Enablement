import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800 rounded-full opacity-20"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary-100 rounded-full opacity-10"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="card-ovh p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.svg" alt="Products & Solutions Enablement" className="h-20" />
            </div>
            <h1 className="text-2xl font-semibold text-primary-700">Products & Solutions Enablement</h1>
            <p className="text-slate-500 mt-2">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-ovh pl-10"
                  placeholder="you@ovhcloud.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-ovh pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-ovh-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              © 2026 OVHcloud Products & Solutions Enablement Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
