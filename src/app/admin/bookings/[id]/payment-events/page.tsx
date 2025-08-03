'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/admin-nav'
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
    data: any
}

export default function PaymentEventsPage() {
    const params = useParams()
    const router = useRouter()
    const bookingId = params.id as string

    const [currentUser, setCurrentUser] = useState<any>(null)
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

    useEffect(() => {
        if (!authLoading && currentUser && profile && bookingId) {
            fetchBookingAndEvents()
        }
    }, [authLoading, currentUser, profile, bookingId])

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
    }, [showEventModal])

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
            showToast('Failed to fetch event details: ' + error.message, 'error')
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

    const copyToClipboard = async () => {
        if (selectedEvent) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))
                showToast('JSON copied to clipboard!', 'success')
            } catch (error) {
                console.error('Failed to copy to clipboard:', error)
                showToast('Failed to copy to clipboard', 'error')
            }
        }
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminNav />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-center items-center min-h-96">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                </main>
            </div>
        )
    }

    // Don't render content if user is not authenticated (will redirect)
    if (!currentUser || !profile) {
        return null
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminNav />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-center items-center min-h-96">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                    </div>
                </main>
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminNav />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                </main>
            </div>
        )
    }

    return (
        <div >
            <div className="">
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
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'verified' ? 'bg-green-100 text-green-800' :
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
                            <dd className="mt-1 text-sm text-gray-900">${booking.total_amount.toFixed(2)}</dd>
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
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="w-full h-full max-w-none bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Stripe Event Details
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Event Type: <span className="font-mono text-blue-600">{selectedEvent.type}</span>
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copy JSON</span>
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Event ID:</span>
                                    <div className="font-mono text-gray-900 mt-1">{selectedEvent.id}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Created:</span>
                                    <div className="text-gray-900 mt-1">{new Date(selectedEvent.created * 1000).toLocaleString()}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Event Type:</span>
                                    <div className="text-gray-900 mt-1">{selectedEvent.type}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-hidden">
                            <div className="h-full bg-white border border-gray-200 rounded-lg overflow-auto">
                                <JsonView
                                    value={selectedEvent}
                                    style={{
                                        backgroundColor: 'white',
                                        fontSize: '14px',
                                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                        padding: '16px'
                                    }}
                                    displayDataTypes={false}
                                    enableClipboard={true}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                            <div className="text-sm text-gray-600">
                                Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to close
                            </div>
                            <button
                                onClick={closeModal}
                                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform ${toast.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    } animate-in slide-in-from-right`}>
                    <div className="flex items-center space-x-3">
                        {toast.type === 'success' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className="font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
