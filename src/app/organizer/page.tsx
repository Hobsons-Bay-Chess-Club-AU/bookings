import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Event, Booking } from '@/lib/types/database'
import OrganizerEventsClient from '@/components/organizer/organizer-events-client'

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
                confirmedBookings: bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length,
                revenue: bookings
                    .filter(b => b.status === 'confirmed' || b.status === 'verified')
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
                                href="/organizer/html-to-markdown"
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                HTML to Markdown
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

            <OrganizerEventsClient
                events={eventsWithBookings}
                totalRevenue={totalRevenue}
                totalBookings={totalBookings}
            />
        </div>
    )
}