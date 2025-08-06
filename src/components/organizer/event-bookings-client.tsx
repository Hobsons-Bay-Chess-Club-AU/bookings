'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Event } from '@/lib/types/database'
import { FiSettings, FiEye, FiCreditCard, FiMail, FiPhone, FiUser, FiArrowRight } from 'react-icons/fi'
import { BookingWithProfile } from '@/lib/types/ui'
import BookingTransferModal from '@/components/events/booking-transfer-modal'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'refunded'

interface EventBookingsClientProps {
    event: Event
    bookings: BookingWithProfile[]
}

interface BookingMenuState {
    [key: string]: boolean
}

interface PaymentModalState {
    isOpen: boolean
    booking: BookingWithProfile | null
}

interface TransferModalState {
    isOpen: boolean
    booking: BookingWithProfile | null
}

export default function EventBookingsClient({ event, bookings }: EventBookingsClientProps) {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
    const [openMenus, setOpenMenus] = useState<BookingMenuState>({})
    const [paymentModal, setPaymentModal] = useState<PaymentModalState>({ isOpen: false, booking: null })
    const [transferModal, setTransferModal] = useState<TransferModalState>({ isOpen: false, booking: null })
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Calculate stats
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
    const refundedBookings = bookings.filter(b => b.refund_status === 'completed').length
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'verified')
        .reduce((sum, b) => sum + b.total_amount, 0)
    // const totalTickets = bookings
    //     .filter(b => b.status === 'confirmed' || b.status === 'verified')
    //     .reduce((sum, b) => sum + b.quantity, 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
            case 'cancelled':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'refunded':
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return '✓'
            case 'pending':
                return '⏳'
            case 'cancelled':
                return '❌'
            case 'refunded':
                return '💰'
            default:
                return '❓'
        }
    }

    const filteredBookings = bookings.filter(booking => {
        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            const matchesName = booking.profile.full_name?.toLowerCase().includes(searchLower)
            const matchesEmail = booking.profile.email.toLowerCase().includes(searchLower)
            const matchesPhone = booking.profile.phone?.toLowerCase().includes(searchLower)
            const matchesId = (booking.booking_id || booking.id).toLowerCase().includes(searchLower)

            if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) {
                return false
            }
        }

        // Filter by booking status
        if (activeFilter === 'confirmed') {
            return booking.status === 'confirmed' || booking.status === 'verified'
        } else if (activeFilter === 'refunded') {
            return booking.refund_status === 'completed'
        } else if (activeFilter !== 'all') {
            return booking.status === activeFilter
        }
        return true
    })

    // Pagination calculations
    const totalItems = filteredBookings.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

    // Reset to first page when filters change
    const handleFilterChange = (filter: FilterStatus) => {
        setActiveFilter(filter)
        setCurrentPage(1)
    }

    const handleSearchChange = (term: string) => {
        setSearchTerm(term)
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top of bookings list
        document.getElementById('bookings-list')?.scrollIntoView({ behavior: 'smooth' })
    }

    const getStatCardClass = (filterType: FilterStatus, isActive: boolean) => {
        const baseClass = "p-3 rounded cursor-pointer transition-all duration-200 hover:shadow-md"
        const activeClass = "ring-2 ring-indigo-500"
        const colorClass = getStatColorClass(filterType)
        return isActive ? `${baseClass} ${activeClass} ${colorClass}` : `${baseClass} ${colorClass}`
    }

    const getStatColorClass = (filterType: FilterStatus) => {
        switch (filterType) {
            case 'all':
                return 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            case 'confirmed':
                return 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
            case 'pending':
                return 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
            case 'cancelled':
                return 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
            case 'refunded':
                return 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            default:
                return 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
        }
    }

    const toggleMenu = (bookingId: string) => {
        setOpenMenus(prev => ({
            ...prev,
            [bookingId]: !prev[bookingId]
        }))
    }

    const openPaymentModal = (booking: BookingWithProfile) => {
        setPaymentModal({ isOpen: true, booking })
        setOpenMenus({}) // Close all menus
    }

    const closePaymentModal = () => {
        setPaymentModal({ isOpen: false, booking: null })
    }

    const openTransferModal = (booking: BookingWithProfile) => {
        setTransferModal({ isOpen: true, booking })
        setOpenMenus({})
    }

    const closeTransferModal = () => {
        setTransferModal({ isOpen: false, booking: null })
    }

    const handleTransfer = async (targetEventId: string, reason: string, notes: string) => {
        if (!transferModal.booking) return

        console.log('Transfer request data:', {
            bookingId: transferModal.booking.id,
            targetEventId,
            reason,
            notes
        })

        try {
            const response = await fetch('/api/admin/bookings/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: transferModal.booking.id,
                    targetEventId,
                    reason,
                    notes
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to transfer booking')
            }

            // Refresh the page to show updated data
            window.location.reload()
        } catch (error) {
            throw error
        }
    }

    const formatRefundDate = (dateString?: string) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <>
            {/* Payment Details Modal */}
            {paymentModal.isOpen && paymentModal.booking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-gray-900 dark:text-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Payment Details</h3>
                            <button
                                onClick={closePaymentModal}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Booking ID:</span>
                                <span className="ml-2 font-mono">{paymentModal.booking.booking_id || paymentModal.booking.id}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Amount:</span>
                                <span className="ml-2">AUD ${paymentModal.booking.total_amount.toFixed(2)}</span>
                            </div>
                            {paymentModal.booking.stripe_payment_intent_id && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Payment Intent:</span>
                                    <span className="ml-2 font-mono text-xs break-all">{paymentModal.booking.stripe_payment_intent_id}</span>
                                </div>
                            )}
                            {paymentModal.booking.stripe_session_id && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Session ID:</span>
                                    <span className="ml-2 font-mono text-xs break-all">{paymentModal.booking.stripe_session_id}</span>
                                </div>
                            )}
                            {paymentModal.booking.refund_status && paymentModal.booking.refund_status !== 'none' && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                                    <div className="mb-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Refund Status:</span>
                                        <span className="ml-2 capitalize">{paymentModal.booking.refund_status}</span>
                                    </div>
                                    {paymentModal.booking.refund_amount && (
                                        <div className="mb-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Refund Amount:</span>
                                            <span className="ml-2">AUD ${paymentModal.booking.refund_amount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {paymentModal.booking.refund_requested_at && (
                                        <div className="mb-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Requested:</span>
                                            <span className="ml-2">{formatRefundDate(paymentModal.booking.refund_requested_at)}</span>
                                        </div>
                                    )}
                                    {paymentModal.booking.refund_processed_at && (
                                        <div className="mb-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Processed:</span>
                                            <span className="ml-2">{formatRefundDate(paymentModal.booking.refund_processed_at)}</span>
                                        </div>
                                    )}
                                    {paymentModal.booking.refund_reason && (
                                        <div>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span>
                                            <span className="ml-2">{paymentModal.booking.refund_reason}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={closePaymentModal}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Event Info */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900 dark:text-gray-100">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Event Details</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                                <span className="mr-2">📅</span>
                                <span>
                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">🕒</span>
                                <span>
                                    {new Date(event.start_date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })} - {new Date(event.end_date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">📍</span>
                                <span>{event.location}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">💰</span>
                                <span>AUD ${event.price.toFixed(2)} per ticket</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Booking Summary</h2>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                            <div
                                className={getStatCardClass('all', activeFilter === 'all')}
                                onClick={() => handleFilterChange('all')}
                            >
                                <div className="text-blue-800 dark:text-blue-300 font-medium">Total Bookings</div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{totalBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('confirmed', activeFilter === 'confirmed')}
                                onClick={() => handleFilterChange('confirmed')}
                            >
                                <div className="text-green-800 dark:text-green-300 font-medium">Confirmed</div>
                                <div className="text-2xl font-bold text-green-900 dark:text-green-200">{confirmedBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('pending', activeFilter === 'pending')}
                                onClick={() => handleFilterChange('pending')}
                            >
                                <div className="text-yellow-800 dark:text-yellow-300 font-medium">Pending</div>
                                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{pendingBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('cancelled', activeFilter === 'cancelled')}
                                onClick={() => handleFilterChange('cancelled')}
                            >
                                <div className="text-red-800 dark:text-red-300 font-medium">Cancelled</div>
                                <div className="text-xl font-bold text-red-900 dark:text-red-200">{cancelledBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('refunded', activeFilter === 'refunded')}
                                onClick={() => handleFilterChange('refunded')}
                            >
                                <div className="text-gray-800 dark:text-gray-300 font-medium">Refunded</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-200">{refundedBookings}</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                                <div className="text-purple-800 dark:text-purple-300 font-medium">Revenue</div>
                                <div className="text-lg font-bold text-purple-900 dark:text-purple-200">AUD ${totalRevenue.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Indicator */}
            {(activeFilter !== 'all' || searchTerm) && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <span className="text-blue-600 dark:text-blue-400 mr-2">🔍</span>
                            <span className="text-sm text-blue-800 dark:text-blue-300">
                                Showing {filteredBookings.length} of {totalBookings} booking{filteredBookings.length !== 1 ? 's' : ''}
                                {activeFilter !== 'all' && ` with ${activeFilter} status`}
                                {searchTerm && ` matching "${searchTerm}"`}
                            </span>
                        </div>
                        <div className="flex space-x-2">
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                >
                                    Clear search
                                </button>
                            )}
                            {activeFilter !== 'all' && (
                                <button
                                    onClick={() => handleFilterChange('all')}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                >
                                    Clear filter
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Controls */}
            <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name, email, phone, or booking ID..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400 dark:text-gray-500">🔍</span>
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="itemsPerPage" className="text-sm text-gray-700 dark:text-gray-300">Show:</label>
                            <select
                                id="itemsPerPage"
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            <div id="bookings-list" className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Bookings ({filteredBookings.length})
                        </h2>
                        {totalPages > 1 && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                            </div>
                        )}
                    </div>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-4 block">🎫</span>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {activeFilter === 'all'
                                ? 'No bookings yet'
                                : 'No bookings match your filter'
                            }
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {activeFilter === 'all'
                                ? 'Bookings will appear here once customers start purchasing tickets.'
                                : 'Try adjusting your filter to see more results.'
                            }
                        </p>
                        {activeFilter !== 'all' && (
                            <button
                                onClick={() => handleFilterChange('all')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedBookings.map((booking) => (
                                <div key={booking.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Header row with name, status, and booking ID */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                                        <FiUser className="mr-2 text-gray-400 dark:text-gray-500" />
                                                        {booking.profile.full_name || 'Unknown Customer'}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                    </span>
                                                    {booking.refund_status && booking.refund_status !== 'none' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                                            💰 Refund: {booking.refund_status}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                        AUD ${booking.total_amount.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Information */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                <div className="flex items-center">
                                                    <FiMail className="mr-2 text-gray-400 dark:text-gray-500" />
                                                    <span>{booking.profile.email}</span>
                                                </div>
                                                {booking.profile.phone && (
                                                    <div className="flex items-center">
                                                        <FiPhone className="mr-2 text-gray-400 dark:text-gray-500" />
                                                        <span>{booking.profile.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    <span>
                                                        Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString('en-AU')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Booking ID and Transfer/Refund Info */}
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center">
                                                        <span className="mr-2">🆔</span>
                                                        <span className="font-mono text-gray-900 dark:text-gray-100">
                                                            {booking.booking_id || booking.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    {booking.transferred_from_event_id && (
                                                        <div className="text-blue-600 dark:text-blue-400">
                                                            <span className="mr-1">🔄</span>
                                                            Transferred
                                                            {booking.transferred_at && (
                                                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                                    on {new Date(booking.transferred_at).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {booking.refund_amount && (
                                                        <div className="text-purple-600 dark:text-purple-400">
                                                            <span className="mr-1">💰</span>
                                                            Refunded: AUD ${booking.refund_amount.toFixed(2)}
                                                            {booking.refund_processed_at && (
                                                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                                    on {formatRefundDate(booking.refund_processed_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Menu */}
                                        <div className="ml-6 flex-shrink-0 relative">
                                            <button
                                                onClick={() => toggleMenu(booking.id)}
                                                className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                            >
                                                <FiSettings className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenus[booking.id] && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-600">
                                                    <Link
                                                        href={`/organizer/events/${event.id}/bookings/${booking.id}`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                        onClick={() => setOpenMenus({})}
                                                    >
                                                        <FiEye className="mr-2 w-4 h-4" />
                                                        View Details
                                                    </Link>
                                                    <button
                                                        onClick={() => openPaymentModal(booking)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                    >
                                                        <FiCreditCard className="mr-2 w-4 h-4" />
                                                        Payment Info
                                                    </button>
                                                    <button
                                                        onClick={() => openTransferModal(booking)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    >
                                                        <FiArrowRight className="mr-2 w-4 h-4" />
                                                        Transfer Booking
                                                    </button>
                                                    {booking.status === 'pending' && (
                                                        <button
                                                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                            title="Manual confirmation (if needed)"
                                                        >
                                                            ✓ Mark Confirmed
                                                        </button>
                                                    )}
                                                    {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                                        <button
                                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title="Refund booking"
                                                        >
                                                            💰 Process Refund
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Click outside to close menus */}
                                    {openMenus[booking.id] && (
                                        <div
                                            className="fixed inset-0 z-5"
                                            onClick={() => setOpenMenus({})}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex space-x-1">
                                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                                let pageNumber
                                                if (totalPages <= 7) {
                                                    pageNumber = i + 1
                                                } else if (currentPage <= 4) {
                                                    pageNumber = i + 1
                                                } else if (currentPage >= totalPages - 3) {
                                                    pageNumber = totalPages - 6 + i
                                                } else {
                                                    pageNumber = currentPage - 3 + i
                                                }

                                                const isActive = pageNumber === currentPage
                                                return (
                                                    <button
                                                        key={pageNumber}
                                                        onClick={() => handlePageChange(pageNumber)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${isActive
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>            {/* Export Options */}
            {filteredBookings.length > 0 && (
                <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Export & Actions</h3>
                    <div className="flex flex-wrap gap-4">
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            📊 Export to CSV ({filteredBookings.length} bookings)
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            📧 Email Filtered Customers ({filteredBookings.length})
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            🎫 Generate Check-in List ({filteredBookings.length})
                        </button>
                    </div>
                    {searchTerm && (
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Note:</span> Export will include all {filteredBookings.length} filtered results, not just the current page.
                        </div>
                    )}
                </div>
            )}

            {/* Transfer Modal */}
            {transferModal.isOpen && transferModal.booking && (
                <BookingTransferModal
                    isOpen={transferModal.isOpen}
                    onClose={closeTransferModal}
                    onTransfer={handleTransfer}
                    bookingId={transferModal.booking.id}
                    currentEventId={event.id}
                    currentEventTitle={event.title}
                    userEmail={transferModal.booking.profile.email}
                    quantity={transferModal.booking.quantity}
                />
            )}
        </>
    )
}
