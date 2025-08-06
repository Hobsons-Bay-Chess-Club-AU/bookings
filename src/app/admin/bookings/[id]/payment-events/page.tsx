'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import Link from 'next/link'
import JsonView from '@uiw/react-json-view'

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

    const params = useParams()
    const router = useRouter()
    const bookingId = params.id as string

    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [booking, setBooking] = useState<Booking | null>(null)
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<StripeEvent | null>(null)
    const [loadingEvent, setLoadingEvent] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const supabase = createClient()

    // Modal close handler (must be above useEffect)
    const closeModal = () => {
        setShowEventModal(false)
        setSelectedEvent(null)
    }

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    router.push('/auth/login')
                    return
                }

                setCurrentUser(user)

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError || !profileData) {
                    router.push('/unauthorized')
                    return
                }

                setProfile(profileData)

                // Check if user has permission (admin or customer_support)
                if (!['admin', 'customer_support'].includes(profileData.role)) {
                    router.push('/unauthorized')
                    return
                }

                setAuthLoading(false)
            } catch (error) {
                console.error('Auth check error:', error)
                router.push('/auth/login')
            }
        }
        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session?.user) {
                router.push('/auth/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase.auth, router])

    // Keyboard event handler for modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showEventModal) {
                closeModal()
            }
        }

        if (showEventModal) {
            document.addEventListener('keydown', handleKeyDown)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [showEventModal, closeModal])

    // ...existing code...

    const fetchBookingAndEvents = useCallback(async () => {
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

        } catch (error: unknown) {
            console.error('Error fetching data:', error)
            setError(error instanceof Error ? error.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [supabase, bookingId])

    // Fetch booking and events when dependencies change
    useEffect(() => {
        if (!authLoading && currentUser && profile && bookingId) {
            fetchBookingAndEvents()
        }
    }, [authLoading, currentUser, profile, bookingId, fetchBookingAndEvents])

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
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
        } catch (error: unknown) {
            console.error('Error fetching Stripe event:', error)
            showToast('Failed to fetch event details: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
        } finally {
            setLoadingEvent(false)
        }
    }

    const getEventTypeColor = (eventType: string) => {
        if (eventType.includes('succeeded') || eventType.includes('completed')) {
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        } else if (eventType.includes('failed') || eventType.includes('expired') || eventType.includes('dispute')) {
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        } else if (eventType.includes('created') || eventType.includes('processing')) {
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        } else {
            return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }
    }

    const copyToClipboard = async () => {
        if (selectedEvent) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))
                showToast('Event data copied to clipboard', 'success')
            } catch (error) {
                console.error('Failed to copy:', error)
                showToast('Failed to copy to clipboard', 'error')
            }
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
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
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {authLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
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
                                        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
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
                                                                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
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
            </div>

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
                            <div className="dark:bg-gray-900 dark:text-gray-100 rounded-lg p-4">
                                <style jsx>{`
                                    .dark .w-rjv {
                                        color: #e5e7eb !important;
                                    }
                                    .dark .w-rjv-container {
                                        background-color: transparent !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-value {
                                        color: #e5e7eb !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-key {
                                        color: #60a5fa !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-string {
                                        color: #4ade80 !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-number {
                                        color: #fbbf24 !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-boolean {
                                        color: #f87171 !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-null {
                                        color: #9ca3af !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-undefined {
                                        color: #9ca3af !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-function {
                                        color: #a78bfa !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-array {
                                        color: #22d3ee !important;
                                    }
                                    .dark .w-rjv-container .w-rjv-object {
                                        color: #f472b6 !important;
                                    }
                                `}</style>
                                <JsonView
                                    value={selectedEvent}
                                    style={{ 
                                        backgroundColor: 'transparent',
                                        color: 'inherit'
                                    }}
                                    displayDataTypes={false}
                                    displayObjectSize={false}
                                    enableClipboard={false}
                                />
                            </div>
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




