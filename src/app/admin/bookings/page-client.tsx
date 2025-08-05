'use client'

import { useState } from 'react'
// ...existing code...
import Link from 'next/link'

interface Booking {
    id: string
    booking_id: string
    status: string
    total_amount: number
    created_at: string
    events: {
        id: string
        title: string
    } | null
    profiles: {
        id: string
        full_name: string | null
        email: string
    } | null
}

interface AdminBookingsPageClientProps {
    bookings: Booking[]
}

export default function AdminBookingsPageClient({ bookings }: AdminBookingsPageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch = searchTerm === '' ||
            booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.events?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage)

    const getStatusBadge = (status: string) => {
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            verified: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            refunded: 'bg-gray-100 text-gray-800'
        }

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        )
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
                <p className="mt-2 text-gray-600">
                    View and manage all event bookings and their payment events
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by booking ID, event, or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="verified">Verified</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Booking ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                        {booking.booking_id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {booking.events?.title || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>
                                            <div className="font-medium">
                                                {booking.profiles?.full_name || 'N/A'}
                                            </div>
                                            <div className="text-gray-500">
                                                {booking.profiles?.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(booking.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${(booking.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(booking.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            href={`/admin/bookings/${booking.id}/payment-events`}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Payment Events
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || statusFilter !== 'all' 
                                ? 'Try adjusting your search or filter criteria.'
                                : 'There are no bookings in the system yet.'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} results
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-2 text-sm font-medium text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
