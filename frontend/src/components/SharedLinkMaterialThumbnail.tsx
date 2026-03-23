import { useState, useEffect, useRef } from 'react'
import { FileText, FileSpreadsheet, Presentation, Loader, Video } from 'lucide-react'

const THUMB_WIDTH = 96
const THUMB_HEIGHT = 128

interface SharedLinkMaterialThumbnailProps {
  materialId: number
  shareToken: string
  fileFormat?: string
  className?: string
  width?: number
  height?: number
}

function FileIconFallback({ format }: { format?: string }) {
  const fmt = (format || '').toLowerCase()
  if (fmt === 'pptx' || fmt === 'ppt') return <Presentation className="w-8 h-8 text-amber-600" />
  if (fmt === 'xlsx' || fmt === 'xls') return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fmt)) return <Video className="w-8 h-8 text-violet-600" />
  return <FileText className="w-8 h-8 text-red-600" />
}

/**
 * Fetches pre-generated thumbnail via shared link. Small PNG, fast.
 */
export default function SharedLinkMaterialThumbnail({
  materialId,
  shareToken,
  fileFormat = '',
  className = '',
  width = THUMB_WIDTH,
  height = THUMB_HEIGHT,
}: SharedLinkMaterialThumbnailProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const urlRef = useRef<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  useEffect(() => {
    const el = containerRef.current
    if (!el || !shareToken) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true)
      },
      { rootMargin: '100px', threshold: 0.01 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [shareToken])

  useEffect(() => {
    if (!shareToken || !visible) return

    setLoading(true)
    setFallback(false)
    urlRef.current = null

    fetch(`${apiUrl}/shared-links/token/${shareToken}/thumbnail`)
      .then(res => {
        if (!res.ok) throw new Error('No thumbnail')
        return res.blob()
      })
      .then(blob => {
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
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [shareToken, apiUrl, visible])

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
