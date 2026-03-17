import { useState, useEffect, useRef } from 'react'
import { FileText, FileSpreadsheet, Presentation, Loader } from 'lucide-react'
import { api } from '../services/api'

const THUMB_WIDTH = 96
const THUMB_HEIGHT = 128

interface AuthenticatedMaterialThumbnailProps {
  materialId: number
  fileFormat?: string
  className?: string
  width?: number
  height?: number
}

function FileIconFallback({ format }: { format?: string }) {
  const fmt = (format || '').toLowerCase()
  if (fmt === 'pptx' || fmt === 'ppt') return <Presentation className="w-8 h-8 text-amber-600" />
  if (fmt === 'xlsx' || fmt === 'xls') return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
  return <FileText className="w-8 h-8 text-red-600" />
}

/**
 * Fetches pre-generated thumbnail (small PNG ~50KB) - lightning fast.
 * Backend extracts first page once, caches it. 404 for non-PDF → show icon.
 */
export default function AuthenticatedMaterialThumbnail({
  materialId,
  fileFormat = '',
  className = '',
  width = THUMB_WIDTH,
  height = THUMB_HEIGHT,
}: AuthenticatedMaterialThumbnailProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !materialId) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true)
      },
      { rootMargin: '100px', threshold: 0.01 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [materialId])

  useEffect(() => {
    if (!materialId || !visible) return

    setLoading(true)
    setFallback(false)
    urlRef.current = null

    api
      .get(`/materials/${materialId}/thumbnail`, { responseType: 'blob', timeout: 5000 })
      .then(res => {
        const url = URL.createObjectURL(res.data)
        urlRef.current = url
        setImgUrl(url)
        setLoading(false)
      })
      .catch(() => {
        setFallback(true)
        setLoading(false)
      })

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [materialId, visible])

  if (!visible) {
    return (
      <div ref={containerRef} style={{ width, height }}>
        <div
          className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 ${className}`}
          style={{ width, height }}
        >
          <FileIconFallback format={fileFormat} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div ref={containerRef} style={{ width, height }}>
        <div
          className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden ${className}`}
          style={{ width, height }}
        >
          <Loader className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (fallback || !imgUrl) {
    return (
      <div ref={containerRef} style={{ width, height }}>
        <div
          className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 ${className}`}
          style={{ width, height }}
        >
          <FileIconFallback format={fileFormat} />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width, height }}>
      <img
        src={imgUrl}
        alt=""
        className={`rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 object-cover ${className}`}
        style={{ width, height }}
      />
    </div>
  )
}
