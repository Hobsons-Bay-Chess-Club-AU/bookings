'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Event, Booking, Profile } from '@/lib/types/database'

interface BookingWithProfile extends Booking {
    profile: Profile
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'refunded'

interface EventBookingsClientProps {
    event: Event
    bookings: BookingWithProfile[]
}

export default function EventBookingsClient({ event, bookings }: EventBookingsClientProps) {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

    // Calculate stats
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
    const refundedBookings = bookings.filter(b => b.refund_status === 'completed').length
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'verified')
        .reduce((sum, b) => sum + b.total_amount, 0)
    const totalTickets = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'verified')
        .reduce((sum, b) => sum + b.quantity, 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return 'bg-green-100 text-green-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'refunded':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
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

    const getStatCardClass = (filterType: FilterStatus, isActive: boolean) => {
        const baseClass = "p-3 rounded cursor-pointer transition-all duration-200 hover:shadow-md"
        const activeClass = "ring-2 ring-indigo-500"
        const colorClass = getStatColorClass(filterType)
        return isActive ? `${baseClass} ${activeClass} ${colorClass}` : `${baseClass} ${colorClass}`
    }

    const getStatColorClass = (filterType: FilterStatus) => {
        switch (filterType) {
            case 'all':
                return 'bg-blue-50 hover:bg-blue-100'
            case 'confirmed':
                return 'bg-green-50 hover:bg-green-100'
            case 'pending':
                return 'bg-yellow-50 hover:bg-yellow-100'
            case 'cancelled':
                return 'bg-red-50 hover:bg-red-100'
            case 'refunded':
                return 'bg-gray-50 hover:bg-gray-100'
            default:
                return 'bg-gray-50 hover:bg-gray-100'
        }
    }

    return (
        <>
            {/* Event Info */}
            <div className="bg-white shadow rounded-lg mb-8 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Event Details</h2>
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
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Summary</h2>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                            <div
                                className={getStatCardClass('all', activeFilter === 'all')}
                                onClick={() => setActiveFilter('all')}
                            >
                                <div className="text-blue-800 font-medium">Total Bookings</div>
                                <div className="text-2xl font-bold text-blue-900">{totalBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('confirmed', activeFilter === 'confirmed')}
                                onClick={() => setActiveFilter('confirmed')}
                            >
                                <div className="text-green-800 font-medium">Confirmed</div>
                                <div className="text-2xl font-bold text-green-900">{confirmedBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('pending', activeFilter === 'pending')}
                                onClick={() => setActiveFilter('pending')}
                            >
                                <div className="text-yellow-800 font-medium">Pending</div>
                                <div className="text-2xl font-bold text-yellow-900">{pendingBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('cancelled', activeFilter === 'cancelled')}
                                onClick={() => setActiveFilter('cancelled')}
                            >
                                <div className="text-red-800 font-medium">Cancelled</div>
                                <div className="text-xl font-bold text-red-900">{cancelledBookings}</div>
                            </div>
                            <div
                                className={getStatCardClass('refunded', activeFilter === 'refunded')}
                                onClick={() => setActiveFilter('refunded')}
                            >
                                <div className="text-gray-800 font-medium">Refunded</div>
                                <div className="text-xl font-bold text-gray-900">{refundedBookings}</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded">
                                <div className="text-purple-800 font-medium">Revenue</div>
                                <div className="text-lg font-bold text-purple-900">AUD ${totalRevenue.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Indicator */}
            {activeFilter !== 'all' && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-blue-600 mr-2">🔍</span>
                            <span className="text-sm text-blue-800">
                                Showing {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} with {activeFilter} status
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            Clear filter
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings List */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Bookings ({filteredBookings.length})
                    </h2>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-4 block">🎫</span>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {activeFilter === 'all'
                                ? 'No bookings yet'
                                : 'No bookings match your filter'
                            }
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {activeFilter === 'all'
                                ? 'Bookings will appear here once customers start purchasing tickets.'
                                : 'Try adjusting your filter to see more results.'
                            }
                        </p>
                        {activeFilter !== 'all' && (
                            <button
                                onClick={() => setActiveFilter('all')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredBookings.map((booking) => (
                            <div key={booking.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {booking.profile.full_name || 'Unknown Customer'}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                    {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                                {booking.refund_status && booking.refund_status !== 'none' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        💰 {booking.refund_status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-gray-900">
                                                    AUD ${booking.total_amount.toFixed(2)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                                            <div className="flex items-center">
                                                <span className="mr-2">📧</span>
                                                <span>{booking.profile.id}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">📅</span>
                                                <span>
                                                    Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">🆔</span>
                                                <span className="font-mono text-xs">
                                                    {booking.id.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </div>

                                        {booking.stripe_payment_intent_id && (
                                            <div className="text-xs text-gray-500 mb-2">
                                                <span className="mr-2">💳</span>
                                                Payment Intent: {booking.stripe_payment_intent_id}
                                            </div>
                                        )}

                                        {booking.stripe_session_id && (
                                            <div className="text-xs text-gray-500">
                                                <span className="mr-2">🔗</span>
                                                Session: {booking.stripe_session_id}
                                            </div>
                                        )}

                                        {booking.refund_amount && (
                                            <div className="text-sm text-purple-600 mt-2">
                                                <span className="mr-2">💰</span>
                                                Refund Amount: AUD ${booking.refund_amount.toFixed(2)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-6 flex-shrink-0 flex flex-col space-y-2">
                                        <Link
                                            href={`/booking/${booking.id}`}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            View Details
                                        </Link>
                                        {booking.status === 'pending' && (
                                            <button
                                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                title="Manual confirmation (if needed)"
                                            >
                                                Mark Confirmed
                                            </button>
                                        )}
                                        {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                            <button
                                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                title="Refund booking"
                                            >
                                                Refund
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Export Options */}
            {filteredBookings.length > 0 && (
                <div className="mt-8 bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Export & Actions</h3>
                    <div className="flex flex-wrap gap-4">
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            📊 Export to CSV ({filteredBookings.length} bookings)
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            📧 Email Filtered Customers
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            🎫 Generate Check-in List
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
