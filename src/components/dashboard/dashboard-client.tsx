'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import RefundRequestButton from './refund-request-button'
import { Booking, Event } from '@/lib/types/database'
import { 
    HiTicket, 
    HiCheckCircle, 
    HiClock, 
    HiXCircle, 
    HiCurrencyDollar, 
    HiMagnifyingGlass,
    HiCalendarDays,
    HiMapPin,
    HiIdentification
} from 'react-icons/hi2'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'cancelled'

interface DashboardClientProps {
    bookings: (Booking & { event: Event })[]
}

export default function DashboardClient({ bookings }: DashboardClientProps) {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

    // Memoize expensive calculations
    const bookingStats = useMemo(() => {
        const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length
        const pending = bookings.filter(b => b.status === 'pending').length
        const cancelled = bookings.filter(b => b.status === 'cancelled').length
        const totalSpent = bookings
            .filter(b => b.status === 'confirmed' || b.status === 'verified')
            .reduce((sum, b) => sum + b.total_amount, 0)

        return { confirmed, pending, cancelled, totalSpent }
    }, [bookings])

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (activeFilter === 'all') return true
            if (activeFilter === 'confirmed') return booking.status === 'confirmed' || booking.status === 'verified'
            return booking.status === activeFilter
        })
    }, [bookings, activeFilter])

    const getStatusColor = useCallback((status: string) => {
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
    }, [])

    const getStatusIcon = useCallback((status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return <HiCheckCircle className="h-4 w-4 text-green-600" />
            case 'pending':
                return <HiClock className="h-4 w-4 text-yellow-600" />
            case 'cancelled':
                return <HiXCircle className="h-4 w-4 text-red-600" />
            case 'refunded':
                return <HiCurrencyDollar className="h-4 w-4 text-gray-600" />
            default:
                return <div className="h-4 w-4 text-gray-400">?</div>
        }
    }, [])

    const getRefundStatusDisplay = useCallback((booking: Booking & { event: Event }) => {
        if (!booking.refund_status || booking.refund_status === 'none') {
            return null
        }

        const statusColors = {
            'requested': 'text-yellow-600',
            'processing': 'text-blue-600',
            'completed': 'text-green-600',
            'failed': 'text-red-600'
        }

        const statusLabels = {
            'requested': 'Refund Requested',
            'processing': 'Processing Refund',
            'completed': 'Refunded',
            'failed': 'Refund Failed'
        }

        return (
            <div className={`text-xs ${statusColors[booking.refund_status as keyof typeof statusColors] || 'text-gray-500'} mt-1 whitespace-nowrap flex items-center`}>
                <HiCurrencyDollar className="h-3 w-3 mr-1" />
                {statusLabels[booking.refund_status as keyof typeof statusLabels] || booking.refund_status}
                {booking.refund_amount && (
                    <div className="text-xs text-gray-500 mt-0.5">
                        ${booking.refund_amount.toFixed(2)}
                    </div>
                )}
            </div>
        )
    }, [])

    const getStatCardClass = useCallback((filterType: FilterStatus) => {
        const baseClass = "bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md"
        const activeClass = "ring-2 ring-indigo-500 bg-indigo-50"
        return activeFilter === filterType ? `${baseClass} ${activeClass}` : baseClass
    }, [activeFilter])

    return (
        <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div
                    className={getStatCardClass('all')}
                    onClick={() => setActiveFilter('all')}
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiTicket className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Bookings
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {bookings.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={getStatCardClass('confirmed')}
                    onClick={() => setActiveFilter('confirmed')}
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiCheckCircle className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Confirmed
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {bookingStats.confirmed}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={getStatCardClass('pending')}
                    onClick={() => setActiveFilter('pending')}
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiClock className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Pending
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {bookingStats.pending}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={getStatCardClass('cancelled')}
                    onClick={() => setActiveFilter('cancelled')}
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiXCircle className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Cancelled
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {bookingStats.cancelled}
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
                                <HiCurrencyDollar className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Spent
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        ${bookingStats.totalSpent.toFixed(2)}
                                    </dd>
                                </dl>
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
                            <HiMagnifyingGlass className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm text-blue-800">
                                Showing {filteredBookings.length} {activeFilter} booking{filteredBookings.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            Show all bookings
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings List */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">My Bookings</h2>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                        <HiTicket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {activeFilter === 'all' ? 'No bookings yet' : `No ${activeFilter} bookings`}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {activeFilter === 'all'
                                ? 'Start by browsing our amazing events and book your first ticket!'
                                : `You don't have any ${activeFilter} bookings at the moment.`
                            }
                        </p>
                        {activeFilter === 'all' ? (
                            <Link
                                href="/"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Browse Events
                            </Link>
                        ) : (
                            <button
                                onClick={() => setActiveFilter('all')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                View All Bookings
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredBookings.map((booking) => (
                            <div key={booking.id} className="p-4 md:p-6">
                                {/* Mobile Card Layout */}
                                <div className="md:hidden space-y-3">
                                    <div className="flex items-start justify-between">
                                        <Link
                                            href={`/events/${booking.event.id}`}
                                            className="text-lg font-medium text-indigo-600 hover:text-indigo-800 flex-1 mr-3"
                                        >
                                            {booking.event.title}
                                        </Link>
                                        <div className="flex flex-col items-end">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)} {booking.status}
                                            </span>
                                            {getRefundStatusDisplay(booking)}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <HiCalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>{new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}</span>
                                            <span className="mx-2">•</span>
                                            <span>{new Date(booking.event.start_date).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <HiMapPin className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>{booking.event.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <HiTicket className="h-4 w-4 mr-2 text-gray-400" />
                                                <span>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <HiIdentification className="h-4 w-4 mr-2 text-gray-400" />
                                                <span className="font-mono text-xs">{booking.booking_id || booking.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-sm text-gray-500">
                                                Booked: {new Date(booking.booking_date).toLocaleDateString()}
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">
                                                AUD ${booking.total_amount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-3 flex gap-2">
                                        <Link
                                            href={`/booking/${booking.booking_id || booking.id}`}
                                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            View Details
                                        </Link>
                                        <div className="flex-1">
                                            <RefundRequestButton booking={booking} />
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Table Layout */}
                                <div className="hidden md:block">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                            <div className="col-span-2">
                                                <Link
                                                    href={`/events/${booking.event.id}`}
                                                    className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                                                >
                                                    {booking.event.title}
                                                </Link>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {booking.event.location}
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600">
                                                <div>{new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}</div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(booking.event.start_date).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600">
                                                <div>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</div>
                                                <div className="font-mono text-xs text-gray-500">
                                                    ID: {booking.booking_id || booking.id.slice(0, 8)}
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600">
                                                <div className="font-medium text-gray-900">AUD ${booking.total_amount.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">
                                                    Booked: {new Date(booking.booking_date).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-col items-start">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)} {booking.status}
                                                    </span>
                                                    {getRefundStatusDisplay(booking)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-4 flex-shrink-0 flex gap-2">
                                            <Link
                                                href={`/booking/${booking.booking_id || booking.id}`}
                                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                View Details
                                            </Link>
                                            <RefundRequestButton booking={booking} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
