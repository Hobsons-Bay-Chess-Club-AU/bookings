'use client'

import { useState, useEffect } from 'react'
import { HiPlus, HiMagnifyingGlass, HiPencil, HiTrash } from 'react-icons/hi2'
import ConfirmationModal from '@/components/ui/confirmation-modal'

interface BanListEntry {
    id: string
    first_name: string
    middle_name?: string
    last_name: string
    date_of_birth: string
    active: boolean
    notes?: string
    created_at: string
    updated_at: string
    created_by_profile?: {
        id: string
        full_name: string
        email: string
    }
}

interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
}

export default function BanListClient() {
    const [banList, setBanList] = useState<BanListEntry[]>([])
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilter, setActiveFilter] = useState<string>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState<BanListEntry | null>(null)
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        active: true,
        notes: ''
    })
    const [error, setError] = useState('')

    const fetchBanList = async (page = 1, search = '', active = 'all') => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(active !== 'all' && { active })
            })

            const response = await fetch(`/api/admin/ban-list?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch ban list')
            }

            const data = await response.json()
            setBanList(data.data)
            setPagination(data.pagination)
        } catch (error) {
            console.error('Error fetching ban list:', error)
            setError('Failed to load ban list')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBanList()
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchBanList(1, searchTerm, activeFilter)
    }

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter)
        fetchBanList(1, searchTerm, filter)
    }

    const handlePageChange = (page: number) => {
        fetchBanList(page, searchTerm, activeFilter)
    }

    const handleAdd = async () => {
        try {
            const response = await fetch('/api/admin/ban-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Failed to add ban entry')
            }

            setShowAddModal(false)
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                date_of_birth: '',
                active: true,
                notes: ''
            })
            fetchBanList(pagination.page, searchTerm, activeFilter)
        } catch (error) {
            console.error('Error adding ban entry:', error)
            setError('Failed to add ban entry')
        }
    }

    const handleEdit = async () => {
        if (!selectedEntry) return

        try {
            const response = await fetch(`/api/admin/ban-list/${selectedEntry.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Failed to update ban entry')
            }

            setShowEditModal(false)
            setSelectedEntry(null)
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                date_of_birth: '',
                active: true,
                notes: ''
            })
            fetchBanList(pagination.page, searchTerm, activeFilter)
        } catch (error) {
            console.error('Error updating ban entry:', error)
            setError('Failed to update ban entry')
        }
    }

    const handleDelete = async () => {
        if (!selectedEntry) return

        try {
            const response = await fetch(`/api/admin/ban-list/${selectedEntry.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete ban entry')
            }

            setShowDeleteModal(false)
            setSelectedEntry(null)
            fetchBanList(pagination.page, searchTerm, activeFilter)
        } catch (error) {
            console.error('Error deleting ban entry:', error)
            setError('Failed to delete ban entry')
        }
    }

    const openEditModal = (entry: BanListEntry) => {
        setSelectedEntry(entry)
        setFormData({
            first_name: entry.first_name,
            middle_name: entry.middle_name || '',
            last_name: entry.last_name,
            date_of_birth: entry.date_of_birth,
            active: entry.active,
            notes: entry.notes || ''
        })
        setShowEditModal(true)
    }

    const openDeleteModal = (entry: BanListEntry) => {
        setSelectedEntry(entry)
        setShowDeleteModal(true)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1">
                    <div className="relative">
                        <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                </form>

                <select
                    value={activeFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                >
                    <option value="all">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <HiPlus className="h-5 w-5" />
                    <span>Add Entry</span>
                </button>
            </div>

            {/* Ban List Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Date of Birth
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Added By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Date Added
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        Loading...
                                    </td>
                                </tr>
                            ) : banList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        No ban entries found
                                    </td>
                                </tr>
                            ) : (
                                banList.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {entry.first_name} {entry.middle_name && `${entry.middle_name} `}{entry.last_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(entry.date_of_birth)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                entry.active
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                                {entry.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {entry.created_by_profile?.full_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(entry.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => openEditModal(entry)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    <HiPencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(entry)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <HiTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                page === pagination.page
                                                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                {showAddModal ? 'Add Ban Entry' : 'Edit Ban Entry'}
                            </h3>
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Middle Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.middle_name}
                                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Date of Birth *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={showAddModal ? handleAdd : handleEdit}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium"
                                    >
                                        {showAddModal ? 'Add' : 'Update'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false)
                                            setShowEditModal(false)
                                            setFormData({
                                                first_name: '',
                                                middle_name: '',
                                                last_name: '',
                                                date_of_birth: '',
                                                active: true,
                                                notes: ''
                                            })
                                        }}
                                        className="flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Ban Entry"
                message={`Are you sure you want to delete the ban entry for ${selectedEntry?.first_name} ${selectedEntry?.last_name}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}
