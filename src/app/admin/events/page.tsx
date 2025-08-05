import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HiCalendarDays, HiUsers, HiMapPin, HiCurrencyDollar } from 'react-icons/hi2'

interface AdminEvent {
    id: string
    title: string
    status: string
    start_date: string
    end_date: string
    location: string
    price: number
    current_attendees: number
    max_attendees: number | null
    created_at: string
    organizer: {
        full_name: string
        email: string
    }
    totalBookings: number
    confirmedBookings: number
    revenue: number
}

interface RawEvent {
    id: string
    title: string
    status: string
    start_date: string
    end_date: string
    location: string
    price: number
    current_attendees: number
    max_attendees: number | null
    created_at: string
    organizer: {
        full_name: string
        email: string
    } | Array<{
        full_name: string
        email: string
    }>
}

interface Booking {
    total_amount: number
    status: string
}

async function getAdminEvents(): Promise<AdminEvent[]> {
    const supabase = await createClient()

    const { data: events, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            status,
            start_date,
            end_date,
            location,
            price,
            current_attendees,
            max_attendees,
            created_at,
            organizer:profiles!events_organizer_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching events:', error)
        return []
    }

    // Get booking stats for each event
    const eventsWithStats = await Promise.all(
        (events || []).map(async (event: RawEvent) => {
            const { data: bookings } = await supabase
                .from('bookings')
                .select('total_amount, status')
                .eq('event_id', event.id)

            const totalBookings = bookings?.length || 0
            const confirmedBookings = bookings?.filter((b: Booking) => ['confirmed', 'verified'].includes(b.status)).length || 0
            const revenue = bookings
                ?.filter((b: Booking) => ['confirmed', 'verified'].includes(b.status))
                .reduce((sum: number, b: Booking) => sum + (b.total_amount || 0), 0) || 0

            // Handle organizer data - it might be an array or single object
            const organizerData = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer

            return {
                id: event.id,
                title: event.title,
                status: event.status,
                start_date: event.start_date,
                end_date: event.end_date,
                location: event.location,
                price: event.price,
                current_attendees: event.current_attendees,
                max_attendees: event.max_attendees,
                created_at: event.created_at,
                organizer: {
                    full_name: organizerData?.full_name || '',
                    email: organizerData?.email || ''
                },
                totalBookings,
                confirmedBookings,
                revenue
            }
        })
    )

    return eventsWithStats
}

function getStatusColor(status: string) {
    switch (status) {
        case 'published':
            return 'text-green-600 bg-green-100'
        case 'draft':
            return 'text-gray-600 bg-gray-100'
        case 'cancelled':
            return 'text-red-600 bg-red-100'
        case 'completed':
            return 'text-blue-600 bg-blue-100'
        case 'entry_closed':
            return 'text-orange-600 bg-orange-100'
        default:
            return 'text-gray-600 bg-gray-100'
    }
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
    }).format(amount)
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export default async function AdminEventsPage() {
    const user = await getCurrentProfile()
    
    if (!user || user.role !== 'admin') {
        redirect('/unauthorized')
    }

    const events = await getAdminEvents()

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">All Events</h1>
                            <p className="text-gray-600 mt-2">Overview of all events in the system</p>
                        </div>
                        <Link
                            href="/admin"
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Events List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">
                            Events ({events.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                                    {event.title}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <HiCalendarDays className="h-4 w-4 mr-2" />
                                                    <span>{formatDate(event.start_date)}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiMapPin className="h-4 w-4 mr-2" />
                                                    <span className="truncate">{event.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiUsers className="h-4 w-4 mr-2" />
                                                    <span>{event.current_attendees} / {event.max_attendees || '∞'}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiCurrencyDollar className="h-4 w-4 mr-2" />
                                                    <span>{formatCurrency(event.price)}</span>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-sm text-gray-500">
                                                <span>Organizer: {event.organizer?.full_name || event.organizer?.email}</span>
                                                <span className="mx-2">•</span>
                                                <span>Bookings: {event.confirmedBookings} confirmed / {event.totalBookings} total</span>
                                                <span className="mx-2">•</span>
                                                <span>Revenue: {formatCurrency(event.revenue)}</span>
                                            </div>
                                        </div>

                                        <div className="ml-6 flex-shrink-0">
                                            <Link
                                                href={`/admin/events/${event.id}`}
                                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                            >
                                                View Details →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <HiCalendarDays className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    No events have been created yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 