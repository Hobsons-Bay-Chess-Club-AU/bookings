import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Event, Booking, Profile } from '@/lib/types/database'
import HtmlContent from '@/components/ui/html-content'

interface BookingWithProfile extends Booking {
    profile: Profile
}

async function getEventWithBookings(eventId: string, organizerId: string): Promise<{
    event: Event
    bookings: BookingWithProfile[]
} | null> {
    const supabase = await createClient()

    // First verify the event belongs to this organizer
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .single()

    if (eventError || !event) {
        return null
    }

    // Get bookings with user profiles
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            *,
            profile:profiles(*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        return { event, bookings: [] }
    }

    return {
        event,
        bookings: (bookings || []) as BookingWithProfile[]
    }
}

interface EventBookingsPageProps {
    params: Promise<{ id: string }>
}

export default async function EventBookingsPage({ params }: EventBookingsPageProps) {
    const { id } = await params
    const profile = await getCurrentProfile()

    if (!profile || !['admin', 'organizer'].includes(profile.role)) {
        redirect('/unauthorized')
    }

    const data = await getEventWithBookings(id, profile.id)

    if (!data) {
        notFound()
    }

    const { event, bookings } = data

    // Calculate stats
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'verified')
        .reduce((sum, b) => sum + b.total_amount, 0)
    const totalTickets = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'verified')
        .reduce((sum, b) => sum + b.quantity, 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return 'bg-green-100 text-green-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'refunded':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return '✓'
            case 'pending':
                return '⏳'
            case 'cancelled':
                return '❌'
            case 'refunded':
                return '💰'
            default:
                return '❓'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Event Bookings</h1>
                            <p className="text-gray-600">{event.title}</p>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href="/organizer"
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Back to Events
                            </Link>
                            <Link
                                href={`/events/${event.id}`}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                View Event Page
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Event Info */}
                <div className="bg-white shadow rounded-lg mb-8 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Event Details</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center">
                                    <span className="mr-2">📅</span>
                                    <span>
                                        {new Date(event.start_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">🕒</span>
                                    <span>
                                        {new Date(event.start_date).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })} - {new Date(event.end_date).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">📍</span>
                                    <span>{event.location}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">💰</span>
                                    <span>AUD ${event.price.toFixed(2)} per ticket</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Summary</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="text-blue-800 font-medium">Total Bookings</div>
                                    <div className="text-2xl font-bold text-blue-900">{totalBookings}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="text-green-800 font-medium">Confirmed</div>
                                    <div className="text-2xl font-bold text-green-900">{confirmedBookings}</div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded">
                                    <div className="text-yellow-800 font-medium">Pending</div>
                                    <div className="text-2xl font-bold text-yellow-900">{pendingBookings}</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded">
                                    <div className="text-purple-800 font-medium">Revenue</div>
                                    <div className="text-lg font-bold text-purple-900">AUD ${totalRevenue.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Bookings ({totalBookings})
                        </h2>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🎫</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No bookings yet
                            </h3>
                            <p className="text-gray-500">
                                Bookings will appear here once customers start purchasing tickets.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <h3 className="text-lg font-medium text-gray-900">
                                                        {booking.profile.full_name || 'Unknown Customer'}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-gray-900">
                                                        AUD ${booking.total_amount.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                                                <div className="flex items-center">
                                                    <span className="mr-2">📧</span>
                                                    <span>{booking.profile.id}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    <span>
                                                        Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🆔</span>
                                                    <span className="font-mono text-xs">
                                                        {booking.id.slice(0, 8)}...
                                                    </span>
                                                </div>
                                            </div>

                                            {booking.stripe_payment_intent_id && (
                                                <div className="text-xs text-gray-500 mb-2">
                                                    <span className="mr-2">💳</span>
                                                    Payment Intent: {booking.stripe_payment_intent_id}
                                                </div>
                                            )}

                                            {booking.stripe_session_id && (
                                                <div className="text-xs text-gray-500">
                                                    <span className="mr-2">🔗</span>
                                                    Session: {booking.stripe_session_id}
                                                </div>
                                            )}
                                        </div>

                                        <div className="ml-6 flex-shrink-0 flex flex-col space-y-2">
                                            <Link
                                                href={`/booking/${booking.id}`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                View Details
                                            </Link>
                                            {booking.status === 'pending' && (
                                                <button
                                                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                    title="Manual confirmation (if needed)"
                                                >
                                                    Mark Confirmed
                                                </button>
                                            )}
                                            {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                                <button
                                                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                    title="Refund booking"
                                                >
                                                    Refund
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Export Options */}
                {bookings.length > 0 && (
                    <div className="mt-8 bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Export & Actions</h3>
                        <div className="flex flex-wrap gap-4">
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                📊 Export to CSV
                            </button>
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                📧 Email All Customers
                            </button>
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                🎫 Generate Check-in List
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}