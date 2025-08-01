'use client'

import { useState } from 'react'
import { Booking } from '@/lib/types/database'

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
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Request Refund
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Request Refund
                            </h3>
                            
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Event:</strong> {booking.event?.title}
                                </p>
                                <p className="text-sm text-blue-800">
                                    <strong>Original Amount:</strong> ${booking.total_amount.toFixed(2)}
                                </p>
                                {currentRefund && (
                                    <p className="text-sm text-blue-800">
                                        <strong>Refund Amount:</strong> ${currentRefund.amount.toFixed(2)} 
                                        ({currentRefund.percentage.toFixed(1)}%)
                                    </p>
                                )}
                            </div>

                            {/* Warning Message */}
                            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-yellow-800">
                                            Important Notice
                                        </h4>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <ul className="list-disc list-inside space-y-1">
                                                <li><strong>Your booking will be cancelled</strong> if the refund is approved</li>
                                                <li>If you wish to join the event again, you'll need to <strong>book a new ticket</strong></li>
                                                <li>Availability is not guaranteed - the event may be sold out</li>
                                                <li>Ticket prices may have changed since your original booking</li>
                                                <li>This action cannot be undone once processed</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="mb-4">
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for refund (optional)
                                </label>
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Please provide a reason for your refund request..."
                                />
                            </div>

                            {/* Acknowledgment Checkbox */}
                            <div className="mb-4">
                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="acknowledge"
                                            type="checkbox"
                                            checked={acknowledged}
                                            onChange={(e) => setAcknowledged(e.target.checked)}
                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="acknowledge" className="font-medium text-gray-700">
                                            I understand that my booking will be cancelled and I cannot rejoin without rebooking
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setAcknowledged(false)
                                        setError('')
                                        setReason('')
                                    }}
                                    disabled={loading}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRefundRequest}
                                    disabled={loading || !acknowledged}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Processing...' : 'Request Refund'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
