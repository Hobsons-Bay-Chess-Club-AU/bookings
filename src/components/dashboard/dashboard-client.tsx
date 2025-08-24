'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import RefundRequestButton from './refund-request-button'
import ResumePaymentButton from './resume-payment-button'
import DiscountSavingsCard from './discount-savings-card'
import { Booking, Event, Participant } from '@/lib/types/database'
import { 
    HiTicket, 
    HiCheckCircle, 
    HiClock, 
    HiXCircle, 
    HiCurrencyDollar, 
    HiMagnifyingGlass,
    HiCalendarDays,
    HiMapPin,
    HiIdentification,
    HiExclamationTriangle
} from 'react-icons/hi2'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'whitelisted'

interface DashboardClientProps {
    bookings: (Booking & { event: Event })[]
    participants: Participant[]
}

export default function DashboardClient({ bookings, participants }: DashboardClientProps) {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

    const [showCancelModal, setShowCancelModal] = useState(false)
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<(Booking & { event: Event }) | null>(null)
    const [cancelReason, setCancelReason] = useState('')
    const [isCancelling, setIsCancelling] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [error, setError] = useState<string>('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string>('')

    // Memoize expensive calculations
    const bookingStats = useMemo(() => {
        const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length
        const pending = bookings.filter(b => b.status === 'pending').length
        const cancelled = bookings.filter(b => b.status === 'cancelled').length
        const whitelisted = bookings.filter(b => b.status === 'whitelisted').length
        const totalSpent = bookings
            .filter(b => b.status === 'confirmed' || b.status === 'verified')
            .reduce((sum, b) => sum + b.total_amount, 0)

        return { confirmed, pending, cancelled, whitelisted, totalSpent }
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
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'whitelisted':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            case 'refunded':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }
    }, [])

    const getStatusIcon = useCallback((status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return <HiCheckCircle className="h-4 w-4 text-green-600" />
            case 'pending':
                return <HiClock className="h-4 w-4 text-yellow-600" />
            case 'whitelisted':
                return <HiClock className="h-4 w-4 text-amber-600" />
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
        const baseClass = "bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md"
        const activeClass = "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
        return activeFilter === filterType ? `${baseClass} ${activeClass}` : baseClass
    }, [activeFilter])

    const getParticipantsForBooking = useCallback((bookingId: string) => {
        return participants.filter(p => p.booking_id === bookingId)
    }, [participants])

    const canWithdrawBooking = useCallback((booking: Booking & { event: Event }) => {
        const now = new Date()
        const eventStartDate = new Date(booking.event.start_date)
        return now < eventStartDate
    }, [])

    const handleCancelBooking = async () => {
        if (!selectedBookingForCancel) {
            return
        }

        setIsCancelling(true)
        try {
            // For single participant bookings, we'll withdraw the participant
            // For multi-participant bookings, we'll need to cancel the entire booking
            const participants = getParticipantsForBooking(selectedBookingForCancel.id)
            
            if (participants.length === 1) {
                // Single participant - withdraw the participant
                const response = await fetch(`/api/bookings/${selectedBookingForCancel.id}/withdraw-participant`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        participant_id: participants[0].id,
                        reason: cancelReason.trim() || 'Booking withdrawn by user'
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to withdraw booking')
                }

                const result = await response.json()
                
                // Show success message with refund information
                if (result.refund_amount && result.refund_amount > 0) {
                    setSuccessMessage(`Booking withdrawn successfully. Refund amount: $${result.refund_amount.toFixed(2)} (${result.refund_percentage}%)`)
                } else {
                    setSuccessMessage('Booking withdrawn successfully.')
                }
                setShowSuccessModal(true)
            } else {
                // Multiple participants - we need a different approach
                // For now, we'll show a message that they need to withdraw participants individually
                setSuccessMessage('For bookings with multiple participants, please withdraw participants individually using the "Manage Participants" option.')
                setShowSuccessModal(true)
                return
            }
        } catch (error) {
            console.error('Error withdrawing booking:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw booking'
            setError(`${errorMessage}. Please try again. If the error persists, please contact the event organizer to initiate the withdrawal.`)
            setShowErrorModal(true)
        } finally {
            setIsCancelling(false)
            setShowCancelModal(false)
            setSelectedBookingForCancel(null)
            setCancelReason('')
        }
    }

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
                                    <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-200">
                                        Total Bookings
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                                    <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-100">
                                        Confirmed
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                                    <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-100">
                                        Pending
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                                    <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-100">
                                        Cancelled
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {bookingStats.cancelled}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-700">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiCurrencyDollar className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-100">
                                        Total Spent
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        ${bookingStats.totalSpent.toFixed(2)}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Discount Savings Card */}
            <div className="mb-8">
                <DiscountSavingsCard />
            </div>

            {/* Filter Indicator */}
            {activeFilter !== 'all' && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <HiMagnifyingGlass className="h-4 w-4 text-blue-600 dark:text-blue-300 mr-2" />
                            <span className="text-sm text-blue-800 dark:text-blue-200">
                                Showing {filteredBookings.length} {activeFilter} booking{filteredBookings.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="text-sm text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 underline"
                        >
                            Show all bookings
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Bookings</h2>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                        <HiTicket className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {activeFilter === 'all' ? 'No bookings yet' : `No ${activeFilter} bookings`}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
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
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredBookings.map((booking) => (
                            <div key={booking.id} className="p-4 md:p-6 dark:text-gray-100">
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

                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-100">
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
                                            <HiMapPin className="h-4 w-4 mr-2 text-gray-400 dark:text-white-900" />
                                            <span>{booking.event.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <HiTicket className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-100" />
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
                                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
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
                                        {booking.status === 'pending' && (
                                            <ResumePaymentButton
                                                bookingId={booking.id}
                                                eventTitle={booking.event.title}
                                                totalAmount={booking.total_amount}
                                                className="flex-1"
                                            />
                                        )}
                                        {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                            <Link
                                                href={`/downloads/${booking.id}`}
                                                className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                                            >
                                                <HiTicket className="h-4 w-4 mr-1" />
                                                Downloads
                                            </Link>
                                        )}
                                        <div className="flex-1">
                                            <RefundRequestButton booking={booking} />
                                        </div>
                                        {(booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted') && canWithdrawBooking(booking) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedBookingForCancel(booking)
                                                    setShowCancelModal(true)
                                                }}
                                                className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 dark:bg-gray-700 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/20"
                                            >
                                                <HiXCircle className="h-4 w-4 mr-1" />
                                                Withdraw
                                            </button>
                                        )}
                                    </div>

                                </div>

                                {/* Desktop Table Layout */}
                                <div className="hidden md:block dark:text-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                            <div className="col-span-2 dark:text-gray-100">
                                                <Link
                                                    href={`/events/${booking.event.id}`}
                                                    className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                                                >
                                                    {booking.event.title}
                                                </Link>
                                                <div className="text-sm text-gray-500 mt-1 dark:text-gray-100">
                                                    {booking.event.location}
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600 dark:text-gray-100">
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

                                            <div className="text-sm text-gray-600 dark:text-gray-100">
                                                <div>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</div>
                                                <div className="font-mono text-xs text-gray-500">
                                                    ID: {booking.booking_id || booking.id.slice(0, 8)}
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600 dark:text-gray-100">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">AUD ${booking.total_amount.toFixed(2)}</div>
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
                                            {booking.status === 'pending' && (
                                                <ResumePaymentButton
                                                    bookingId={booking.id}
                                                    eventTitle={booking.event.title}
                                                    totalAmount={booking.total_amount}
                                                />
                                            )}
                                            {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                                <Link
                                                    href={`/downloads/${booking.id}`}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                                                >
                                                    <HiTicket className="h-4 w-4 mr-1" />
                                                    Downloads
                                                </Link>
                                            )}
                                            <RefundRequestButton booking={booking} />
                                            {(booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted') && canWithdrawBooking(booking) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBookingForCancel(booking)
                                                        setShowCancelModal(true)
                                                    }}
                                                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 dark:bg-gray-700 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/20"
                                                >
                                                    <HiXCircle className="h-4 w-4 mr-1" />
                                                    Withdraw
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Booking Modal */}
            {showCancelModal && selectedBookingForCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => !isCancelling && setShowCancelModal(false)}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Withdraw from Event
                            </h3>
                            <button
                                onClick={() => !isCancelling && setShowCancelModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                                <div className="flex items-start">
                                    <HiExclamationTriangle className="h-5 w-5 text-amber-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            Withdraw from {selectedBookingForCancel.event.title}?
                                        </h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                            This action will withdraw your entire booking and remove all participants from the event.
                                            {selectedBookingForCancel.total_amount > 0 && (
                                                <span> A refund of ${selectedBookingForCancel.total_amount.toFixed(2)} may be applicable based on the event&apos;s refund policy.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason for withdrawal (optional)
                                </label>
                                <textarea
                                    id="cancel-reason"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                    placeholder="Please provide a reason for withdrawing from this event..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    disabled={isCancelling}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => !isCancelling && setShowCancelModal(false)}
                                    disabled={isCancelling}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Keep Booking
                                </button>
                                <button
                                    onClick={handleCancelBooking}
                                    disabled={isCancelling}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCancelling ? 'Withdrawing...' : 'Withdraw from Event'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => {
                        setShowErrorModal(false)
                        setSelectedBookingForCancel(null)
                    }}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Error
                            </h3>
                            <button
                                onClick={() => {
                                    setShowErrorModal(false)
                                    setSelectedBookingForCancel(null)
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                <div className="flex items-start">
                                    <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                                            Withdrawal Failed
                                        </h4>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            {error}
                                        </p>
                                        {selectedBookingForCancel && (
                                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                                                <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                                                    Need help? Contact the event organizer:
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                    Event: {selectedBookingForCancel.event.title}
                                                </p>
                                                {selectedBookingForCancel.event.organizer_email && (
                                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                                        Email: {selectedBookingForCancel.event.organizer_email}
                                                    </p>
                                                )}
                                                {selectedBookingForCancel.event.organizer_phone && (
                                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                                        Phone: {selectedBookingForCancel.event.organizer_phone}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowErrorModal(false)
                                        setSelectedBookingForCancel(null)
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => {
                        setShowSuccessModal(false)
                        window.location.reload()
                    }}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Success
                            </h3>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false)
                                    window.location.reload()
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                <div className="flex items-start">
                                    <HiCheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                                            Withdrawal Successful
                                        </h4>
                                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                            {successMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false)
                                        window.location.reload()
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
