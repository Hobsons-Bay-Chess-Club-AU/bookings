'use client'

import React, { useState } from 'react'
import { UserRole } from '@/lib/types/database'
import {
    HiUsers,
    HiShieldCheck,
    HiWrenchScrewdriver,
    HiCheckCircle,
    HiUser,
    HiMagnifyingGlass,
    HiXMark,
    HiXCircle,
    HiPencilSquare,
    HiKey
} from 'react-icons/hi2'

type User = {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    active: boolean
    created_at: string
    email_confirmed?: boolean
    last_sign_in?: string | null
}

interface AdminUsersPageClientProps {
    users: User[]
}

export default function AdminUsersPageClient({ users }: AdminUsersPageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        role: 'user' as UserRole
    })
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')

    // Filter users based on search and filters
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && user.active) ||
            (statusFilter === 'inactive' && !user.active)

        return matchesSearch && matchesRole && matchesStatus
    })

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'user':
                return <HiUser className="h-4 w-4" />
            case 'organizer':
                return <HiWrenchScrewdriver className="h-4 w-4" />
            case 'admin':
                return <HiShieldCheck className="h-4 w-4" />
            case 'customer_support':
                return <HiUsers className="h-4 w-4" />
            default:
                return <HiUser className="h-4 w-4" />
        }
    }

    const getRoleBadge = (role: UserRole) => {
        const colors = {
            user: 'bg-gray-100 text-gray-800',
            organizer: 'bg-blue-100 text-blue-800',
            admin: 'bg-red-100 text-red-800',
            customer_support: 'bg-purple-100 text-purple-800'
        }

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
                {getRoleIcon(role)}
                <span className="ml-1">{role.replace('_', ' ')}</span>
            </span>
        )
    }

    const getStatusBadge = (active: boolean, emailConfirmed?: boolean) => {
        if (!active) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <HiXCircle className="h-4 w-4 mr-1" />
                    Inactive
                </span>
            )
        }

        if (emailConfirmed === false) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <HiXMark className="h-4 w-4 mr-1" />
                    Unverified
                </span>
            )
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="h-4 w-4 mr-1" />
                Active
            </span>
        )
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setEditForm({
            full_name: user.full_name || '',
            email: user.email,
            role: user.role
        })
        setShowEditModal(true)
        setEditError('')
        setEditSuccess('')
    }

    const handleSaveEdit = async () => {
        if (!editingUser) return

        setEditLoading(true)
        setEditError('')
        setEditSuccess('')

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update_profile',
                    full_name: editForm.full_name,
                    email: editForm.email
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update user')
            }

            // Update role separately if changed
            if (editForm.role !== editingUser.role) {
                const roleResponse = await fetch(`/api/admin/users/${editingUser.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'update_role',
                        role: editForm.role
                    })
                })

                if (!roleResponse.ok) {
                    const roleErrorData = await roleResponse.json()
                    throw new Error(roleErrorData.error || 'Failed to update role')
                }
            }

            setEditSuccess('User updated successfully')
            
            // Update the local users array
            const updatedUsers = users.map(user => 
                user.id === editingUser.id 
                    ? { ...user, full_name: editForm.full_name, email: editForm.email, role: editForm.role }
                    : user
            )
            
            // We need to trigger a re-render, but since users is passed as prop, we'll need to refresh the page
            setTimeout(() => {
                window.location.reload()
            }, 1000)

        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'An unexpected error occurred')
        } finally {
            setEditLoading(false)
        }
    }

    const handleCloseEditModal = () => {
        setShowEditModal(false)
        setEditingUser(null)
        setEditForm({ full_name: '', email: '', role: 'user' })
        setEditError('')
        setEditSuccess('')
    }

    const stats = {
        total: users.length,
        active: users.filter(u => u.active).length,
        inactive: users.filter(u => !u.active).length,
        unverified: users.filter(u => u.email_confirmed === false).length,
        byRole: {
            user: users.filter(u => u.role === 'user').length,
            organizer: users.filter(u => u.role === 'organizer').length,
            admin: users.filter(u => u.role === 'admin').length,
            customer_support: users.filter(u => u.role === 'customer_support').length
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="mt-2 text-gray-600">
                    Manage user accounts, roles, and permissions
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiUsers className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Users
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.total}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiCheckCircle className="h-6 w-6 text-green-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Users
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.active}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiWrenchScrewdriver className="h-6 w-6 text-blue-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Organizers
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.byRole.organizer}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiShieldCheck className="h-6 w-6 text-red-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Admins
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.byRole.admin}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Users
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <HiMagnifyingGlass className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by email or name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Role
                        </label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="organizer">Organizers</option>
                            <option value="customer_support">Customer Support</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Users ({filteredUsers.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Sign In
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.full_name || 'No name'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {user.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user.active, user.email_confirmed)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.last_sign_in
                                            ? new Date(user.last_sign_in).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => handleEditUser(user)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            title="Edit user"
                                        >
                                            <HiPencilSquare className="h-4 w-4" />
                                        </button>
                                        <button className="text-indigo-600 hover:text-indigo-900" title="Reset password">
                                            <HiKey className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No users found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
                            
                            {editError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{editError}</p>
                                </div>
                            )}

                            {editSuccess && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-600">{editSuccess}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Enter full name"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Enter email address"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="user">User</option>
                                        <option value="organizer">Organizer</option>
                                        <option value="customer_support">Customer Support</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={editLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {editLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={handleCloseEditModal}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
