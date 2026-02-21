import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { FileText, Upload, Plus, Edit, Trash2, Download, Filter, Cloud, Server, HardDrive, Users, FolderOpen, Share2, X, Check, Search, Sparkles, Eye, EyeOff, List, Grid, ChevronRight, ChevronDown, Home, Folder, ClipboardList, Presentation, GraduationCap, FileSpreadsheet, LucideIcon, Clock, Calendar } from 'lucide-react'
import Modal from '../components/Modal'
import MaterialForm from '../components/MaterialForm'
import FileUploadModal from '../components/FileUploadModal'
import BatchUploadModal from '../components/BatchUploadModal'
import ShareLinkModal from '../components/ShareLinkModal'
import MultiSelect from '../components/MultiSelect'
import { useAuth } from '../contexts/AuthContext'

// Helper function to get icon for material type
function getMaterialTypeIcon(materialType: string | null | undefined): LucideIcon {
  if (!materialType) {
    return FileText
  }
  
  const type = materialType.toLowerCase().trim()
  
  // Handle all possible formats:
  // - Frontend format: product_brief, sales_deck, sales_enablement_deck, datasheet
  // - Database format: PRODUCT_BRIEF, PRODUCT_SALES_DECK, PRODUCT_SALES_ENABLEMENT_DECK, PRODUCT_DATASHEET
  // - Mixed case variations
  
  if (type === 'product_brief' || type === 'product_brief') {
    return ClipboardList
  }
  
  if (type === 'sales_deck' || type === 'product_sales_deck' || type.includes('sales_deck')) {
    return Presentation
  }
  
  if (type === 'sales_enablement_deck' || type === 'product_sales_enablement_deck' || type.includes('sales_enablement')) {
    return GraduationCap
  }
  
  if (type === 'datasheet' || type === 'product_datasheet' || type.includes('datasheet')) {
    return FileSpreadsheet
  }
  
  return FileText
}

// Helper function to get background color class based on material type
function getMaterialTypeBgColor(materialType: string | null | undefined): string {
  if (!materialType) return 'bg-slate-50'
  const type = materialType.toLowerCase().trim()
  switch (type) {
    case 'product_brief':
      return 'bg-blue-50'
    case 'sales_deck':
    case 'product_sales_deck':
      return 'bg-purple-50'
    case 'sales_enablement_deck':
    case 'product_sales_enablement_deck':
      return 'bg-green-50'
    case 'datasheet':
    case 'product_datasheet':
      return 'bg-orange-50'
    default:
      return 'bg-slate-50'
  }
}

const UNIVERSES = [
  { id: 'all', name: 'All Materials', icon: FolderOpen, color: 'text-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  { id: 'Public Cloud', name: 'Public Cloud', icon: Cloud, color: 'text-primary-500', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
  { id: 'Private Cloud', name: 'Private Cloud', icon: Server, color: 'text-violet-500', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  { id: 'Bare Metal', name: 'Bare Metal', icon: HardDrive, color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'Hosting & Collaboration', name: 'Hosting & Collaboration', icon: Users, color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
]

// Helper function to get color classes for material type
function getMaterialTypeColors(materialType: string | null | undefined): { bg: string; icon: string; border: string } {
  if (!materialType) return { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-200' }
  
  const type = materialType.toLowerCase().trim()
  
  switch (type) {
    case 'product_brief':
      return { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' }
    case 'sales_deck':
    case 'product_sales_deck':
      return { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' }
    case 'sales_enablement_deck':
    case 'product_sales_enablement_deck':
      return { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' }
    case 'datasheet':
    case 'product_datasheet':
      return { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' }
    default:
      return { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-200' }
  }
}

// Helper function to calculate freshness
function getFreshnessInfo(lastUpdated?: string): { label: string; color: string; days: number | null } {
  if (!lastUpdated) {
    return { label: 'No date', color: 'text-slate-400', days: null }
  }
  
  const days = Math.floor((new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
  
  if (days <= 30) {
    return { label: 'Fresh', color: 'text-green-600', days }
  } else if (days <= 90) {
    return { label: 'Recent', color: 'text-blue-600', days }
  } else if (days <= 180) {
    return { label: 'Aging', color: 'text-yellow-600', days }
  } else if (days <= 365) {
    return { label: 'Stale', color: 'text-orange-600', days }
  } else {
    return { label: 'Very Stale', color: 'text-red-600', days }
  }
}

// Helper function to format material type display (handles 'Other' case)
function formatMaterialType(material: any): string {
  if (!material.material_type) {
    return 'Unknown'
  }
  
  const type = material.material_type.toLowerCase().trim()
  if (type === 'other' && material.other_type_description) {
    return material.other_type_description
  }
  
  return material.material_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper function to format material title as <Product Name> • <Material Type>
function formatMaterialTitle(material: any): string {
  const productName = material.product_name || 'Unknown Product'
  const materialType = formatMaterialType(material)
  return `${productName} • ${materialType}`
}

// Browse view material card component with gallery view
interface BrowseMaterialCardProps {
  material: any
  onDownload: (material: any) => void
  onShare: (material: any) => void
  onEdit?: (material: any) => void
  onDelete?: (id: number) => void
  onPreview: (material: any) => void
  canEditDelete?: boolean
}

function BrowseMaterialCard({ material, onDownload, onShare, onEdit, onDelete, onPreview, canEditDelete = false }: BrowseMaterialCardProps) {
  const colors = getMaterialTypeColors(material.material_type)
  const MaterialIcon = getMaterialTypeIcon(material.material_type)
  const freshness = getFreshnessInfo(material.last_updated)
  
  return (
    <div 
      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-primary-300 transition-all duration-200 cursor-pointer"
      onClick={() => onPreview(material)}
    >
      {/* Thumbnail/Icon Section */}
      <div className={`${colors.bg} ${colors.border} border-b-2 h-48 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        <MaterialIcon className={`w-16 h-16 ${colors.icon} relative z-10 transition-transform group-hover:scale-110`} />
        
        {/* Document Type Badge (replacing status) */}
        {material.material_type && (
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.bg} ${colors.icon}`}>
              {formatMaterialType(material)}
            </span>
          </div>
        )}
        
        {/* Freshness Badge */}
        {freshness.days !== null && (
          <div className="absolute top-3 left-3">
            <div className={`flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium ${freshness.color}`}>
              <Clock className="w-3 h-3" />
              <span>{freshness.label}</span>
            </div>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 z-20">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <Eye className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-medium text-slate-700">Preview</span>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {formatMaterialTitle(material)}
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          {material.pmm_in_charge_name ? (
            <span className="text-xs text-slate-600 font-medium">
              PMM: {material.pmm_in_charge_name}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">
              No PMM assigned
            </span>
          )}
          {material.usage_count !== undefined && material.usage_count > 0 && (
            <span className="text-xs text-slate-500 flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{material.usage_count}</span>
            </span>
          )}
        </div>
        
        {material.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {material.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span className="truncate">{material.file_name || material.name}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          {material.status === 'published' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare(material)
              }}
              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {material.file_path && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownload(material)
              }}
              className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {canEditDelete && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(material)
              }}
              className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canEditDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Are you sure you want to delete this material?')) {
                  onDelete(material.id)
                }
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface MaterialPreviewModalProps {
  material: any
  isOpen: boolean
  onClose: () => void
  onDownload: (material: any) => void
  onShare: (material: any) => void
  onEdit: (material: any) => void
  onDelete: (id: number) => void
  canEditDelete?: boolean
}

function MaterialPreviewModal({ material, isOpen, onClose, onDownload, onShare, onEdit, onDelete, canEditDelete = false }: MaterialPreviewModalProps) {
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [progressStep, setProgressStep] = useState<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const colors = getMaterialTypeColors(material.material_type)
  const MaterialIcon = getMaterialTypeIcon(material.material_type)
  const freshness = getFreshnessInfo(material.last_updated)
  
  // Reset summary state when modal closes or material changes
  useEffect(() => {
    if (!isOpen) {
      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setExecutiveSummary(null)
      setSummaryError(null)
      setProgressStep('')
      setIsLoadingSummary(false)
    }
  }, [isOpen, material.id])
  
  // Fetch executive summary when modal opens and material has a file
  useEffect(() => {
    // Only fetch if modal is open, material has file, and we haven't loaded yet
    if (isOpen && material.file_path && !executiveSummary && !isLoadingSummary && !summaryError) {
      setIsLoadingSummary(true)
      setSummaryError(null)
      setProgressStep('Initializing...')
      
      // Create AbortController for timeout
      const controller = new AbortController()
      abortControllerRef.current = controller
      
      const timeoutId = setTimeout(() => {
        controller.abort()
        setProgressStep('')
        setSummaryError('Request timed out after 35 seconds. Check backend logs: docker logs -f sales-enablement-backend')
        setIsLoadingSummary(false)
        timeoutRef.current = null
      }, 35000) // 35 second timeout
      timeoutRef.current = timeoutId
      
      // Progress simulation based on time
      const progressInterval = setInterval(() => {
        setProgressStep(prev => {
          if (prev === 'Initializing...') return 'Extracting text from document...'
          if (prev === 'Extracting text from document...') return 'Sending to AI service...'
          if (prev === 'Sending to AI service...') return 'Generating summary...'
          return 'Processing...'
        })
      }, 8000) // Update every 8 seconds
      progressIntervalRef.current = progressInterval
      
      api.get(`/materials/${material.id}/executive-summary`, {
        signal: controller.signal,
        timeout: 35000
      })
        .then(response => {
          // Only process if controller hasn't been aborted
          if (!controller.signal.aborted) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            setProgressStep('')
            setExecutiveSummary(response.data.summary)
            setIsLoadingSummary(false)
            abortControllerRef.current = null
          }
        })
        .catch(error => {
          // Don't show error if request was aborted (component unmounted or modal closed)
          if (error.name === 'AbortError' || controller.signal.aborted) {
            return
          }
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setProgressStep('')
          console.error('Error fetching executive summary:', error)
          
          let errorMessage = 'Failed to generate executive summary'
          if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
            errorMessage = 'Request timed out after 35 seconds. Check backend logs: docker logs -f sales-enablement-backend'
          } else if (error.response?.status === 503) {
            errorMessage = 'AI service is temporarily unavailable. Check backend logs for details.'
          } else if (error.response?.status === 500) {
            errorMessage = `Server error: ${error.response?.data?.detail || 'Check backend logs'}`
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail
          }
          
          setSummaryError(errorMessage)
          setIsLoadingSummary(false)
          abortControllerRef.current = null
        })
      
      // Cleanup function - only abort if component unmounts or modal closes
      return () => {
        // Don't abort here - let the request complete unless modal is closing
        // The cleanup in the isOpen effect will handle aborting
      }
    }
  }, [isOpen, material.id, material.file_path])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
        
        {/* Modal */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${colors.bg} px-6 py-4 border-b ${colors.border}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-lg bg-white ${colors.border} border-2`}>
                  <MaterialIcon className={`w-8 h-8 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{formatMaterialTitle(material)}</h2>
                  <div className="flex items-center space-x-3 flex-wrap">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${colors.bg} ${colors.icon}`}>
                      {formatMaterialType(material)}
                    </span>
                    {material.status && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        material.status === 'published' ? 'bg-green-100 text-green-700' :
                        material.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {material.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            {/* Description */}
            {material.description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                <p className="text-sm text-slate-600">{material.description}</p>
              </div>
            )}
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {material.universe_name && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Universe</h4>
                  <p className="text-sm text-slate-900">{material.universe_name}</p>
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">File Name</h4>
                <p className="text-sm text-slate-900">{material.file_name || material.name}</p>
              </div>
              {material.last_updated && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Last Updated</h4>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-900">
                      {new Date(material.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {freshness.days !== null && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Freshness</h4>
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-4 h-4 ${freshness.color}`} />
                    <p className={`text-sm font-medium ${freshness.color}`}>
                      {freshness.label} ({freshness.days} days)
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tags */}
            {material.tags && material.tags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((tag: string, index: number) => (
                    <span key={index} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Executive Summary */}
            {material.file_path && (
              <div className="mb-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                  <span>Executive Summary</span>
                  {isLoadingSummary && (
                    <span className="ml-2 text-xs text-slate-400">(Generating...)</span>
                  )}
                </h3>
                {isLoadingSummary && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                      <span className="font-medium">Analyzing document with AI...</span>
                    </div>
                    {progressStep && (
                      <div className="ml-6 text-xs text-slate-500">
                        <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"></span>
                        {progressStep}
                      </div>
                    )}
                    <div className="ml-6 space-y-1">
                      <p className="text-xs text-slate-400">This may take 20-30 seconds. Please wait...</p>
                      <p className="text-xs text-slate-400 font-mono">
                        Monitor progress: <code className="bg-slate-100 px-1 rounded">docker logs -f sales-enablement-backend</code>
                      </p>
                    </div>
                  </div>
                )}
                {summaryError && (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="font-medium mb-1">Unable to generate summary</p>
                    <p className="text-xs">{summaryError}</p>
                  </div>
                )}
                {executiveSummary && !isLoadingSummary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {executiveSummary.split('\n').map((line, index) => {
                        // Convert markdown headers to styled divs
                        if (line.trim().startsWith('## ')) {
                          return (
                            <h2 key={index} className="text-base font-semibold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-300">
                              {line.substring(3).trim()}
                            </h2>
                          )
                        }
                        if (line.trim().startsWith('### ')) {
                          return (
                            <h3 key={index} className="text-sm font-semibold text-slate-800 mt-3 mb-1">
                              {line.substring(4).trim()}
                            </h3>
                          )
                        }
                        // Convert bullet points
                        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                          return (
                            <div key={index} className="ml-4 mb-1 flex items-start">
                              <span className="text-slate-500 mr-2">•</span>
                              <span>{line.trim().substring(2)}</span>
                            </div>
                          )
                        }
                        // Regular paragraphs
                        if (line.trim()) {
                          return (
                            <p key={index} className="mb-3 text-slate-700">
                              {line.trim()}
                            </p>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            {canEditDelete && (
              <button
                onClick={() => {
                  onEdit(material)
                  onClose()
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            {material.status === 'published' && (
              <button
                onClick={() => {
                  onShare(material)
                  onClose()
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
            {material.file_path && (
              <button
                onClick={() => {
                  onDownload(material)
                  onClose()
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
            {canEditDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this material?')) {
                    onDelete(material.id)
                    onClose()
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Materials() {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  const isSales = user?.role === 'sales'
  const canEditDelete = isDirector || isPMM || user?.is_superuser
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [sharingMaterial, setSharingMaterial] = useState<any>(null)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [previewMaterial, setPreviewMaterial] = useState<any>(null)
  const [selectedUniverses, setSelectedUniverses] = useState<string[]>([]) // Empty array means "all"
  const [filterTypes, setFilterTypes] = useState<string[]>([]) // Empty array means "all"
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]) // Empty array means "all"
  const [filterCategoryIds, setFilterCategoryIds] = useState<number[]>([]) // Empty array means "all"
  const [filterProductIds, setFilterProductIds] = useState<number[]>([]) // Empty array means "all"
  const [searchQuery, setSearchQuery] = useState<string>('')
  // Track which universes have archived materials visible (default: all hidden)
  const [showArchivedByUniverse, setShowArchivedByUniverse] = useState<Record<string, boolean>>({})
  // View toggle: 'list' or 'browse'
  const [viewMode, setViewMode] = useState<'list' | 'browse'>('list')
  // Browse view state
  const [browseSelectedUniverseId, setBrowseSelectedUniverseId] = useState<number | null>(null)
  const [browseSelectedCategoryId, setBrowseSelectedCategoryId] = useState<number | null>(null)
  const [browseSelectedProductId, setBrowseSelectedProductId] = useState<number | null>(null)
  const [expandedUniverses, setExpandedUniverses] = useState<Set<number>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [downloadingMaterial, setDownloadingMaterial] = useState<any>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })


  // Fetch product hierarchy for filters
  const { data: universes = [], isLoading: universesLoading, error: universesError } = useQuery({
    queryKey: ['products', 'universes'],
    queryFn: () => api.get('/products/universes').then(res => res.data),
    retry: 1,
  })
  
  // Fallback: if universes API fails or returns empty, use hardcoded universes from materials
  const effectiveUniverses = useMemo(() => {
    if (universes && universes.length > 0) {
      return universes
    }
    // Fallback: extract universes from materials
    if (materials && materials.length > 0) {
      const universeNames = [...new Set(materials.map((m: any) => m.universe_name).filter(Boolean))]
      return universeNames.map((name, index) => ({
        id: index + 1000, // Use high IDs to avoid conflicts
        name: name,
        display_name: name,
      }))
    }
    // Final fallback: use hardcoded UNIVERSES constant
    return UNIVERSES.filter(u => u.id !== 'all').map((u, index) => ({
      id: index + 2000,
      name: u.name,
      display_name: u.name,
    }))
  }, [universes, materials])
  
  // Get universe IDs from selected universe names
  const selectedUniverseIds = selectedUniverses.length > 0 && effectiveUniverses.length > 0
    ? selectedUniverses
        .map(name => effectiveUniverses.find((u: any) => u.name === name)?.id)
        .filter((id): id is number => id !== undefined)
    : []

  // Fetch categories for all selected universes
  const { data: allCategories = [] } = useQuery({
    queryKey: ['products', 'categories', 'all'],
    queryFn: () => api.get('/products/categories').then(res => res.data),
  })

  // Filter categories by selected universes
  const categories = selectedUniverseIds.length > 0
    ? allCategories.filter((cat: any) => selectedUniverseIds.includes(cat.universe_id))
    : allCategories

  // Fetch products for selected universes
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'list', 'all'],
    queryFn: () => api.get('/products/').then(res => res.data),
  })

  // Filter products by selected universes and categories
  const products = allProducts.filter((prod: any) => {
    if (selectedUniverseIds.length > 0 && !selectedUniverseIds.includes(prod.universe_id)) {
      return false
    }
    if (filterCategoryIds.length > 0 && (!prod.category_id || !filterCategoryIds.includes(prod.category_id))) {
      return false
    }
    return true
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
  })

  const filteredMaterials = useMemo(() => {
    return (materials || []).filter((m: any) => {
      // Archived filter - hide archived by default unless explicitly shown for this universe
      if (m.status === 'archived') {
        const universeName = m.universe_name || 'Uncategorized'
        // If archived materials are not explicitly shown for this universe, hide them
        if (!showArchivedByUniverse[universeName]) {
          return false
        }
      }
      
      // Search filter - search by name
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        if (!m.name?.toLowerCase().includes(query)) return false
      }
      
      // Universe filter - if any universes are selected, filter by them
      if (selectedUniverses.length > 0) {
        if (!m.universe_name || !selectedUniverses.includes(m.universe_name)) return false
      }
      
      // Material Type filter - if any types are selected, filter by them
      if (filterTypes.length > 0) {
        if (!m.material_type || !filterTypes.includes(m.material_type)) return false
      }
      
      // Status filter - if any statuses are selected, filter by them
      if (filterStatuses.length > 0) {
        if (!m.status || !filterStatuses.includes(m.status)) return false
      }
      
      // Product filter - if any products are selected, filter by them
      if (filterProductIds.length > 0) {
        const matchingProducts = allProducts.filter((p: any) => filterProductIds.includes(p.id))
        // Check both name and display_name since materials might store either
        const productNames = matchingProducts.flatMap((p: any) => [p.name, p.display_name]).filter(Boolean) as string[]
        if (!m.product_name || !productNames.some((name: string) => m.product_name === name || m.product_name?.includes(name))) return false
      }
      
      // Category filter - if any categories are selected, filter by products in those categories
      if (filterCategoryIds.length > 0) {
        const matchingProducts = allProducts.filter((p: any) => 
          p.category_id && filterCategoryIds.includes(p.category_id)
        )
        // Check both name and display_name
        const productNames = matchingProducts.flatMap((p: any) => [p.name, p.display_name]).filter(Boolean) as string[]
        if (!m.product_name || !productNames.some((name: string) => m.product_name === name || m.product_name?.includes(name))) return false
      }
      
      return true
    })
  }, [materials, selectedUniverses, filterTypes, filterStatuses, filterCategoryIds, filterProductIds, searchQuery, allProducts, showArchivedByUniverse])


  // Group ALL materials by universe (for card counts - always show total)
  const allMaterialsByUniverse = (materials || []).reduce((acc: any, material: any) => {
    const universe = material.universe_name || 'Uncategorized'
    if (!acc[universe]) {
      acc[universe] = []
    }
    acc[universe].push(material)
    return acc
  }, {})

  // Group FILTERED materials by universe (for display when no filters)
  const materialsByUniverse = filteredMaterials.reduce((acc: any, material: any) => {
    const universe = material.universe_name || 'Uncategorized'
    if (!acc[universe]) {
      acc[universe] = []
    }
    acc[universe].push(material)
    return acc
  }, {})

  // Get universe info helper
  const getUniverseInfo = (universeName: string) => {
    return UNIVERSES.find(u => u.id === universeName) || {
      id: universeName,
      name: universeName,
      icon: FolderOpen,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200'
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      deleteMutation.mutate(id)
    }
  }

  // Browse view functions
  const handleBrowseUniverseClick = (universeId: number) => {
    setBrowseSelectedUniverseId(browseSelectedUniverseId === universeId ? null : universeId)
    setBrowseSelectedCategoryId(null)
    setBrowseSelectedProductId(null)
  }

  const handleBrowseCategoryClick = (categoryId: number) => {
    setBrowseSelectedCategoryId(browseSelectedCategoryId === categoryId ? null : categoryId)
    setBrowseSelectedProductId(null)
  }

  const handleBrowseProductClick = (productId: number) => {
    setBrowseSelectedProductId(browseSelectedProductId === productId ? null : productId)
  }

  const toggleUniverseExpansion = (universeId: number) => {
    const newExpanded = new Set(expandedUniverses)
    if (newExpanded.has(universeId)) {
      newExpanded.delete(universeId)
    } else {
      newExpanded.add(universeId)
    }
    setExpandedUniverses(newExpanded)
  }

  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleUniverse = (universeId: number) => {
    setExpandedUniverses(prev => {
      const next = new Set(prev)
      if (next.has(universeId)) {
        next.delete(universeId)
      } else {
        next.add(universeId)
      }
      return next
    })
  }

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const getCategoryProducts = (categoryId: number) => {
    return allProducts.filter((p: any) => p.category_id === categoryId)
  }

  const handleBrowseUniverseSelect = (universeId: number) => {
    setBrowseSelectedUniverseId(universeId)
    setBrowseSelectedCategoryId(null)
    setBrowseSelectedProductId(null)
    if (!expandedUniverses.has(universeId)) {
      toggleUniverse(universeId)
    }
  }

  const handleBrowseCategorySelect = (categoryId: number) => {
    setBrowseSelectedCategoryId(categoryId)
    setBrowseSelectedProductId(null)
    if (!expandedCategories.has(categoryId)) {
      toggleCategory(categoryId)
    }
  }

  const handleBrowseProductSelect = (productId: number) => {
    setBrowseSelectedProductId(productId)
  }

  // Browse view filtered materials
  const browseFilteredMaterials = useMemo(() => {
    let filtered = materials || []

    // Filter by hierarchy selection
    if (browseSelectedUniverseId) {
      const universe = effectiveUniverses.find((u: any) => u.id === browseSelectedUniverseId)
      if (universe) {
        filtered = filtered.filter((m: any) => m.universe_name === universe.name || m.universe_name === universe.display_name)
      }
    }
    if (browseSelectedCategoryId) {
      const category = allCategories.find((c: any) => c.id === browseSelectedCategoryId)
      if (category) {
        const categoryProducts = allProducts.filter((p: any) => p.category_id === browseSelectedCategoryId)
        const productNames = categoryProducts.map((p: any) => p.name).concat(categoryProducts.map((p: any) => p.display_name))
        filtered = filtered.filter((m: any) => m.product_name && productNames.includes(m.product_name))
      }
    }
    if (browseSelectedProductId) {
      const product = allProducts.find((p: any) => p.id === browseSelectedProductId)
      if (product) {
        filtered = filtered.filter((m: any) => 
          m.product_name === product.name || m.product_name === product.display_name
        )
      }
    }

    // Apply the same filters as list view
    // Universe filter - if any universes are selected, filter by them
    if (selectedUniverses.length > 0) {
      filtered = filtered.filter((m: any) => {
        if (!m.universe_name || !selectedUniverses.includes(m.universe_name)) return false
        return true
      })
    }

    // Material Type filter - if any types are selected, filter by them
    if (filterTypes.length > 0) {
      filtered = filtered.filter((m: any) => {
        if (!m.material_type || !filterTypes.includes(m.material_type)) return false
        return true
      })
    }

    // Status filter - if any statuses are selected, filter by them
    if (filterStatuses.length > 0) {
      filtered = filtered.filter((m: any) => {
        if (!m.status || !filterStatuses.includes(m.status)) return false
        return true
      })
    }

    // Product filter - if any products are selected, filter by them
    if (filterProductIds.length > 0) {
      const matchingProducts = allProducts.filter((p: any) => filterProductIds.includes(p.id))
      const productNames = matchingProducts.flatMap((p: any) => [p.name, p.display_name]).filter(Boolean) as string[]
      filtered = filtered.filter((m: any) => {
        if (!m.product_name || !productNames.some((name: string) => m.product_name === name || m.product_name?.includes(name))) return false
        return true
      })
    }

    // Category filter - if any categories are selected, filter by products in those categories
    if (filterCategoryIds.length > 0) {
      const categoryProducts = allProducts.filter((p: any) => 
        p.category_id && filterCategoryIds.includes(p.category_id)
      )
      const productNames = categoryProducts.flatMap((p: any) => [p.name, p.display_name]).filter(Boolean) as string[]
      filtered = filtered.filter((m: any) => {
        if (!m.product_name || !productNames.some((name: string) => m.product_name === name || m.product_name?.includes(name))) return false
        return true
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((m: any) =>
        m.name?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.product_name?.toLowerCase().includes(query) ||
        m.universe_name?.toLowerCase().includes(query) ||
        m.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    // Filter archived materials
    filtered = filtered.filter((m: any) => {
      if (m.status === 'archived') {
        const universeName = m.universe_name || 'Uncategorized'
        return showArchivedByUniverse[universeName] || false
      }
      return true
    })

    return filtered
  }, [materials, browseSelectedUniverseId, browseSelectedCategoryId, browseSelectedProductId, searchQuery, effectiveUniverses, allCategories, allProducts, showArchivedByUniverse, selectedUniverses, filterTypes, filterStatuses, filterCategoryIds, filterProductIds])

  // Browse view materials grouped by universe
  const browseMaterialsByUniverse = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    browseFilteredMaterials.forEach((material: any) => {
      const universe = material.universe_name || 'Uncategorized'
      if (!grouped[universe]) {
        grouped[universe] = []
      }
      grouped[universe].push(material)
    })
    return grouped
  }, [browseFilteredMaterials])

  // Universe display order (matching menu order)
  const universeDisplayOrder = [
    'Public Cloud',
    'Private Cloud',
    'Bare Metal',
    'Hosting & Collaboration'
  ]

  // Get sorted universe entries for display
  const sortedBrowseMaterialsByUniverse = useMemo(() => {
    const entries = Object.entries(browseMaterialsByUniverse)
    const ordered: Array<[string, any[]]> = []
    const unordered: Array<[string, any[]]> = []
    
    // First, add universes in the specified order
    universeDisplayOrder.forEach(universeName => {
      const entry = entries.find(([name]) => name === universeName)
      if (entry) {
        ordered.push(entry)
      }
    })
    
    // Then, add any remaining universes (like 'Uncategorized')
    entries.forEach(entry => {
      if (!universeDisplayOrder.includes(entry[0])) {
        unordered.push(entry)
      }
    })
    
    return [...ordered, ...unordered]
  }, [browseMaterialsByUniverse])

  // Browse view breadcrumbs
  const browseBreadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'All Materials', onClick: () => {
        setBrowseSelectedUniverseId(null)
        setBrowseSelectedCategoryId(null)
        setBrowseSelectedProductId(null)
      }}
    ]
    if (browseSelectedUniverseId) {
      const universe = effectiveUniverses.find((u: any) => u.id === browseSelectedUniverseId)
      if (universe) {
        crumbs.push({
          label: universe.display_name,
          onClick: () => {
            setBrowseSelectedCategoryId(null)
            setBrowseSelectedProductId(null)
          }
        })
      }
    }
    if (browseSelectedCategoryId) {
      const category = allCategories.find((c: any) => c.id === browseSelectedCategoryId)
      if (category) {
        crumbs.push({
          label: category.display_name,
          onClick: () => setBrowseSelectedProductId(null)
        })
      }
    }
    if (browseSelectedProductId) {
      const product = allProducts.find((p: any) => p.id === browseSelectedProductId)
      if (product) {
        crumbs.push({ label: product.display_name })
      }
    }
    return crumbs
  }, [browseSelectedUniverseId, browseSelectedCategoryId, browseSelectedProductId, effectiveUniverses, allCategories, allProducts])

  const handleDownload = async (material: any) => {
    setDownloadingMaterial(material)
    setDownloadProgress(0)

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const url = `${API_URL}/materials/${material.id}/download`

      xhr.open('GET', url, true)
      xhr.responseType = 'blob'

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      // No timeout - let it download as long as needed
      xhr.timeout = 0

      // Track download progress
      xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setDownloadProgress(percentComplete)
        }
      })

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', material.file_name || `${material.name}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          setDownloadingMaterial(null)
          setDownloadProgress(0)
          resolve()
        } else {
          try {
            const errorBlob = xhr.response
            errorBlob.text().then((text: string) => {
              let errorMessage = 'Failed to download file'
              try {
                const errorData = JSON.parse(text)
                errorMessage = errorData.detail || errorMessage
              } catch {
                errorMessage = text || errorMessage
              }
              setDownloadingMaterial(null)
              setDownloadProgress(0)
              alert(`Failed to download file: ${errorMessage}`)
              reject(new Error(errorMessage))
            })
          } catch {
            setDownloadingMaterial(null)
            setDownloadProgress(0)
            const errorMessage = `Failed to download file: HTTP ${xhr.status}`
            alert(errorMessage)
            reject(new Error(errorMessage))
          }
        }
      }

      xhr.onerror = () => {
        setDownloadingMaterial(null)
        setDownloadProgress(0)
        const errorMessage = 'Network error while downloading file'
        alert(errorMessage)
        reject(new Error(errorMessage))
      }

      xhr.ontimeout = () => {
        setDownloadingMaterial(null)
        setDownloadProgress(0)
        const errorMessage = 'Download timeout'
        alert(errorMessage)
        reject(new Error(errorMessage))
      }

      xhr.send()
    })
  }

  // Render material row component
  const renderMaterialRow = (material: any) => {
    if (!material) {
      return null
    }
    const universeInfo = getUniverseInfo(material.universe_name || 'Uncategorized')
    const UniverseIcon = universeInfo.icon
    const bgColor = getMaterialTypeBgColor(material.material_type)
    
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          <div className={`${bgColor} p-2 rounded-lg mr-4 flex items-center gap-1`} title={`Type: ${material.material_type || 'null'}`}>
            {(() => {
              const MaterialIcon = getMaterialTypeIcon(material.material_type)
              return (
                <>
                  <MaterialIcon className="h-5 w-5 text-primary-500" />
                  <span className="text-xs text-slate-400 hidden">{material.material_type || 'null'}</span>
                </>
              )
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-slate-900 truncate">{formatMaterialTitle(material)}</p>
            </div>
            <p className="text-xs text-slate-500">
              <span className="inline-flex items-center">
                {material.file_name || material.name}
                {material.last_updated && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Last update: {new Date(material.last_updated).toLocaleDateString()}</span>
                  </>
                )}
                {material.pmm_in_charge_name && (
                  <>
                    <span className="mx-2">•</span>
                    <span>PMM: {material.pmm_in_charge_name}</span>
                  </>
                )}
              </span>
            </p>
            {material.description && (
              <p className="mt-1 text-sm text-slate-600 line-clamp-1">{material.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          <div className="flex flex-col items-end">
            <span className={`badge-ovh ${
              material.status === 'published' ? 'badge-ovh-success' :
              material.status === 'review' ? 'badge-ovh-warning' :
              material.status === 'archived' ? 'badge-ovh-gray' :
              'badge-ovh-gray'
            }`}>
              {material.status}
            </span>
            {material.status === 'archived' && material.updated_at && (
              <span className="text-xs text-slate-400 mt-1">
                Archived: {new Date(material.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPreviewMaterial(material)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center border border-transparent hover:border-blue-200"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            {material.status === 'published' && (
              <button
                onClick={() => {
                  setSharingMaterial(material)
                  setIsShareModalOpen(true)
                }}
                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {material.file_path && (
              <button
                onClick={() => handleDownload(material)}
                className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {canEditDelete && (
              <>
                <button
                  onClick={() => setEditingMaterial(material)}
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(material.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading materials...</span>
      </div>
    )
  }

  // Render browse view
  if (viewMode === 'browse') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 px-4 pt-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary-700">Materials</h1>
            <p className="mt-1 text-slate-500">Browse materials by hierarchy</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {/* View Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 text-sm font-medium transition-all bg-white text-slate-600 hover:bg-slate-50 flex items-center space-x-2"
                title="List View"
              >
                <List className="w-5 h-5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('browse')}
                className="px-4 py-2.5 text-sm font-medium transition-all border-l border-slate-200 bg-primary-500 text-white flex items-center space-x-2"
                title="Browse View"
              >
                <Grid className="w-5 h-5" />
                <span>Browse</span>
              </button>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-ovh-secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Material
            </button>
            {(isDirector || isPMM) && (
              <button
                onClick={() => setIsBatchUploadModalOpen(true)}
                className="btn-ovh-primary flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Batch Upload with AI
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Hierarchical Navigation */}
          <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex-shrink-0 shadow-sm">
            <div className="p-4 sticky top-0 bg-white border-b border-slate-200 z-10">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Product Hierarchy</h2>
              <p className="text-xs text-slate-500">Browse materials by universe, category, and product</p>
            </div>
            <div className="p-4 pt-2">
              
              {/* All Materials */}
              <button
                onClick={() => {
                  setBrowseSelectedUniverseId(null)
                  setBrowseSelectedCategoryId(null)
                  setBrowseSelectedProductId(null)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center space-x-2 ${
                  !browseSelectedUniverseId && !browseSelectedCategoryId && !browseSelectedProductId
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>All Materials</span>
              </button>

              {/* Loading State */}
              {universesLoading && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  Loading hierarchy...
                </div>
              )}
              
              {/* Error State */}
              {universesError && !universesLoading && (
                <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 rounded-lg mb-2">
                  Could not load hierarchy from API. Using materials data.
                </div>
              )}
              
              {/* Universes */}
              {effectiveUniverses.length === 0 && !universesLoading && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No universes found. Create materials to see hierarchy.
                </div>
              )}
              
              {effectiveUniverses.map((universe: any) => {
                const universeCategories = allCategories.filter((c: any) => c.universe_id === universe.id)
                const isExpanded = expandedUniverses.has(universe.id)
                const isSelected = browseSelectedUniverseId === universe.id && !browseSelectedCategoryId && !browseSelectedProductId

                return (
                  <div key={universe.id} className="mb-1">
                    <button
                      onClick={() => handleBrowseUniverseSelect(universe.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {universeCategories.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleUniverse(universe.id)
                          }}
                          className="p-0.5"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <FolderOpen className="w-4 h-4" />
                      <span className="flex-1">{universe.display_name}</span>
                      <span className="text-xs text-slate-400">
                        {materials?.filter((m: any) => m.universe_name === universe.name).length || 0}
                      </span>
                    </button>

                    {/* Categories */}
                    {isExpanded && universeCategories.map((category: any) => {
                      const categoryProducts = getCategoryProducts(category.id)
                      const isCategoryExpanded = expandedCategories.has(category.id)
                      const isCategorySelected = browseSelectedCategoryId === category.id && !browseSelectedProductId

                      return (
                        <div key={category.id} className="ml-6 mt-1">
                          <button
                            onClick={() => handleBrowseCategorySelect(category.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${
                              isCategorySelected
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {categoryProducts.length > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleCategory(category.id)
                                }}
                                className="p-0.5"
                              >
                                {isCategoryExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <div className="w-4 h-4" />
                            )}
                            <Folder className="w-4 h-4" />
                            <span className="flex-1">{category.display_name}</span>
                            <span className="text-xs text-slate-400">
                              {materials?.filter((m: any) => {
                                const productNames = categoryProducts.map((p: any) => p.name).concat(categoryProducts.map((p: any) => p.display_name))
                                return m.product_name && productNames.includes(m.product_name)
                              }).length || 0}
                            </span>
                          </button>

                          {/* Products */}
                          {isCategoryExpanded && categoryProducts.map((product: any) => {
                            const isProductSelected = browseSelectedProductId === product.id

                            return (
                              <button
                                key={product.id}
                                onClick={() => handleBrowseProductSelect(product.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg ml-6 mt-1 flex items-center space-x-2 ${
                                  isProductSelected
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                                <span className="flex-1">{product.display_name}</span>
                                <span className="text-xs text-slate-400">
                                  {materials?.filter((m: any) => 
                                    m.product_name === product.name || m.product_name === product.display_name
                                  ).length || 0}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Bar with Breadcrumbs and Search */}
          <div className="border-b border-slate-200 bg-white p-4">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 mb-4">
              {browseBreadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-sm text-slate-600 font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Filters</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Universe Filter */}
                  <MultiSelect
                    label="Universe"
                    options={UNIVERSES.filter(u => u.id !== 'all').map(u => ({
                      value: u.id,
                      label: u.name
                    }))}
                    selectedValues={selectedUniverses}
                    onChange={(values) => setSelectedUniverses(values as string[])}
                    placeholder="All Universes"
                  />

                  {/* Category Filter */}
                  <MultiSelect
                    label="Category"
                    options={categories.map((cat: any) => ({
                      value: cat.id,
                      label: cat.display_name
                    }))}
                    selectedValues={filterCategoryIds}
                    onChange={(values) => {
                      setFilterCategoryIds(values as number[])
                      // Clear product filter when category changes
                      setFilterProductIds([])
                    }}
                    placeholder="All Categories"
                    disabled={selectedUniverses.length === 0}
                  />

                  {/* Product Filter */}
                  <MultiSelect
                    label="Product"
                    options={products.map((prod: any) => ({
                      value: prod.id,
                      label: prod.display_name
                    }))}
                    selectedValues={filterProductIds}
                    onChange={(values) => setFilterProductIds(values as number[])}
                    placeholder="All Products"
                    disabled={selectedUniverses.length === 0}
                  />

                  {/* Material Type Filter */}
                  <MultiSelect
                    label="Type"
                    options={[
                      { value: 'product_brief', label: 'Product Brief' },
                      { value: 'sales_enablement_deck', label: 'Sales Enablement Deck' },
                      { value: 'product_portfolio', label: 'Product Portfolio' },
                      { value: 'sales_deck', label: 'Sales Deck' },
                      { value: 'datasheet', label: 'Datasheet' },
                      { value: 'product_catalog', label: 'Product Catalog' },
                    ]}
                    selectedValues={filterTypes}
                    onChange={(values) => setFilterTypes(values as string[])}
                    placeholder="All Types"
                  />

                  {/* Status Filter */}
                  <MultiSelect
                    label="Status"
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'review', label: 'Review' },
                      { value: 'published', label: 'Published' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                    selectedValues={filterStatuses}
                    onChange={(values) => setFilterStatuses(values as string[])}
                    placeholder="All Statuses"
                  />
                </div>

                {/* Clear Filters */}
                {(searchQuery || filterTypes.length > 0 || filterStatuses.length > 0 || filterCategoryIds.length > 0 || filterProductIds.length > 0 || selectedUniverses.length > 0) && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-500 mr-2">
                      {[
                        searchQuery && 'search active',
                        selectedUniverses.length > 0 && `${selectedUniverses.length} universe${selectedUniverses.length !== 1 ? 's' : ''}`,
                        filterCategoryIds.length > 0 && `${filterCategoryIds.length} categor${filterCategoryIds.length !== 1 ? 'ies' : 'y'}`,
                        filterProductIds.length > 0 && `${filterProductIds.length} product${filterProductIds.length !== 1 ? 's' : ''}`,
                        filterTypes.length > 0 && `${filterTypes.length} type${filterTypes.length !== 1 ? 's' : ''}`,
                        filterStatuses.length > 0 && `${filterStatuses.length} status${filterStatuses.length !== 1 ? 'es' : ''}`,
                      ].filter(Boolean).join(' • ')}
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setFilterTypes([])
                        setFilterStatuses([])
                        setFilterCategoryIds([])
                        setFilterProductIds([])
                        setSelectedUniverses([])
                      }}
                      className="text-sm text-primary-500 hover:text-primary-600 flex items-center space-x-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear all filters</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Materials Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {browseFilteredMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No materials found</h3>
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'Select a universe, category, or product to view materials'}
                </p>
              </div>
            ) : (
              <>
                {/* Show grouped by universe if no specific selection */}
                {!browseSelectedUniverseId && !browseSelectedCategoryId && !browseSelectedProductId && !searchQuery ? (
                  sortedBrowseMaterialsByUniverse.map(([universeName, universeMaterials]) => (
                    <div key={universeName} className="mb-8">
                      <h2 className="text-xl font-semibold text-slate-900 mb-4">{universeName}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {universeMaterials.map((material: any) => (
                          <BrowseMaterialCard 
                            key={material.id} 
                            material={material}
                            onDownload={handleDownload}
                            onShare={(material) => {
                              setSharingMaterial(material)
                              setIsShareModalOpen(true)
                            }}
                            onEdit={canEditDelete ? (material) => setEditingMaterial(material) : undefined}
                            onDelete={canEditDelete ? (id) => handleDelete(id) : undefined}
                            onPreview={(material) => setPreviewMaterial(material)}
                            canEditDelete={canEditDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {browseFilteredMaterials.map((material: any) => (
                      <BrowseMaterialCard 
                        key={material.id} 
                        material={material}
                        onDownload={handleDownload}
                        onShare={(material) => {
                          setSharingMaterial(material)
                          setIsShareModalOpen(true)
                        }}
                        onEdit={canEditDelete ? (material) => setEditingMaterial(material) : undefined}
                        onDelete={canEditDelete ? (id) => handleDelete(id) : undefined}
                        onPreview={(material) => setPreviewMaterial(material)}
                        canEditDelete={canEditDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>

        {/* Modals */}
        <Modal
          isOpen={!!editingMaterial}
          onClose={() => setEditingMaterial(null)}
          title="Edit Material"
          size="lg"
        >
          <MaterialForm material={editingMaterial} onClose={() => setEditingMaterial(null)} />
        </Modal>

        <FileUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />

        {(isDirector || isPMM) && (
          <BatchUploadModal
            isOpen={isBatchUploadModalOpen}
            onClose={() => setIsBatchUploadModalOpen(false)}
          />
        )}

        {sharingMaterial && (
          <ShareLinkModal
            materialId={sharingMaterial.id}
            materialName={sharingMaterial.name}
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false)
              setSharingMaterial(null)
            }}
          />
        )}

        {/* Preview Modal */}
        {previewMaterial && (
          <MaterialPreviewModal
            material={previewMaterial}
            isOpen={!!previewMaterial}
            onClose={() => setPreviewMaterial(null)}
            onDownload={handleDownload}
            onShare={(material) => {
              setSharingMaterial(material)
              setIsShareModalOpen(true)
              setPreviewMaterial(null)
            }}
            onEdit={(material) => {
              setEditingMaterial(material)
              setPreviewMaterial(null)
            }}
            onDelete={(id) => {
              if (window.confirm('Are you sure you want to delete this material?')) {
                handleDelete(id)
                setPreviewMaterial(null)
              }
            }}
            canEditDelete={canEditDelete}
          />
        )}

        {/* Download Progress Modal */}
        {downloadingMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Downloading Material</h3>
              <p className="text-sm text-slate-600 mb-4 truncate">{downloadingMaterial.name || downloadingMaterial.file_name}</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">{downloadProgress.toFixed(0)}%</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render list view (default)
  return (
    <div className="space-y-6">
      {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-primary-700">Materials</h1>
              <p className="mt-1 text-slate-500">
                {selectedUniverses.length === 0
                  ? 'Manage your products & solutions enablement materials'
                  : selectedUniverses.length === 1
                    ? `Materials in ${UNIVERSES.find(u => u.id === selectedUniverses[0])?.name}`
                    : `Materials in ${selectedUniverses.length} universes`
                }
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              {/* View Toggle */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setViewMode('list' as 'list' | 'browse')}
                  className="px-4 py-2.5 text-sm font-medium transition-all bg-primary-500 text-white flex items-center space-x-2"
                  title="List View"
                >
                  <List className="w-5 h-5" />
                  <span>List</span>
                </button>
                <button
                  onClick={() => setViewMode('browse' as 'list' | 'browse')}
                  className="px-4 py-2.5 text-sm font-medium transition-all border-l border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center space-x-2"
                  title="Browse View"
                >
                  <Grid className="w-5 h-5" />
                  <span>Browse</span>
                </button>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-ovh-secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Material
              </button>
              {(isDirector || isPMM) && (
                <button
                  onClick={() => setIsBatchUploadModalOpen(true)}
                  className="btn-ovh-primary flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Batch Upload with AI
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Universe Overview Cards - Always visible, clickable to filter */}
          {Object.keys(allMaterialsByUniverse).length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-600 mb-3">Product Universes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {UNIVERSES.filter(u => u.id !== 'all').map((universe) => {
                  // Always use total count from all materials, not filtered
                  const universeMaterials = allMaterialsByUniverse[universe.id] || []
                  const count = universeMaterials.length
                  const publishedCount = universeMaterials.filter((m: any) => m.status === 'published').length
                  const isSelected = selectedUniverses.includes(universe.id)
                  
                  return (
                    <button
                      key={universe.id}
                      onClick={() => {
                        setSelectedUniverses(prev => 
                          prev.includes(universe.id)
                            ? prev.filter(id => id !== universe.id) // Remove if already selected
                            : [...prev, universe.id] // Add if not selected
                        )
                      }}
                      className={`card-ovh p-4 text-left hover:shadow-md transition-all border-2 ${
                        isSelected 
                          ? `${universe.borderColor} border-primary-500 bg-primary-50 ring-2 ring-primary-200` 
                          : `${universe.borderColor} hover:border-primary-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`${universe.bgColor} p-2 rounded-lg`}>
                          <universe.icon className={`h-6 w-6 ${universe.color}`} />
                        </div>
                        <div className="flex items-center space-x-2">
                          {isSelected && (
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-sm">
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                          )}
                          <span className={`text-2xl font-bold ${universe.color}`}>{count}</span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">{universe.name}</h3>
                      <p className="text-xs text-slate-500">
                        {publishedCount} published • {count - publishedCount} in progress
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card-ovh p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Filters</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Universe Filter */}
                <MultiSelect
                  label="Universe"
                  options={UNIVERSES.filter(u => u.id !== 'all').map(u => ({
                    value: u.id,
                    label: u.name
                  }))}
                  selectedValues={selectedUniverses}
                  onChange={(values) => setSelectedUniverses(values as string[])}
                  placeholder="All Universes"
                />

                {/* Category Filter */}
                <MultiSelect
                  label="Category"
                  options={categories.map((cat: any) => ({
                    value: cat.id,
                    label: cat.display_name
                  }))}
                  selectedValues={filterCategoryIds}
                  onChange={(values) => {
                    setFilterCategoryIds(values as number[])
                    // Clear product filter when category changes
                    setFilterProductIds([])
                  }}
                  placeholder="All Categories"
                  disabled={selectedUniverses.length === 0}
                />

                {/* Product Filter */}
                <MultiSelect
                  label="Product"
                  options={products.map((prod: any) => ({
                    value: prod.id,
                    label: prod.display_name
                  }))}
                  selectedValues={filterProductIds}
                  onChange={(values) => setFilterProductIds(values as number[])}
                  placeholder="All Products"
                  disabled={selectedUniverses.length === 0}
                />

                {/* Material Type Filter */}
                <MultiSelect
                  label="Type"
                  options={[
                    { value: 'product_brief', label: 'Product Brief' },
                    { value: 'sales_enablement_deck', label: 'Sales Enablement Deck' },
                    { value: 'product_portfolio', label: 'Product Portfolio' },
                    { value: 'sales_deck', label: 'Sales Deck' },
                    { value: 'datasheet', label: 'Datasheet' },
                    { value: 'product_catalog', label: 'Product Catalog' },
                  ]}
                  selectedValues={filterTypes}
                  onChange={(values) => setFilterTypes(values as string[])}
                  placeholder="All Types"
                />

                {/* Status Filter */}
                <MultiSelect
                  label="Status"
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'review', label: 'Review' },
                    { value: 'published', label: 'Published' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                  selectedValues={filterStatuses}
                  onChange={(values) => setFilterStatuses(values as string[])}
                  placeholder="All Statuses"
                />
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterTypes.length > 0 || filterStatuses.length > 0 || filterCategoryIds.length > 0 || filterProductIds.length > 0 || selectedUniverses.length > 0) && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mr-2">
                    {[
                      searchQuery && 'search active',
                      selectedUniverses.length > 0 && `${selectedUniverses.length} universe${selectedUniverses.length !== 1 ? 's' : ''}`,
                      filterCategoryIds.length > 0 && `${filterCategoryIds.length} categor${filterCategoryIds.length !== 1 ? 'ies' : 'y'}`,
                      filterProductIds.length > 0 && `${filterProductIds.length} product${filterProductIds.length !== 1 ? 's' : ''}`,
                      filterTypes.length > 0 && `${filterTypes.length} type${filterTypes.length !== 1 ? 's' : ''}`,
                      filterStatuses.length > 0 && `${filterStatuses.length} status${filterStatuses.length !== 1 ? 'es' : ''}`,
                    ].filter(Boolean).join(' • ')}
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterTypes([])
                      setFilterStatuses([])
                      setFilterCategoryIds([])
                      setFilterProductIds([])
                      setSelectedUniverses([])
                    }}
                    className="text-sm text-primary-500 hover:text-primary-600 flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear all filters</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Materials List */}
          {filteredMaterials.length > 0 ? (
            <>
              {selectedUniverses.length === 0 ? (
                // Grouped by Universe View - show all when no filters
                <div className="space-y-6">
                  {Object.entries(materialsByUniverse)
                    .sort(([a], [b]) => {
                      // Sort universes: known universes first, then alphabetically
                      const aIndex = UNIVERSES.findIndex(u => u.id === a)
                      const bIndex = UNIVERSES.findIndex(u => u.id === b)
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                      if (aIndex !== -1) return -1
                      if (bIndex !== -1) return 1
                      return a.localeCompare(b)
                    })
                    .map(([universeName, universeMaterials]) => {
                      const materials = universeMaterials as any[]
                      const universeInfo = getUniverseInfo(universeName)
                      const UniverseIcon = universeInfo.icon
                      // Check ALL materials for this universe (not filtered) to see if there are archived ones
                      const allUniverseMaterials = allMaterialsByUniverse[universeName] || []
                      const hasArchived = allUniverseMaterials.some((m: any) => m.status === 'archived')
                      const showArchived = showArchivedByUniverse[universeName] || false
                      
                      return (
                        <div key={universeName} className="card-ovh overflow-hidden">
                          {/* Universe Header */}
                          <div className={`${universeInfo.bgColor} px-6 py-4 border-b-2 ${universeInfo.borderColor}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <UniverseIcon className={`h-6 w-6 ${universeInfo.color}`} />
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">{universeInfo.name}</h3>
                                  <p className="text-sm text-slate-600">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              {/* Toggle to show/hide archived materials */}
                              {hasArchived && (
                                <button
                                  onClick={() => {
                                    setShowArchivedByUniverse(prev => ({
                                      ...prev,
                                      [universeName]: !showArchived
                                    }))
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
                                  title={showArchived ? 'Hide archived materials' : 'Show archived materials'}
                                >
                                  {showArchived ? (
                                    <>
                                      <EyeOff className="h-4 w-4" />
                                      <span>Hide Archived</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4" />
                                      <span>Show Archived</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Materials in this Universe */}
                          <div className="divide-y divide-slate-100">
                            {materials.slice(0, 5).map((material: any) => (
                              <div key={material.id} className="p-4 hover:bg-slate-50 transition-colors">
                                {renderMaterialRow(material)}
                              </div>
                            ))}
                            {materials.length > 5 && (
                              <div className="p-4 text-center">
                                <button
                                  onClick={() => setSelectedUniverses([universeName])}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  View {materials.length - 5} more materials →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                // Filtered View - show materials from selected universes
                <div className="card-ovh overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {filteredMaterials.map((material: any) => (
                      <div key={material.id} className="p-4 hover:bg-slate-50 transition-colors">
                        {renderMaterialRow(material)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-ovh p-12 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No materials found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {selectedUniverses.length > 0
                  ? `No materials found in selected universes` 
                  : 'Get started by uploading your first material'}
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-ovh-primary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Material
                </button>
              </div>
            </div>
          )}

        {/* Modals */}
        <Modal
          isOpen={!!editingMaterial}
          onClose={() => setEditingMaterial(null)}
          title="Edit Material"
          size="lg"
        >
          <MaterialForm material={editingMaterial} onClose={() => setEditingMaterial(null)} />
        </Modal>

        <FileUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />

        {(isDirector || isPMM) && (
          <BatchUploadModal
            isOpen={isBatchUploadModalOpen}
            onClose={() => setIsBatchUploadModalOpen(false)}
          />
        )}

        {sharingMaterial && (
          <ShareLinkModal
            materialId={sharingMaterial.id}
            materialName={sharingMaterial.name}
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false)
              setSharingMaterial(null)
            }}
          />
        )}

        {/* Preview Modal */}
        {previewMaterial && (
          <MaterialPreviewModal
            material={previewMaterial}
            isOpen={!!previewMaterial}
            onClose={() => setPreviewMaterial(null)}
            onDownload={handleDownload}
            onShare={(material) => {
              setSharingMaterial(material)
              setIsShareModalOpen(true)
              setPreviewMaterial(null)
            }}
            onEdit={(material) => {
              setEditingMaterial(material)
              setPreviewMaterial(null)
            }}
            onDelete={(id) => {
              if (window.confirm('Are you sure you want to delete this material?')) {
                handleDelete(id)
                setPreviewMaterial(null)
              }
            }}
            canEditDelete={canEditDelete}
          />
        )}

        {/* Download Progress Modal */}
        {downloadingMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Downloading Material</h3>
              <p className="text-sm text-slate-600 mb-4 truncate">{downloadingMaterial.name || downloadingMaterial.file_name}</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">{downloadProgress.toFixed(0)}%</p>
            </div>
          </div>
        )}
      </div>
    )
  }
