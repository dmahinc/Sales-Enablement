import { useState, useEffect, useRef } from 'react'
import { FileText, FileSpreadsheet, Presentation, Loader, Video } from 'lucide-react'
import { api } from '../services/api'

const THUMB_WIDTH = 96
const THUMB_HEIGHT = 128

interface MaterialThumbnailProps {
  materialId: number
  token?: string
  fileFormat?: string
  className?: string
  width?: number
  height?: number
  /** When true, thumbnail fills its container (use in aspect-ratio layouts) */
  fill?: boolean
  /** When true, uses authenticated /materials/{id}/thumbnail (for Tracks). When false and token set, uses DSR token endpoint. */
  useAuth?: boolean
}

function FileIconFallback({ format }: { format?: string }) {
  const fmt = (format || '').toLowerCase()
  if (fmt === 'pptx' || fmt === 'ppt') return <Presentation className="w-8 h-8 text-amber-600" />
  if (fmt === 'xlsx' || fmt === 'xls') return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fmt)) return <Video className="w-8 h-8 text-violet-600" />
  return <FileText className="w-8 h-8 text-red-600" />
}

/**
 * Fetches pre-generated thumbnail. Small PNG, fast.
 * - DSR/RoomView: pass token, uses deal-rooms/token/.../thumbnail
 * - Tracks: pass useAuth=true, uses /materials/{id}/thumbnail (authenticated)
 */
export default function MaterialThumbnail({ materialId, token, fileFormat = '', className = '', width = THUMB_WIDTH, height = THUMB_HEIGHT, fill = false, useAuth = false }: MaterialThumbnailProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!materialId) return
    if (!useAuth && !token) return

    setLoading(true)
    setFallback(false)
    urlRef.current = null

    const controller = new AbortController()
    const req = useAuth
      ? api.get(`/materials/${materialId}/thumbnail`, { responseType: 'blob', signal: controller.signal })
      : api.get(`/deal-rooms/token/${token}/materials/${materialId}/thumbnail`, { responseType: 'blob', signal: controller.signal })
    req
      .then(res => {
        const blob = res.data as Blob
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setImgUrl(url)
        setLoading(false)
      })
      .catch(() => {
        setFallback(true)
        setLoading(false)
      })

    return () => {
      controller.abort()
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [token, materialId, useAuth])

  const sizeStyle = fill ? undefined : { width, height }
  const sizeClass = fill ? 'w-full h-full' : ''

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden ${sizeClass} ${className}`}
        style={sizeStyle}
      >
        <Loader className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (fallback || !imgUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 ${sizeClass} ${className}`}
        style={sizeStyle}
      >
        <FileIconFallback format={fileFormat} />
      </div>
    )
  }

  return (
    <img
      src={imgUrl}
      alt=""
      className={`rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 object-cover flex-shrink-0 ${sizeClass} ${className}`}
      style={sizeStyle}
    />
  )
}
