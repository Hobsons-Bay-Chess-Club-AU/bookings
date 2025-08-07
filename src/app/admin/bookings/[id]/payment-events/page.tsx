'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import JsonViewer from '@/components/JsonViewer'
import { HiExclamationCircle, HiDocumentText, HiLightningBolt } from 'react-icons/hi'

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
    data: Record<string, unknown>
}

export default function PaymentEventsPage() {
    const [booking, setBooking] = useState<Booking | null>(null)
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [authLoading, setAuthLoading] = useState(true)
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<StripeEvent | null>(null)
    const [loadingEvent, setLoadingEvent] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const params = useParams()
    const bookingId = params.id as string
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    setError('Authentication required')
                    setAuthLoading(false)
                    return
                }

                // Check if user is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (!profile || (profile.role !== 'admin' && profile.role !== 'organizer')) {
                    setError('Access denied')
                    setAuthLoading(false)
                    return
                }

                setAuthLoading(false)
            } catch (err) {
                console.error('Auth check error:', err)
                setError('Authentication failed')
                setAuthLoading(false)
            }
        }

        checkAuth()
    }, [supabase])

    useEffect(() => {
        if (authLoading) return

        const fetchData = async () => {
            try {
                setError('')
                
                // Get booking details
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        booking_id,
                        status,
                        total_amount,
                        events!bookings_event_id_fkey (
                            title
                        ),
                        profiles!bookings_user_id_fkey (
                            full_name,
                            email
                        )
                    `)
                    .eq('id', bookingId)
                    .single()

                if (bookingError) {
                    throw new Error(`Failed to load booking: ${bookingError.message}`)
                }

                // Transform the booking data to match the expected type
                const transformedBooking: Booking = {
                    id: bookingData.id,
                    booking_id: bookingData.booking_id,
                    status: bookingData.status,
                    total_amount: bookingData.total_amount,
                    events: Array.isArray(bookingData.events) ? bookingData.events[0] || null : bookingData.events,
                    profiles: Array.isArray(bookingData.profiles) ? bookingData.profiles[0] || null : bookingData.profiles
                }

                setBooking(transformedBooking)

                // Get payment events for this booking
                const { data: eventsData, error: eventsError } = await supabase
                    .from('payment_events')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .order('created_at', { ascending: false })

                if (eventsError) {
                    throw new Error(`Failed to load payment events: ${eventsError.message}`)
                }

                setPaymentEvents(eventsData || [])
            } catch (err) {
                console.error('Error fetching data:', err)
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [bookingId, supabase, authLoading])

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showEventModal) {
                closeModal()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [showEventModal])

    const fetchStripeEvent = async (eventId: string) => {
        try {
            setLoadingEvent(true)
            const response = await fetch(`/api/stripe/events/${eventId}`)
            
            if (!response.ok) {
                throw new Error('Failed to fetch Stripe event')
            }
            
            const data = await response.json()
            setSelectedEvent(data)
            setShowEventModal(true)
        } catch (err) {
            console.error('Error fetching Stripe event:', err)
            showToast('Failed to fetch Stripe event details', 'error')
        } finally {
            setLoadingEvent(false)
        }
    }

    const getEventTypeColor = (eventType: string) => {
        if (eventType.includes('payment_intent')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        if (eventType.includes('charge')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        if (eventType.includes('refund')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
        if (eventType.includes('dispute')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }

    const copyToClipboard = async () => {
        if (!selectedEvent) return
        
        try {
            await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))
            showToast('JSON copied to clipboard', 'success')
        } catch (err) {
            console.error('Failed to copy to clipboard:', err)
            showToast('Failed to copy to clipboard', 'error')
        }
    }

    const closeModal = () => {
        setShowEventModal(false)
        setSelectedEvent(null)
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow mb-8 rounded-lg px-6 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Events</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {booking ? `Booking: ${booking.booking_id}` : 'Loading...'}
                        </p>
                    </div>
                    <Link
                        href="/admin/bookings"
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                    >
                        ← Back to Bookings
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            {authLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <HiExclamationCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    </div>
                </div>
            ) : loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading payment events...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Booking Summary */}
                    {booking && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Booking Summary</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Booking ID</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{booking.booking_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{booking.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">AUD ${booking.total_amount.toFixed(2)}</p>
                                </div>
                                {booking.events && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Event</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{booking.events.title}</p>
                                    </div>
                                )}
                                {booking.profiles && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {booking.profiles.full_name || booking.profiles.email}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Events List */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Events</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {paymentEvents.length} event{paymentEvents.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                        <div className="overflow-hidden">
                            {paymentEvents.length === 0 ? (
                                <div className="text-center py-12">
                                    <HiDocumentText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No payment events</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        No payment events have been recorded for this booking.
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {paymentEvents.map((event) => (
                                        <li key={event.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                                            <HiLightningBolt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {event.stripe_event_type}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(event.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.stripe_event_type)}`}>
                                                        {event.stripe_event_type}
                                                    </span>
                                                    <button
                                                        onClick={() => fetchStripeEvent(event.stripe_event_id)}
                                                        disabled={loadingEvent}
                                                        className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {loadingEvent ? 'Loading...' : 'View Details'}
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stripe Event Modal */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative mx-auto p-5 border w-full h-full shadow-lg bg-white dark:bg-gray-800 flex flex-col">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Stripe Event: {selectedEvent.type}
                            </h3>
                            <div className="flex space-x-2">
                                <button onClick={copyToClipboard} className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700">Copy JSON</button>
                                <button onClick={closeModal} className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700">Close</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <JsonViewer data={selectedEvent} />
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg ${
                    toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}





