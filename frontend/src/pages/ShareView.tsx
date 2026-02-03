import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Download, FileText, AlertCircle, Loader } from 'lucide-react'

export default function ShareView() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  const { data: sharedLink, isLoading, error } = useQuery({
    queryKey: ['shared-link', token],
    queryFn: () => {
      // Use public endpoint without auth headers
      return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/shared-links/token/${token}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Link not found or expired')
          }
          return res.json()
        })
    },
    retry: false,
  })

  const handleDownload = async () => {
    if (!sharedLink || !token) return
    
    setDownloading(true)
    try {
      // Use public download endpoint (no auth required)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/shared-links/token/${token}/download`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from Content-Disposition header or use material name
      const contentDisposition = response.headers.get('content-disposition')
      let filename = sharedLink.material_name || `document-${sharedLink.material_id}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to download file')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !sharedLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex items-center justify-center p-4">
        <div className="card-ovh p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Link Not Found</h1>
          <p className="text-slate-600 mb-6">
            This shared link is invalid, expired, or has been deactivated.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-ovh-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex items-center justify-center p-4">
      <div className="card-ovh p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-semibold text-primary-700 mb-2">
            Document Shared with You
          </h1>
          <p className="text-slate-600">
            You've been given access to view and download this document.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-600">
            <strong>Document:</strong> {sharedLink.material_name || `Material #${sharedLink.material_id}`}
          </p>
          {sharedLink.customer_email && (
            <p className="text-sm text-slate-600 mt-2">
              <strong>Shared with:</strong> {sharedLink.customer_name || sharedLink.customer_email}
            </p>
          )}
          <p className="text-sm text-slate-600 mt-2">
            <strong>Accesses:</strong> {sharedLink.access_count}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-ovh-primary w-full py-3 disabled:opacity-50"
          >
            {downloading ? (
              <div className="flex items-center justify-center">
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Downloading...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Download className="w-5 h-5 mr-2" />
                Download Document
              </div>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            © 2026 OVHcloud Products & Solutions Enablement Platform
          </p>
        </div>
      </div>
    </div>
  )
}
