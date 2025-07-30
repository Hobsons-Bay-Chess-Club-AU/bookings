'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingFormProps {
    event: Event
    user: Profile
}

export default function BookingForm({ event, user }: BookingFormProps) {
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const supabase = createClient()
    const totalAmount = event.price * quantity
    const maxQuantity = event.max_attendees
        ? Math.min(10, event.max_attendees - event.current_attendees)
        : 10

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Create booking record
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    event_id: event.id,
                    user_id: user.id,
                    quantity,
                    total_amount: totalAmount,
                    status: 'pending'
                })
                .select()
                .single()

            if (bookingError) {
                throw new Error(bookingError.message)
            }

            // If the event is free, confirm the booking immediately
            if (event.price === 0) {
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ status: 'confirmed' })
                    .eq('id', booking.id)

                if (updateError) {
                    throw new Error(updateError.message)
                }

                // Refresh the page to show the updated booking status
                window.location.reload()
                return
            }

            // Create Stripe checkout session for paid events
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: booking.id,
                    eventId: event.id,
                    quantity,
                    amount: totalAmount,
                    eventTitle: event.title,
                }),
            })

            const { sessionId, error: sessionError } = await response.json()

            if (sessionError) {
                throw new Error(sessionError)
            }

            // Redirect to Stripe Checkout
            const stripe = await stripePromise
            if (stripe) {
                const { error: stripeError } = await stripe.redirectToCheckout({
                    sessionId,
                })

                if (stripeError) {
                    throw new Error(stripeError.message)
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (maxQuantity <= 0) {
        return (
            <div className="text-center">
                <p className="text-gray-600">This event is sold out.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleBooking} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Number of tickets
                </label>
                <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                            {num} ticket{num > 1 ? 's' : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                        {quantity} × ${event.price.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                        ${totalAmount.toFixed(2)}
                    </span>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 border border-transparent rounded-md py-3 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    'Processing...'
                ) : event.price === 0 ? (
                    'Book Free Ticket'
                ) : (
                    `Pay $${totalAmount.toFixed(2)}`
                )}
            </button>

            <p className="text-xs text-gray-500 text-center">
                {event.price > 0 ? (
                    'You will be redirected to Stripe to complete your payment.'
                ) : (
                    'This is a free event. Your booking will be confirmed immediately.'
                )}
            </p>
        </form>
    )
}