import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { UserCircle, Plus, Edit, Trash2, Mail, User, Search, X } from 'lucide-react'

interface Customer {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at?: string
  assigned_sales_id?: number
  created_by_id?: number
  assigned_sales_name?: string
  created_by_name?: string
  company_name?: string
}

export default function MyCustomers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const queryClient = useQueryClient()

  const { data: customers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ['sales-customers'],
    queryFn: () => api.get('/sales/customers').then(res => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (customerId: number) => api.delete(`/sales/customers/${customerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-customers'] })
    },
  })

  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      customer.full_name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.company_name && customer.company_name.toLowerCase().includes(query))
    )
  })

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.full_name}?`)) {
      return
    }
    deleteMutation.mutate(customer.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading customers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading customers. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-400">My Customers</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Manage customers assigned to you or created by you
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="mt-4 sm:mt-0 btn-ovh-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="card-ovh p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-ovh pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="card-ovh p-12 text-center">
          <UserCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            {customers.length === 0 
              ? 'No customers yet' 
              : 'No customers match your search'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {customers.length === 0
              ? 'Start by adding your first customer.'
              : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className="card-ovh overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {customer.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4 mr-2" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {customer.company_name || <span className="text-slate-400 dark:text-slate-500 italic">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        customer.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {customer.created_at 
                        ? new Date(customer.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
                          title="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingCustomer) && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingCustomer(null)
          }}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            setEditingCustomer(null)
            queryClient.invalidateQueries({ queryKey: ['sales-customers'] })
          }}
        />
      )}
    </div>
  )
}

interface CustomerModalProps {
  customer: Customer | null
  onClose: () => void
  onSuccess: () => void
}

function CustomerModal({ customer, onClose, onSuccess }: CustomerModalProps) {
  // Split full_name into first_name and last_name for editing
  const splitName = (fullName: string) => {
    if (!fullName) return { first: '', last: '' }
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) return { first: parts[0], last: '' }
    const last = parts.pop() || ''
    const first = parts.join(' ')
    return { first, last }
  }

  const nameParts = customer?.full_name ? splitName(customer.full_name) : { first: '', last: '' }

  const [formData, setFormData] = useState({
    email: customer?.email || '',
    first_name: nameParts.first,
    last_name: nameParts.last,
    password: '',
    company_name: customer?.company_name || '',
    is_active: customer?.is_active ?? true,
    send_welcome_email: false,
  })
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/sales/customers', data),
    onSuccess: (response) => {
      setDuplicateEmailError(null)
      
      // Show password if email was not sent
      if (response.data.password) {
        alert(`Customer created successfully!\n\nEmail: ${response.data.email}\nPassword: ${response.data.password}\n\nPlease share these credentials with the customer manually.`)
      } else if (response.data.email_sent) {
        alert('Customer created successfully! Welcome email has been sent.')
      }
      
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.status === 400 && error.response?.data?.detail === "Email already registered") {
        setDuplicateEmailError(error.response.data.detail)
      } else {
        const errorMessage = error.response?.data?.detail || 'Failed to create customer'
        alert(`Error: ${errorMessage}`)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/sales/customers/${customer!.id}`, data),
    onSuccess: () => {
      onSuccess()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (customer) {
      // For updates, combine first_name and last_name into full_name
      const submitData: any = {
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        is_active: formData.is_active,
      }
      if (formData.password) {
        submitData.password = formData.password
      }
      updateMutation.mutate(submitData)
    } else {
      // For creation, send first_name, last_name, password, company_name
      if (!formData.password) {
        alert('Password is required for new customers')
        return
      }
      const submitData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        company_name: formData.company_name || undefined,
        is_active: formData.is_active,
        send_welcome_email: formData.send_welcome_email,
      }
      createMutation.mutate(submitData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="input-ovh w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="input-ovh w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-ovh w-full"
                disabled={!!customer}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input-ovh w-full"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password {customer ? '(leave empty to keep current)' : '*'}
              </label>
              <input
                type="password"
                required={!customer}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-ovh w-full"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Active
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    (Uncheck to disable customer login)
                  </span>
                </span>
              </label>
            </div>

            {!customer && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.send_welcome_email}
                    onChange={(e) => setFormData({ ...formData, send_welcome_email: e.target.checked })}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Send customer a welcome email
                  </span>
                </label>
              </div>
            )}

            {duplicateEmailError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Email Already Registered
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>This email address is already registered in the system.</p>
                      <p className="mt-2">You can either:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Change the email address</li>
                        <li>Close this modal and assign the existing customer to yourself</li>
                      </ul>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setDuplicateEmailError(null)}
                        className="text-sm text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium"
                      >
                        Change Email
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium"
                      >
                        Close Modal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-ovh-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-ovh-primary"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : customer
                  ? 'Update'
                  : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
