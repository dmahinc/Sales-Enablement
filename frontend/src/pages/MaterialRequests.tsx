import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  User, 
  Calendar,
  AlertCircle,
  FileText,
  X,
  Search,
  Filter
} from 'lucide-react'
import Modal from '../components/Modal'

interface MaterialRequest {
  id: number
  requester_id: number
  requester_name?: string
  requester_email?: string
  material_type: string
  products?: number[]
  product_names?: string[]
  description: string
  priority: string
  target_audience?: string
  use_case?: string
  needed_by_date?: string
  additional_notes?: string
  status: string
  assigned_to_id?: number
  assigned_to_name?: string
  acknowledged_at?: string
  eta_date?: string
  closed_at?: string
  close_reason?: string
  close_reason_details?: string
  existing_material_id?: number
  planned_date?: string
  delivered_at?: string
  delivered_material_id?: number
  delivered_material_name?: string
  created_at: string
  updated_at: string
}

interface User {
  id: number
  email: string
  full_name: string
  role: string
}

export default function MaterialRequests() {
  const { user } = useAuth()
  const isDirector = user?.role === 'director' || user?.is_superuser
  const isPMM = user?.role === 'pmm'
  
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null)
  const [actionModal, setActionModal] = useState<'acknowledge' | 'close' | 'deliver' | null>(null)

  const queryClient = useQueryClient()

  // Fetch material requests
  const { data: requests = [], isLoading } = useQuery<MaterialRequest[]>({
    queryKey: ['material-requests', statusFilter, assignedToMe],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status_filter', statusFilter)
      if (assignedToMe) params.append('assigned_to_me', 'true')
      return api.get(`/material-requests?${params.toString()}`).then(res => res.data)
    },
  })

  // Fetch PMM users for assignment (Director only)
  const { data: pmmUsers = [] } = useQuery<User[]>({
    queryKey: ['users', 'pmms'],
    queryFn: () => api.get('/users/pmms').then(res => res.data),
    enabled: isDirector,
  })

  // Fetch materials for "already exists" and "deliver" actions
  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ['materials', 'all'],
    queryFn: () => api.get('/materials').then(res => res.data),
    enabled: actionModal === 'close' || actionModal === 'deliver',
  })

  // Filter requests by search query
  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      req.material_type.toLowerCase().includes(query) ||
      req.description.toLowerCase().includes(query) ||
      req.requester_name?.toLowerCase().includes(query) ||
      req.requester_email?.toLowerCase().includes(query) ||
      req.product_names?.some(name => name.toLowerCase().includes(query))
    )
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: Package },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badges[priority as keyof typeof badges] || badges.medium}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading material requests...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">Request for Materials</h1>
          <p className="mt-1 text-slate-500">Manage material requests from Sales</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-ovh w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-ovh w-auto"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="delivered">Delivered</option>
            <option value="closed">Closed</option>
          </select>
          {(isDirector || isPMM) && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={assignedToMe}
                onChange={(e) => setAssignedToMe(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Assigned to me</span>
            </label>
          )}
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length > 0 ? (
        <div className="card-ovh overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{request.material_type}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{request.description}</div>
                        {request.product_names && request.product_names.length > 0 && (
                          <div className="text-xs text-slate-400 mt-1">
                            Products: {request.product_names.join(', ')}
                          </div>
                        )}
                        <div className="mt-1">{getPriorityBadge(request.priority)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{request.requester_name}</div>
                      <div className="text-xs text-slate-500">{request.requester_email}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                      {request.eta_date && request.status === 'acknowledged' && (
                        <div className="text-xs text-slate-500 mt-1">
                          ETA: {new Date(request.eta_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.assigned_to_name ? (
                        <div className="text-sm text-slate-900">{request.assigned_to_name}</div>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setActionModal('acknowledge')
                          }}
                          disabled={request.status !== 'pending'}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Acknowledge"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setActionModal('close')
                          }}
                          disabled={request.status === 'delivered'}
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Close"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setActionModal('deliver')
                          }}
                          disabled={request.status === 'delivered' || request.status === 'closed'}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark as Delivered"
                        >
                          <Package className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-ovh p-12 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No material requests found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery || statusFilter || assignedToMe
              ? 'Try adjusting your filters'
              : 'No requests have been submitted yet'}
          </p>
        </div>
      )}

      {/* Action Modals */}
      {actionModal === 'acknowledge' && selectedRequest && (
        <AcknowledgeModal
          request={selectedRequest}
          pmmUsers={pmmUsers}
          isDirector={isDirector}
          onClose={() => {
            setActionModal(null)
            setSelectedRequest(null)
          }}
        />
      )}

      {actionModal === 'close' && selectedRequest && (
        <CloseModal
          request={selectedRequest}
          materials={materials}
          onClose={() => {
            setActionModal(null)
            setSelectedRequest(null)
          }}
        />
      )}

      {actionModal === 'deliver' && selectedRequest && (
        <DeliverModal
          request={selectedRequest}
          materials={materials}
          onClose={() => {
            setActionModal(null)
            setSelectedRequest(null)
          }}
        />
      )}
    </div>
  )
}

// Acknowledge Modal Component
function AcknowledgeModal({
  request,
  pmmUsers,
  isDirector,
  onClose,
}: {
  request: MaterialRequest
  pmmUsers: User[]
  isDirector: boolean
  onClose: () => void
}) {
  const [assignedToId, setAssignedToId] = useState<number | null>(null)
  const [etaDate, setEtaDate] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const acknowledgeMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/material-requests/${request.id}/acknowledge`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to acknowledge request'
      setErrors({ submit: errorMessage })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!etaDate) {
      setErrors({ eta_date: 'ETA date is required' })
      return
    }

    acknowledgeMutation.mutate({
      assigned_to_id: assignedToId || undefined,
      eta_date: new Date(etaDate).toISOString(),
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Acknowledge Request" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isDirector && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign To
            </label>
            <select
              value={assignedToId || ''}
              onChange={(e) => setAssignedToId(e.target.value ? parseInt(e.target.value) : null)}
              className="input-ovh w-full"
            >
              <option value="">Assign to me</option>
              {pmmUsers.map((pmm) => (
                <option key={pmm.id} value={pmm.id}>
                  {pmm.full_name} ({pmm.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Expected Delivery Date (ETA) *
          </label>
          <input
            type="date"
            value={etaDate}
            onChange={(e) => setEtaDate(e.target.value)}
            className={`input-ovh w-full ${errors.eta_date ? 'border-red-500' : ''}`}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          {errors.eta_date && (
            <p className="mt-1 text-sm text-red-500">{errors.eta_date}</p>
          )}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="btn-ovh-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={acknowledgeMutation.isPending}
            className="btn-ovh-primary disabled:opacity-50"
          >
            {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Close Modal Component
function CloseModal({
  request,
  materials,
  onClose,
}: {
  request: MaterialRequest
  materials: any[]
  onClose: () => void
}) {
  const [closeReason, setCloseReason] = useState<string>('')
  const [closeReasonDetails, setCloseReasonDetails] = useState<string>('')
  const [existingMaterialId, setExistingMaterialId] = useState<number | null>(null)
  const [plannedDate, setPlannedDate] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const closeMutation = useMutation({
    mutationFn: (data: any) => api.post(`/material-requests/${request.id}/close`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to close request'
      setErrors({ submit: errorMessage })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!closeReason) {
      setErrors({ close_reason: 'Close reason is required' })
      return
    }

    if (closeReason === 'already_exists' && !existingMaterialId) {
      setErrors({ existing_material_id: 'Please select an existing material' })
      return
    }

    if (closeReason === 'planned_later' && !plannedDate) {
      setErrors({ planned_date: 'Planned date is required' })
      return
    }

    const data: any = {
      close_reason: closeReason,
      close_reason_details: closeReasonDetails || undefined,
    }

    if (closeReason === 'already_exists') {
      data.existing_material_id = existingMaterialId
    }

    if (closeReason === 'planned_later') {
      data.planned_date = new Date(plannedDate).toISOString()
    }

    closeMutation.mutate(data)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Close Request" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Close Reason *
          </label>
          <select
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
            className={`input-ovh w-full ${errors.close_reason ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select reason</option>
            <option value="already_exists">Already Exists</option>
            <option value="planned_later">Planned Later</option>
            <option value="not_planned">Not Planned</option>
          </select>
          {errors.close_reason && (
            <p className="mt-1 text-sm text-red-500">{errors.close_reason}</p>
          )}
        </div>

        {closeReason === 'already_exists' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Existing Material *
            </label>
            <select
              value={existingMaterialId || ''}
              onChange={(e) => setExistingMaterialId(e.target.value ? parseInt(e.target.value) : null)}
              className={`input-ovh w-full ${errors.existing_material_id ? 'border-red-500' : ''}`}
            >
              <option value="">Select material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.material_type})
                </option>
              ))}
            </select>
            {errors.existing_material_id && (
              <p className="mt-1 text-sm text-red-500">{errors.existing_material_id}</p>
            )}
          </div>
        )}

        {closeReason === 'planned_later' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Planned Date *
            </label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className={`input-ovh w-full ${errors.planned_date ? 'border-red-500' : ''}`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.planned_date && (
              <p className="mt-1 text-sm text-red-500">{errors.planned_date}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Details
          </label>
          <textarea
            value={closeReasonDetails}
            onChange={(e) => setCloseReasonDetails(e.target.value)}
            rows={3}
            className="input-ovh w-full"
            placeholder="Provide additional explanation..."
          />
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="btn-ovh-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={closeMutation.isPending}
            className="btn-ovh-primary disabled:opacity-50"
          >
            {closeMutation.isPending ? 'Closing...' : 'Close Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Deliver Modal Component
function DeliverModal({
  request,
  materials,
  onClose,
}: {
  request: MaterialRequest
  materials: any[]
  onClose: () => void
}) {
  const [deliveredMaterialId, setDeliveredMaterialId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const deliverMutation = useMutation({
    mutationFn: (data: any) => api.post(`/material-requests/${request.id}/deliver`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to mark as delivered'
      setErrors({ submit: errorMessage })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!deliveredMaterialId) {
      setErrors({ delivered_material_id: 'Please select a material' })
      return
    }

    deliverMutation.mutate({
      delivered_material_id: deliveredMaterialId,
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Mark as Delivered" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Delivered Material *
          </label>
          <select
            value={deliveredMaterialId || ''}
            onChange={(e) => setDeliveredMaterialId(e.target.value ? parseInt(e.target.value) : null)}
            className={`input-ovh w-full ${errors.delivered_material_id ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select material</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} ({material.material_type})
              </option>
            ))}
          </select>
          {errors.delivered_material_id && (
            <p className="mt-1 text-sm text-red-500">{errors.delivered_material_id}</p>
          )}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="btn-ovh-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={deliverMutation.isPending}
            className="btn-ovh-primary disabled:opacity-50"
          >
            {deliverMutation.isPending ? 'Marking...' : 'Mark as Delivered'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
