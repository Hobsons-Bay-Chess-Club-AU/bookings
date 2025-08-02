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
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events(*),
                user:profiles(*),
                participants(*)
            `)
            .eq('id', bookingId)
            .eq('event_id', eventId)
            .single()

        if (error) {
            console.error('Error fetching booking details:', error)
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        return NextResponse.json(booking)
    } catch (error) {
        console.error('Error in organizer booking details API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
