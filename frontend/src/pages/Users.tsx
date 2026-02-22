import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Users as UsersIcon, Plus, Edit, Trash2, Shield, UserCheck, UserX } from 'lucide-react'
import Modal from '../components/Modal'
import UserForm from '../components/UserForm'

export default function Users() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [roleFilter, setRoleFilter] = useState<string>('')

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => {
      const params = roleFilter ? `?role_filter=${roleFilter}` : ''
      return api.get(`/users${params}`).then(res => res.data)
    },
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete user'
      alert(`Delete failed: ${errorMessage}`)
    },
  })

  const handleDelete = (id: number, email: string) => {
    if (window.confirm(`Are you sure you want to delete user "${email}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Loading users...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-ovh p-6 text-center">
        <p className="text-red-500">
          {error instanceof Error ? error.message : 'Failed to load users. Admin access required.'}
        </p>
      </div>
    )
  }

  const filteredUsers = users || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-700">User Management</h1>
          <p className="mt-1 text-slate-500">Manage platform users and permissions</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-ovh-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="card-ovh p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-ovh w-auto"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="pmm">PMM</option>
            <option value="sales">Sales</option>
          </select>
          {roleFilter && (
            <button
              onClick={() => setRoleFilter('')}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="card-ovh overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary-600 font-medium text-sm">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{user.full_name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge-ovh ${
                        user.role === 'admin' ? 'badge-ovh-warning' :
                        user.role === 'pmm' ? 'badge-ovh-success' :
                        'badge-ovh-gray'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="inline-flex items-center text-sm text-emerald-600">
                          <UserCheck className="w-4 h-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-sm text-red-600">
                          <UserX className="w-4 h-4 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_superuser && (
                        <span className="inline-flex items-center text-sm text-amber-600">
                          <Shield className="w-4 h-4 mr-1" />
                          Superuser
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-slate-600 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
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
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No users found</h3>
          <p className="mt-2 text-sm text-slate-500">
            Get started by creating your first user
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 btn-ovh-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create User"
        size="lg"
      >
        <UserForm onClose={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="lg"
      >
        <UserForm user={editingUser} onClose={() => setEditingUser(null)} />
      </Modal>
    </div>
  )
}
