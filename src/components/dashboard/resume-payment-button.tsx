'use client'

import { useState } from 'react'
import { HiCreditCard } from 'react-icons/hi2'

interface ResumePaymentButtonProps {
    bookingId: string
    eventTitle: string
    totalAmount: number
    className?: string
}

export default function ResumePaymentButton({ 
    bookingId, 
    eventTitle, 
    totalAmount, 
    className = '' 
}: ResumePaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleResumePayment = async () => {
        setLoading(true)
        setError(null)

        try {
            // Always check for booking data first to get the event ID
            const checkResponse = await fetch('/api/bookings/check-complete-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookingId })
            })

            if (checkResponse.ok) {
                const checkData = await checkResponse.json()
                
                // Always redirect to booking form step 4, regardless of canResume status
                // This ensures consistent behavior and allows users to review before payment
                window.location.href = `/events/${checkData.booking.eventId}?step=4&resume=${bookingId}`
                return
            }

            // Fallback: if we can't get booking data, show error
            throw new Error('Unable to load booking data')

        } catch (err) {
            console.error('Error resuming payment:', err)
            setError(err instanceof Error ? err.message : 'Failed to resume payment')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={className}>
            <button
                onClick={handleResumePayment}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                title={`Resume payment for ${eventTitle} - $${totalAmount.toFixed(2)}`}
            >
                <HiCreditCard className="h-4 w-4 mr-1" />
                {loading ? 'Processing...' : 'Pay Now'}
            </button>
            {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}
        </div>
    )
}
