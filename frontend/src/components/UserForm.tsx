import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

interface UserFormProps {
  user?: any
  onClose: () => void
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'pmm',
    is_active: true,
    is_superuser: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        password: '', // Don't pre-fill password
        role: user.role || 'pmm',
        is_active: user.is_active !== undefined ? user.is_active : true,
        is_superuser: user.is_superuser || false,
      })
    }
  }, [user])

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create user'
      setErrors({ submit: errorMessage })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const updateData: any = {}
      if (data.email && data.email !== user.email) updateData.email = data.email
      if (data.full_name && data.full_name !== user.full_name) updateData.full_name = data.full_name
      if (data.password) updateData.password = data.password
      if (data.role && data.role !== user.role) updateData.role = data.role
      if (data.is_active !== undefined && data.is_active !== user.is_active) updateData.is_active = data.is_active
      if (data.is_superuser !== undefined && data.is_superuser !== user.is_superuser) updateData.is_superuser = data.is_superuser
      
      return api.put(`/users/${user.id}`, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update user'
      setErrors({ submit: errorMessage })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.full_name) newErrors.full_name = 'Full name is required'
    if (!user && !formData.password) newErrors.password = 'Password is required'
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (user) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={`input-ovh ${errors.email ? 'border-red-500' : ''}`}
          placeholder="user@ovhcloud.com"
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className={`input-ovh ${errors.full_name ? 'border-red-500' : ''}`}
          placeholder="John Doe"
        />
        {errors.full_name && <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Password {!user && '*'}
        </label>
        <input
          type="password"
          required={!user}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className={`input-ovh ${errors.password ? 'border-red-500' : ''}`}
          placeholder={user ? "Leave blank to keep current password" : "Minimum 8 characters"}
        />
        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        {user && <p className="mt-1 text-xs text-slate-500">Leave blank to keep current password</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Role *
        </label>
        <select
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="input-ovh"
        >
          <option value="pmm">PMM (Product Marketing Manager)</option>
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="mr-2 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
          />
          <label className="text-sm text-slate-700">Active (user can login)</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_superuser}
            onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })}
            className="mr-2 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
          />
          <label className="text-sm text-slate-700">Superuser (full admin privileges)</label>
        </div>
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
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-ovh-primary disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : user
            ? 'Update'
            : 'Create'}
        </button>
      </div>
    </form>
  )
}
