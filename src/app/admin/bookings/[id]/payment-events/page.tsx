'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/layout/admin-layout'
import Link from 'next/link'

interface PaymentEvent {
    id: string
    booking_id: string
    stripe_event_type: string
    stripe_event_id: string
    created_at: string
}

interface Booking {
    id: string
    booking_id: string
    status: string
    total_amount: number
    events: {
        title: string
    } | null
    profiles: {
        full_name: string | null
        email: string
    } | null
}

interface StripeEvent {
    id: string
    type: string
    created: number
    data: any
}

export default function PaymentEventsPage() {
    const params = useParams()
    const bookingId = params.id as string
    
    const [booking, setBooking] = useState<Booking | null>(null)
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<StripeEvent | null>(null)
    const [loadingEvent, setLoadingEvent] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        if (bookingId) {
            fetchBookingAndEvents()
        }
    }, [bookingId])

    const fetchBookingAndEvents = async () => {
        try {
            setLoading(true)
            
            // Fetch booking details
            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_id,
                    status,
                    total_amount,
                    events (
                        title
                    ),
                    profiles (
                        full_name,
                        email
                    )
                `)
                .eq('id', bookingId)
                .single()

            if (bookingError) throw bookingError
            setBooking(bookingData as unknown as Booking)

            // Fetch payment events
            const { data: eventsData, error: eventsError } = await supabase
                .from('payment_events')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: false })

            if (eventsError) throw eventsError
            setPaymentEvents(eventsData || [])
            
        } catch (error: any) {
            console.error('Error fetching data:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchStripeEvent = async (eventId: string) => {
        try {
            setLoadingEvent(true)
            const response = await fetch(`/api/stripe/events/${eventId}`)
            
            if (!response.ok) {
                throw new Error('Failed to fetch Stripe event')
            }

            const eventData = await response.json()
            setSelectedEvent(eventData)
            setShowEventModal(true)
        } catch (error: any) {
            console.error('Error fetching Stripe event:', error)
            alert('Failed to fetch event details: ' + error.message)
        } finally {
            setLoadingEvent(false)
        }
    }

    const getEventTypeColor = (eventType: string) => {
        if (eventType.includes('succeeded') || eventType.includes('completed')) {
            return 'bg-green-100 text-green-800'
        } else if (eventType.includes('failed') || eventType.includes('expired') || eventType.includes('dispute')) {
            return 'bg-red-100 text-red-800'
        } else if (eventType.includes('created') || eventType.includes('processing')) {
            return 'bg-blue-100 text-blue-800'
        } else {
            return 'bg-gray-100 text-gray-800'
        }
    }

    const closeModal = () => {
        setShowEventModal(false)
        setSelectedEvent(null)
    }

    if (loading) {
        return (
            <AdminLayout requiredRole="customer_support">
                <div className="flex justify-center items-center min-h-96">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                </div>
            </AdminLayout>
        )
    }

    if (error || !booking) {
        return (
            <AdminLayout requiredRole="customer_support">
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-center">
                        <div className="text-red-600 text-xl mb-4">Error loading payment events</div>
                        <p className="text-gray-600">{error || 'Booking not found'}</p>
                        <Link
                            href="/admin/bookings"
                            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Back to Bookings
                        </Link>
                    </div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout requiredRole="customer_support">
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Payment Events</h1>
                            <p className="mt-2 text-gray-600">
                                Stripe payment events for booking {booking.booking_id}
                            </p>
                        </div>
                        <Link
                            href="/admin/bookings"
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            ← Back to Bookings
                        </Link>
                    </div>
                </div>

                {/* Booking Info */}
                <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Event</dt>
                            <dd className="mt-1 text-sm text-gray-900">{booking.events?.title || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Customer</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{booking.profiles?.full_name || 'N/A'}</div>
                                <div className="text-gray-600">{booking.profiles?.email}</div>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    booking.status === 'verified' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {booking.status}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Amount</dt>
                            <dd className="mt-1 text-sm text-gray-900">${(booking.total_amount / 100).toFixed(2)}</dd>
                        </div>
                    </div>
                </div>

                {/* Payment Events */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Payment Events ({paymentEvents.length})</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Click "View Details" to see the full Stripe event payload
                        </p>
                    </div>

                    {paymentEvents.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No payment events found for this booking</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Event Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stripe Event ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paymentEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.stripe_event_type)}`}>
                                                    {event.stripe_event_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                {event.stripe_event_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(event.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => fetchStripeEvent(event.stripe_event_id)}
                                                    disabled={loadingEvent}
                                                    className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                                >
                                                    {loadingEvent ? 'Loading...' : 'View Details'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Details Modal */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Stripe Event: {selectedEvent.type}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="mb-4 p-4 bg-gray-50 rounded-md">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Event ID:</span> {selectedEvent.id}
                                    </div>
                                    <div>
                                        <span className="font-medium">Created:</span> {new Date(selectedEvent.created * 1000).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96">
                                <pre className="text-sm whitespace-pre-wrap">
                                    {JSON.stringify(selectedEvent, null, 2)}
                                </pre>
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
