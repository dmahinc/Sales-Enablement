import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { init as pptxInit } from 'pptx-preview'
import { X, Download, Loader, FileText } from 'lucide-react'
import { api } from '../services/api'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface ContentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  materialId: number
  materialName: string
  fileFormat?: string
  /** DSR: pass token for deal-rooms/token/.../view. Tracks: pass useAuth=true for /materials/{id}/view (authenticated). */
  token?: string
  useAuth?: boolean
  onDownload?: () => void
}

export default function ContentViewerModal({
  isOpen,
  onClose,
  materialId,
  materialName,
  fileFormat = '',
  token,
  useAuth = false,
  onDownload,
}: ContentViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const pptxContainerRef = useRef<HTMLDivElement>(null)
  const pptxInstanceRef = useRef<{ preview: (buf: ArrayBuffer) => void } | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const fmt = (fileFormat || '').toLowerCase()

  useEffect(() => {
    if (!isOpen || !materialId) return
    if (!useAuth && !token) return

    setLoading(true)
    setError(null)
    setBlobUrl(null)
    setNumPages(null)
    setPageNumber(1)
    blobUrlRef.current = null

    const controller = new AbortController()
    if (useAuth) {
      api
        .get(`/materials/${materialId}/view`, { responseType: 'blob', signal: controller.signal })
        .then((res) => {
          const blob = res.data as Blob
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setBlobUrl(url)
          setLoading(false)
        })
        .catch((e) => {
          if (e.name !== 'AbortError') {
            const msg = e.response?.data?.detail || e.message || 'Failed to load content'
            setError(typeof msg === 'string' ? msg : 'Failed to load content')
          }
          setLoading(false)
        })
    } else {
      api
        .get(`/deal-rooms/token/${token}/materials/${materialId}/view`, {
          responseType: 'blob',
          signal: controller.signal,
        })
        .then((res) => {
          const blob = res.data as Blob
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setBlobUrl(url)
          setLoading(false)
        })
        .catch((e) => {
          if (e.name !== 'AbortError') {
            const msg = e.response?.data?.detail || e.message || 'Failed to load content'
            setError(typeof msg === 'string' ? msg : 'Failed to load content')
          }
          setLoading(false)
        })
    }

    return () => {
      controller.abort()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [isOpen, token, materialId, useAuth])

  // PPTX preview init when blob is ready
  useEffect(() => {
    if (!blobUrl || fmt !== 'pptx' || !pptxContainerRef.current) return

    const container = pptxContainerRef.current
    pptxInstanceRef.current = pptxInit(container, { width: 800, height: 500 })

    fetch(blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        pptxInstanceRef.current?.preview(buf)
      })
      .catch(() => setError('Failed to render presentation'))

    return () => {
      pptxInstanceRef.current = null
    }
  }, [blobUrl, fmt])

  const handleClose = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">{materialName}</h3>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button onClick={onDownload} className="btn-ovh-secondary text-sm py-1.5 px-3 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p>{error}</p>
              {onDownload && (
                <button onClick={onDownload} className="btn-ovh-primary mt-4">
                  Download instead
                </button>
              )}
            </div>
          )}

          {!loading && !error && blobUrl && fmt === 'pdf' && (
            <div className="flex flex-col items-center">
              <Document file={blobUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} width={Math.min(800, window.innerWidth - 48)} />
              </Document>
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="btn-ovh-secondary text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                    className="btn-ovh-secondary text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !error && blobUrl && fmt === 'pptx' && (
            <div ref={pptxContainerRef} className="min-h-[500px] bg-slate-100 dark:bg-slate-900 rounded-lg" />
          )}

          {!loading && !error && blobUrl && ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fmt) && (
            <video
              src={blobUrl}
              controls
              className="w-full max-h-[70vh] rounded-lg bg-black"
              playsInline
            >
              Your browser does not support video playback.
            </video>
          )}

          {!loading && !error && blobUrl && !['pdf', 'pptx', 'mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fmt) && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p>Preview not available for this file type.</p>
              {onDownload && (
                <button onClick={onDownload} className="btn-ovh-primary mt-4">
                  Download to view
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
