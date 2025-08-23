import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function PATCH(
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

        const body = await request.json()
        const { status } = body

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'refunded', 'verified', 'whitelisted']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Update booking status
        const { data: updatedBooking, error } = await supabase
            .from('bookings')
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .eq('event_id', eventId)
            .select()
            .single()

        if (error) {
            console.error('Error updating booking status:', error)
            return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
        }

        // Handle attendee count updates based on status change
        if (status === 'cancelled') {
            // Get current event data and decrease attendees
            const { data: event } = await supabase
                .from('events')
                .select('current_attendees')
                .eq('id', eventId)
                .single()

            if (event && updatedBooking) {
                const newCount = Math.max(0, event.current_attendees - updatedBooking.quantity)
                await supabase
                    .from('events')
                    .update({ current_attendees: newCount })
                    .eq('id', eventId)
            }
        } else if (status === 'confirmed' || status === 'verified') {
            // If confirming a booking, increase attendee count
            const { data: event } = await supabase
                .from('events')
                .select('current_attendees')
                .eq('id', eventId)
                .single()

            if (event && updatedBooking) {
                const newCount = event.current_attendees + updatedBooking.quantity
                await supabase
                    .from('events')
                    .update({ current_attendees: newCount })
                    .eq('id', eventId)
            }
            // If previously whitelisted or pending_approval, set participants to active
            await supabase
                .from('participants')
                .update({ status: 'active' })
                .eq('booking_id', bookingId)
                .in('status', ['whitelisted', 'pending_approval'])
        }

        return NextResponse.json({ message: 'Booking status updated successfully', booking: updatedBooking })
    } catch (error) {
        console.error('Error in booking status update API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
