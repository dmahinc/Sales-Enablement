import axios from 'axios'

// Use relative URL to proxy through frontend nginx (same origin, no CORS)
// This avoids browser blocking self-signed certificates for cross-origin requests
const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 30s timeout - login and other requests can be slow when server is under load
  timeout: 30000,
})

function requestPath(config: { baseURL?: string; url?: string } | undefined): string {
  if (!config?.url) return ''
  const base = (config.baseURL || '').replace(/\/$/, '')
  const path = config.url.startsWith('http') ? config.url : `${base}${config.url.startsWith('/') ? '' : '/'}${config.url}`
  return path.toLowerCase()
}

function isUnauthorizedCredentialAttempt(error: { config?: { baseURL?: string; url?: string }; response?: { status?: number } }): boolean {
  if (error.response?.status !== 401) return false
  const p = requestPath(error.config)
  return (
    p.includes('/data/exchange') ||
    p.includes('/data/request') ||
    p.includes('/auth/login') ||
    p.includes('/auth/validate')
  )
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401: clear session, redirect only when not already logging in (avoid reload that hides login errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const onLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'
      if (!isUnauthorizedCredentialAttempt(error) && !onLoginPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
