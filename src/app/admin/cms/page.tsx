'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Content } from '@/lib/types/database'
import { 
    HiCog6Tooth, 
    HiEye, 
    HiPencilSquare, 
    HiClock,
    HiTrash,
    HiShieldCheck
} from 'react-icons/hi2'

interface ContentWithProfiles extends Content {
    created_by_profile?: { full_name: string | null }
    updated_by_profile?: { full_name: string | null }
}

interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
}

export default function CMSPage() {
    const [content, setContent] = useState<ContentWithProfiles[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [publishedFilter, setPublishedFilter] = useState<string>('all')
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    })
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
    const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const router = useRouter()

    const fetchContent = async (page = 1, search = searchTerm, published = publishedFilter) => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                search,
            })

            if (published !== 'all') {
                params.append('published', published)
            }

            const response = await fetch(`/api/admin/content?${params}`)
            const data = await response.json()

            if (response.ok) {
                setContent(data.content || [])
                setPagination(data.pagination)
            } else {
                console.error('Failed to fetch content:', data.error)
            }
        } catch (error) {
            console.error('Error fetching content:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchContent()
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId) {
                const dropdownElement = dropdownRefs.current[openDropdownId]
                if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
                    setOpenDropdownId(null)
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [openDropdownId])

    const toggleDropdown = (contentId: string) => {
        setOpenDropdownId(openDropdownId === contentId ? null : contentId)
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchContent(1, searchTerm, publishedFilter)
    }

    const handleFilterChange = (published: string) => {
        setPublishedFilter(published)
        fetchContent(1, searchTerm, published)
    }

    const handlePageChange = (newPage: number) => {
        fetchContent(newPage, searchTerm, publishedFilter)
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/content/${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                setDeleteConfirm(null)
                fetchContent() // Refresh the list
            } else {
                const data = await response.json()
                console.error('Failed to delete content:', data.error)
                // Show error message to user
                alert(data.error || 'Failed to delete content')
            }
        } catch (error) {
            console.error('Error deleting content:', error)
            alert('An error occurred while deleting content')
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (isPublished: boolean) => {
        return isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    }

    const getStatusBadge = (isPublished: boolean) => {
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(isPublished)}`}>
                {isPublished ? 'Published' : 'Draft'}
            </span>
        )
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
                        <p className="text-gray-600 mt-2">Manage website content, pages, and static content</p>
                    </div>
                    <Link
                        href="/admin/cms/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <span className="mr-2">+</span>
                        Create Content
                    </Link>
                </div>

                {/* Search and Filters */}
                <div className="bg-white shadow rounded-lg p-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search content by title, slug, or body..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={publishedFilter}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Status</option>
                                <option value="true">Published</option>
                                <option value="false">Draft</option>
                            </select>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {/* Content List */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-gray-600">Loading content...</p>
                        </div>
                    ) : content.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="text-4xl mb-4">📄</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm || publishedFilter !== 'all'
                                    ? 'Try adjusting your search criteria.'
                                    : 'Get started by creating your first piece of content.'
                                }
                            </p>
                            {!searchTerm && publishedFilter === 'all' && (
                                <Link
                                    href="/admin/cms/new"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                >
                                    Create Content
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Content
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Last Updated
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Version
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {content.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-grow">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {item.title}
                                                                {item.is_system && (
                                                                    <HiShieldCheck className="inline ml-2 h-4 w-4 text-blue-600" title="System Content" />
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                /{item.slug}
                                                            </div>
                                                            {item.meta_description && (
                                                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                                    {item.meta_description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(item.is_published)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {formatDate(item.updated_at)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        by {item.updated_by_profile?.full_name || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">v{item.version}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => toggleDropdown(item.id)}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                            title="Content Actions"
                                                        >
                                                            <HiCog6Tooth className="h-5 w-5" />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {openDropdownId === item.id && (
                                                            <div
                                                                ref={(el) => { dropdownRefs.current[item.id] = el }}
                                                                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                                            >
                                                                <div className="py-1">
                                                                    {item.is_published && (
                                                                        <a
                                                                            href={`/content/${item.slug}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                        >
                                                                            <HiEye className="mr-2 h-4 w-4" /> View Published
                                                                        </a>
                                                                    )}
                                                                    <Link
                                                                        href={`/admin/cms/${item.id}/edit`}
                                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                        onClick={() => setOpenDropdownId(null)}
                                                                    >
                                                                        <HiPencilSquare className="mr-2 h-4 w-4" /> Edit Content
                                                                    </Link>
                                                                    <Link
                                                                        href={`/admin/cms/${item.id}/history`}
                                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                        onClick={() => setOpenDropdownId(null)}
                                                                    >
                                                                        <HiClock className="mr-2 h-4 w-4" /> Version History
                                                                    </Link>
                                                                    {!item.is_system && (
                                                                        <>
                                                                            <div className="border-t border-gray-100 my-1"></div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setDeleteConfirm(item.id)
                                                                                    setOpenDropdownId(null)
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                                                            >
                                                                                <HiTrash className="mr-2 h-4 w-4" /> Delete Content
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing{' '}
                                                <span className="font-medium">
                                                    {((pagination.page - 1) * pagination.limit) + 1}
                                                </span>{' '}
                                                to{' '}
                                                <span className="font-medium">
                                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                                </span>{' '}
                                                of{' '}
                                                <span className="font-medium">{pagination.total}</span>{' '}
                                                results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                <button
                                                    onClick={() => handlePageChange(pagination.page - 1)}
                                                    disabled={pagination.page <= 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pageNum === pagination.page
                                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => handlePageChange(pagination.page + 1)}
                                                    disabled={pagination.page >= pagination.totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <span className="text-red-600 text-xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Content</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
                                    Are you sure you want to delete this content? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
