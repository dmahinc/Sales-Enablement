import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { FileText, Upload, Plus, Edit, Trash2, Download, Filter, Cloud, Server, HardDrive, Users, FolderOpen } from 'lucide-react'
import Modal from '../components/Modal'
import MaterialForm from '../components/MaterialForm'
import FileUploadModal from '../components/FileUploadModal'

const UNIVERSES = [
  { id: 'all', name: 'All Materials', icon: FolderOpen, color: 'text-slate-500' },
  { id: 'Public Cloud', name: 'Public Cloud', icon: Cloud, color: 'text-primary-500' },
  { id: 'Private Cloud', name: 'Private Cloud', icon: Server, color: 'text-violet-500' },
  { id: 'Bare Metal', name: 'Bare Metal', icon: HardDrive, color: 'text-amber-500' },
  { id: 'Hosting & Collaboration', name: 'Hosting & Collaboration', icon: Users, color: 'text-emerald-500' },
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
    if (selectedUniverse !== 'all') {
      if (!m.universe_name || m.universe_name !== selectedUniverse) return false
    }
    if (filterType && m.material_type !== filterType) return false
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading materials...</span>
      </div>
    )
  }

  return (
    <div className="flex -mx-4 sm:-mx-6 lg:-mx-8 -my-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 sidebar-ovh flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Product Universes
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
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-500 -ml-1 pl-5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-primary-600'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary-500' : universe.color}`} />
                    <span>{universe.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isActive
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-slate-100 text-slate-500'
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
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-primary-700">Materials</h1>
              <p className="mt-1 text-slate-500">
                {selectedUniverse === 'all' 
                  ? 'Manage your sales enablement materials'
                  : `Materials in ${UNIVERSES.find(u => u.id === selectedUniverse)?.name}`
                }
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-ovh-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Material
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-ovh-secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card-ovh p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Filters:</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-ovh w-auto"
              >
                <option value="">All Types</option>
                <option value="product_brief">Product Brief</option>
                <option value="sales_enablement_deck">Sales Enablement Deck</option>
                <option value="product_portfolio">Product Portfolio</option>
                <option value="sales_deck">Sales Deck</option>
                <option value="datasheet">Datasheet</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-ovh w-auto"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              {(filterType || filterStatus) && (
                <button
                  onClick={() => { setFilterType(''); setFilterStatus(''); }}
                  className="text-sm text-primary-500 hover:text-primary-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Materials List */}
          {filteredMaterials.length > 0 ? (
            <div className="card-ovh overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredMaterials.map((material: any) => (
                  <div key={material.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="bg-primary-50 p-2 rounded-lg mr-4">
                          <FileText className="h-5 w-5 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{material.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            <span className="inline-flex items-center">
                              {material.material_type?.replace(/_/g, ' ')} 
                              <span className="mx-2">•</span> 
                              {material.product_name || 'No Product'} 
                              <span className="mx-2">•</span> 
                              {material.universe_name || 'No Universe'}
                            </span>
                          </p>
                          {material.description && (
                            <p className="mt-1 text-sm text-slate-600 line-clamp-1">{material.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-4">
                        <span className={`badge-ovh ${
                          material.status === 'published' ? 'badge-ovh-success' :
                          material.status === 'review' ? 'badge-ovh-warning' :
                          'badge-ovh-gray'
                        }`}>
                          {material.status}
                        </span>
                        <div className="flex items-center space-x-1">
                          {material.file_path && (
                            <button
                              onClick={() => handleDownload(material)}
                              className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
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
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-ovh p-12 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No materials found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {selectedUniverse !== 'all' 
                  ? `No materials in ${UNIVERSES.find(u => u.id === selectedUniverse)?.name}` 
                  : 'Get started by creating your first material'}
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-ovh-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Material
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Material"
          size="lg"
        >
          <MaterialForm onClose={() => setIsCreateModalOpen(false)} />
        </Modal>

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
      </div>
    </div>
  )
}
