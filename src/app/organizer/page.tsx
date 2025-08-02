import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { Event, Booking } from '@/lib/types/database'
import OrganizerPageClient from '@/app/organizer/page-client'

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

    const totalRevenue = eventsWithBookings.reduce((sum, event) => sum + event.revenue, 0)
    const totalBookings = eventsWithBookings.reduce((sum, event) => sum + event.confirmedBookings, 0)

    return (
        <OrganizerPageClient
            events={eventsWithBookings}
            totalRevenue={totalRevenue}
            totalBookings={totalBookings}
        />
    )
}