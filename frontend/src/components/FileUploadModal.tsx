import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Upload, X, FileText, CheckCircle } from 'lucide-react'

const UNIVERSES = [
  { id: 'Public Cloud', name: 'Public Cloud' },
  { id: 'Private Cloud', name: 'Private Cloud' },
  { id: 'Bare Metal', name: 'Bare Metal' },
  { id: 'Hosting & Collaboration', name: 'Hosting & Collaboration' },
]

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FileUploadModal({ isOpen, onClose }: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    material_type: 'product_brief',
    audience: 'internal',
    product_name: '',
    universe_name: 'Public Cloud',
  })
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const response = await api.post('/materials/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      handleClose()
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload file'
      alert(`Upload failed: ${errorMessage}`)
      setUploading(false)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      alert('Please select a file')
      return
    }

    setUploading(true)
    
    const formDataToSend = new FormData()
    formDataToSend.append('file', file)
    formDataToSend.append('material_type', formData.material_type)
    formDataToSend.append('audience', formData.audience)
    formDataToSend.append('universe_name', formData.universe_name)
    if (formData.product_name) {
      formDataToSend.append('product_name', formData.product_name)
    }

    uploadMutation.mutate(formDataToSend)
  }

  const handleClose = () => {
    setFile(null)
    setFormData({
      material_type: 'product_brief',
      audience: 'internal',
      product_name: '',
      universe_name: 'Public Cloud',
    })
    setUploading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-primary-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-primary-700">Upload Material</h3>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* File Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : file 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm text-primary-500 hover:text-primary-600"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-full">
                    <Upload className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary-500 font-medium hover:text-primary-600">
                        Click to upload
                      </span>
                      <span className="text-slate-500"> or drag and drop</span>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.pptx,.docx,.ppt,.doc"
                    />
                  </div>
                  <p className="text-xs text-slate-400">PDF, PPTX, DOCX up to 50MB</p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material Type *
                </label>
                <select
                  required
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                  className="input-ovh"
                >
                  <option value="product_brief">Product Brief</option>
                  <option value="sales_enablement_deck">Sales Enablement Deck</option>
                  <option value="product_portfolio">Product Portfolio</option>
                  <option value="sales_deck">Sales Deck</option>
                  <option value="datasheet">Datasheet</option>
                  <option value="product_catalog">Product Catalog</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Audience *
                </label>
                <select
                  required
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className="input-ovh"
                >
                  <option value="internal">Internal</option>
                  <option value="customer_facing">Customer Facing</option>
                  <option value="shared_asset">Shared Asset</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Universe *
                </label>
                <select
                  required
                  value={formData.universe_name}
                  onChange={(e) => setFormData({ ...formData, universe_name: e.target.value })}
                  className="input-ovh"
                >
                  {UNIVERSES.map((universe) => (
                    <option key={universe.id} value={universe.id}>
                      {universe.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="input-ovh"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                className="btn-ovh-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="btn-ovh-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
