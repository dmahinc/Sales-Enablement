import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Upload } from 'lucide-react'

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
    universe_name: 'Public Cloud', // Default to first universe
  })
  const [uploading, setUploading] = useState(false)

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
      universe_name: 'Public Cloud', // Reset to default
    })
    setUploading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upload Material File</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.pptx,.docx,.ppt,.doc"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  {file && (
                    <p className="text-xs text-gray-500 mt-2">{file.name}</p>
                  )}
                  <p className="text-xs text-gray-500">PDF, PPTX, DOCX up to 50MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Material Type *</label>
                <select
                  required
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                <label className="block text-sm font-medium text-gray-700">Audience *</label>
                <select
                  required
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="internal">Internal</option>
                  <option value="customer_facing">Customer Facing</option>
                  <option value="shared_asset">Shared Asset</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Universe *</label>
                <select
                  required
                  value={formData.universe_name}
                  onChange={(e) => setFormData({ ...formData, universe_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {UNIVERSES.map((universe) => (
                    <option key={universe.id} value={universe.id}>
                      {universe.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
