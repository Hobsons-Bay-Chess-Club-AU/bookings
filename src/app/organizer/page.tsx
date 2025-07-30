import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Event, Booking } from '@/lib/types/database'

async function getOrganizerEvents(organizerId: string): Promise<Event[]> {
    const supabase = await createClient()

    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching events:', error)
        return []
    }

    return events || []
}

async function getEventBookings(eventId: string): Promise<Booking[]> {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('event_id', eventId)

    if (error) {
        console.error('Error fetching bookings:', error)
        return []
    }

    return bookings || []
}

export default async function OrganizerPage() {
    const profile = await getCurrentProfile()

    if (!profile || !['admin', 'organizer'].includes(profile.role)) {
        redirect('/unauthorized')
    }

    const events = await getOrganizerEvents(profile.id)

    // Get booking counts for each event
    const eventsWithBookings = await Promise.all(
        events.map(async (event) => {
            const bookings = await getEventBookings(event.id)
            return {
                ...event,
                totalBookings: bookings.length,
                confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
                revenue: bookings
                    .filter(b => b.status === 'confirmed')
                    .reduce((sum, b) => sum + b.total_amount, 0)
            }
        })
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800'
            case 'draft':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'completed':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const totalRevenue = eventsWithBookings.reduce((sum, event) => sum + event.revenue, 0)
    const totalBookings = eventsWithBookings.reduce((sum, event) => sum + event.confirmedBookings, 0)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
                            <p className="text-gray-600">Manage your events and bookings</p>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href="/dashboard"
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/organizer/custom-fields"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Custom Fields
                            </Link>
                            <Link
                                href="/organizer/events/new"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Create Event
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🎪</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Events
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {events.length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Published
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {events.filter(e => e.status === 'published').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🎫</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Bookings
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {totalBookings}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Revenue
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            $AUD {totalRevenue.toFixed(2)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Events List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">My Events</h2>
                        <Link
                            href="/organizer/events/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Create New Event
                        </Link>
                    </div>

                    {eventsWithBookings.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🎪</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No events yet
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Create your first event to start accepting bookings!
                            </p>
                            <Link
                                href="/organizer/events/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Create Event
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {eventsWithBookings.map((event) => (
                                <div key={event.id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {event.title}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    <span>
                                                        {new Date(event.start_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📍</span>
                                                    <span>{event.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🎫</span>
                                                    <span>
                                                        {event.confirmedBookings} / {event.max_attendees || '∞'} booked
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">💰</span>
                                                    <span>$AUD {event.revenue.toFixed(2)} revenue</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-gray-900">
                                                    $AUD {event.price.toFixed(2)} per ticket
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    Created {new Date(event.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ml-6 flex-shrink-0 flex space-x-2">
                                            <Link
                                                href={`/organizer/events/${event.id}/bookings`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                View Bookings
                                            </Link>
                                            <Link
                                                href={`/organizer/events/${event.id}/pricing`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Manage Pricing
                                            </Link>
                                            <Link
                                                href={`/organizer/events/${event.id}/edit`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}