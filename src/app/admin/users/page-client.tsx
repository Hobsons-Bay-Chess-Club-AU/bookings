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
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <HiPencilSquare className="h-4 w-4" />
                                        </button>
                                        <button className="text-indigo-600 hover:text-indigo-900">
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
        </div>
    )
}
