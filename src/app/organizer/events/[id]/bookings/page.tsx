import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Event, Booking, Profile } from '@/lib/types/database'
import HtmlContent from '@/components/ui/html-content'
import EventBookingsClient from '@/components/organizer/event-bookings-client'

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
                                href={`/organizer/events/${event.id}/participants`}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                👥 View Participants
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
                <EventBookingsClient event={event} bookings={bookings} />
            </div>
        </div>
    )
}