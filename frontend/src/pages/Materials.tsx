import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { FileText, Upload, Plus, Edit, Trash2, Download, Filter, Cloud, Server, HardDrive, Users } from 'lucide-react'
import Modal from '../components/Modal'
import MaterialForm from '../components/MaterialForm'
import FileUploadModal from '../components/FileUploadModal'

const UNIVERSES = [
  { id: 'all', name: 'All Materials', icon: FileText },
  { id: 'Public Cloud', name: 'Public Cloud', icon: Cloud },
  { id: 'Private Cloud', name: 'Private Cloud', icon: Server },
  { id: 'Bare Metal', name: 'Bare Metal', icon: HardDrive },
  { id: 'Hosting & Collaboration', name: 'Hosting & Collaboration', icon: Users },
]

export default function Materials() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [selectedUniverse, setSelectedUniverse] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(res => res.data),
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
  })

  const filteredMaterials = materials?.filter((m: any) => {
    // Filter by universe
    if (selectedUniverse !== 'all') {
      if (!m.universe_name || m.universe_name !== selectedUniverse) return false
    }
    // Filter by type
    if (filterType && m.material_type !== filterType) return false
    // Filter by status
    if (filterStatus && m.status !== filterStatus) return false
    return true
  }) || []

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleDownload = async (material: any) => {
    try {
      const response = await api.get(`/materials/${material.id}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', material.file_name || `${material.name}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Failed to download file')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading materials...</div>
  }

  return (
    <div className="flex -mx-6 sm:-mx-6 lg:-mx-8 -my-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Universes
          </h2>
          <nav className="space-y-1">
            {UNIVERSES.map((universe) => {
              const Icon = universe.icon
              const isActive = selectedUniverse === universe.id
              const count = universe.id === 'all' 
                ? materials?.length || 0
                : materials?.filter((m: any) => m.universe_name === universe.id).length || 0
              
              return (
                <button
                  key={universe.id}
                  onClick={() => setSelectedUniverse(universe.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span>{universe.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
              <p className="mt-2 text-sm text-gray-700">
                {selectedUniverse === 'all' 
                  ? 'Manage your sales enablement materials'
                  : `Materials in ${UNIVERSES.find(u => u.id === selectedUniverse)?.name}`
                }
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Material
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="product_brief">Product Brief</option>
                <option value="sales_enablement_deck">Sales Enablement Deck</option>
                <option value="product_portfolio">Product Portfolio</option>
                <option value="sales_deck">Sales Deck</option>
                <option value="datasheet">Datasheet</option>
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="mt-8">
        {filteredMaterials.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredMaterials.map((material: any) => (
                <li key={material.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{material.name}</p>
                          <p className="text-sm text-gray-500">
                            {material.material_type} • {material.product_name || 'N/A'} • {material.universe_name || 'N/A'}
                          </p>
                          {material.description && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{material.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          material.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : material.status === 'review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {material.status}
                        </span>
                        <div className="flex items-center space-x-2">
                          {material.file_path && (
                            <button
                              onClick={() => handleDownload(material)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingMaterial(material)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No materials</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a material.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Material
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Material"
        size="lg"
      >
        <MaterialForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingMaterial}
        onClose={() => setEditingMaterial(null)}
        title="Edit Material"
        size="lg"
      >
        <MaterialForm material={editingMaterial} onClose={() => setEditingMaterial(null)} />
      </Modal>

          {/* File Upload Modal */}
          <FileUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
