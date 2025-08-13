import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
    try {
        const { id: eventId, bookingId } = await params
        const user = await getCurrentUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin or organizer of this event
        const supabase = await createClient()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // If not admin, check if user is the organizer of this event
        if (profile.role !== 'admin') {
            const { data: event } = await supabase
                .from('events')
                .select('organizer_id')
                .eq('id', eventId)
                .single()

            if (!event || event.organizer_id !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        // Fetch booking with all related details
        // Support both UUID id and short booking_id in the [bookingId] path param
        const bookingQuery = supabase
            .from('bookings')
            .select(`
                *,
                event:events!bookings_event_id_fkey(*),
                user:profiles!bookings_user_id_fkey(*),
                participants(
                    *,
                    section:event_sections(*)
                ),
                discount_applications(
                    *,
                    discount:event_discounts(*)
                )
            `)
            .eq('event_id', eventId)
            .eq('id', bookingId)
            .single()

        let { data: booking, error } = await bookingQuery

        if (error || !booking) {
            // Fallback to booking_id (case-insensitive by uppercasing input)
            const code = bookingId.toUpperCase()
            const res = await supabase
                .from('bookings')
                .select(`
                    *,
                    event:events!bookings_event_id_fkey(*),
                    user:profiles!bookings_user_id_fkey(*),
                    participants(
                        *,
                        section:event_sections(*)
                    ),
                    discount_applications(
                        *,
                        discount:event_discounts(*)
                    )
                `)
                .eq('event_id', eventId)
                .eq('booking_id', code)
                .single()
            booking = res.data
            error = res.error
        }

        if (error || !booking) {
            console.error('Error fetching booking details:', error)
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        return NextResponse.json(booking)
    } catch (error) {
        console.error('Error in organizer booking details API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
