'use client'

import { useState } from 'react'
import { Booking } from '@/lib/types/database'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface RefundRequestButtonProps {
    booking: Booking
    onRefundRequested?: () => void
}

export default function RefundRequestButton({ booking, onRefundRequested }: RefundRequestButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [acknowledged, setAcknowledged] = useState(false)

    // Don't show anything if no refund policy exists
    if (!booking.event?.timeline?.refund || booking.event.timeline.refund.length === 0) {
        return null
    }

    // Check if refund is available
    const canRequestRefund = () => {
        if (booking.status !== 'confirmed' && booking.status !== 'verified') return false
        if (booking.refund_status !== 'none') return false
        if (!booking.event?.timeline?.refund) return false

        const now = new Date()
        const refundTimeline = booking.event.timeline.refund

        // Check if any timeline period allows refunds
        for (const item of refundTimeline) {
            const fromTime = item.from_date ? new Date(item.from_date).getTime() : 0
            const toTime = item.to_date ? new Date(item.to_date).getTime() : new Date(booking.event.start_date).getTime()
            const currentTime = now.getTime()

            if (currentTime >= fromTime && currentTime <= toTime && item.value > 0) {
                return true
            }
        }

        return false
    }

    const calculateCurrentRefund = () => {
        if (!booking.event?.timeline?.refund) return null

        const now = new Date()
        const refundTimeline = booking.event.timeline.refund

        for (const item of refundTimeline) {
            const fromTime = item.from_date ? new Date(item.from_date).getTime() : 0
            const toTime = item.to_date ? new Date(item.to_date).getTime() : new Date(booking.event.start_date).getTime()
            const currentTime = now.getTime()

            if (currentTime >= fromTime && currentTime <= toTime) {
                if (item.type === 'percentage') {
                    return {
                        amount: (booking.total_amount * item.value) / 100,
                        percentage: item.value,
                        type: 'percentage' as const
                    }
                } else {
                    return {
                        amount: Math.min(item.value, booking.total_amount),
                        percentage: (item.value / booking.total_amount) * 100,
                        type: 'fixed' as const
                    }
                }
            }
        }

        return null
    }

    const handleRefundRequest = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/bookings/${booking.id}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason.trim() || 'User requested refund' })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process refund')
            }

            setShowModal(false)
            setReason('')
            setAcknowledged(false)
            setError('')

            // Call the callback if provided, otherwise refresh the page
            if (onRefundRequested) {
                onRefundRequested()
            } else {
                window.location.reload()
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const currentRefund = calculateCurrentRefund()

    if (!canRequestRefund()) {
        return null
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                    </>
                ) : (
                    'Request Refund'
                )}
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Request Refund
                            </h3>

                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Event:</strong> {booking.event?.title}
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Original Amount:</strong> ${booking.total_amount.toFixed(2)}
                                </p>
                                {currentRefund && (
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>Refund Amount:</strong> ${currentRefund.amount.toFixed(2)}
                                        ({currentRefund.percentage.toFixed(1)}%)
                                    </p>
                                )}
                            </div>

                            {/* Warning Message */}
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            Important Notice
                                        </h4>
                                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-100">
                                            <ul className="list-disc list-inside space-y-1">
                                                <li><strong>Your booking will be cancelled</strong> if the refund is approved</li>
                                                <li>If you wish to join the event again, you&apos;ll need to <strong>book a new ticket</strong></li>
                                                <li>Availability is not guaranteed - the event may be sold out</li>
                                                <li>Ticket prices may have changed since your original booking</li>
                                                <li>This action cannot be undone once processed</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="mb-4">
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Reason for refund (optional)
                                </label>
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center mb-4">
                                <input
                                    id="acknowledge"
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={e => setAcknowledged(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600"
                                />
                                <label htmlFor="acknowledge" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
                                    I understand the consequences of requesting a refund
                                </label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefundRequest}
                                    disabled={loading || !acknowledged}
                                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Requesting...' : 'Confirm Refund'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
