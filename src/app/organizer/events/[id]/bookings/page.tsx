import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect, notFound } from 'next/navigation'
import { Event, Booking, Profile } from '@/lib/types/database'
import EventBookingsPageClient from './page-client'

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
        <EventBookingsPageClient event={event} bookings={bookings} />
    )
}