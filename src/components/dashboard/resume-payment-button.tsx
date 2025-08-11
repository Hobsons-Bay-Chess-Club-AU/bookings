'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
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
            // First check if we have complete data to resume to step 4
            const checkResponse = await fetch('/api/bookings/check-complete-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookingId })
            })

            if (checkResponse.ok) {
                const checkData = await checkResponse.json()
                
                if (checkData.canResume) {
                    // Redirect to booking form step 4 with existing data
                    window.location.href = `/events/${checkData.booking.eventId}?step=4&resume=${bookingId}`
                    return
                }
            }

            // If we don't have complete data, proceed with direct payment
            const response = await fetch('/api/bookings/resume-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookingId })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to resume payment')
            }

            const { url } = await response.json()

            // Redirect to Stripe checkout
            const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
            if (stripe) {
                await stripe.redirectToCheckout({ sessionId: url.split('/').pop()! })
            } else {
                // Fallback: redirect directly to the URL
                window.location.href = url
            }

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
