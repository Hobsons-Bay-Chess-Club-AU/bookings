import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(
    request: NextRequest, context: unknown) {
    const { params } = context as { params: { id: string } };
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: eventId } = params

        // Check if user is organizer of this event or admin
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single()

        if (eventError) {
            console.error('Error fetching event:', eventError)
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch participants for this event
        const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select(`
                *,
                bookings!inner (
                    id,
                    quantity,
                    total_amount,
                    status,
                    created_at,
                    user_id,
                    profiles!bookings_user_id_fkey (
                        full_name,
                        email
                    )
                ),
                section:event_sections!participants_section_id_fkey (
                    id,
                    title,
                    description
                )
            `)
            .eq('bookings.event_id', eventId)
            .order('created_at', { ascending: false })

        if (participantsError) {
            console.error('Error fetching participants:', participantsError)
            return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
        }

        return NextResponse.json(participants)
    } catch (error) {
        console.error('Error in /api/events/[id]/participants:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    context: unknown) {
    const { params } = context as { params: { id: string } };
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { participants, bookingId } = await request.json()

        if (!Array.isArray(participants) || !bookingId) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
        }

        // Verify booking belongs to current user
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('user_id, quantity, event_id')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        if (booking.user_id !== profile.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (booking.event_id !== params.id) {
            return NextResponse.json({ error: 'Event mismatch' }, { status: 400 })
        }

        if (participants.length > booking.quantity) {
            return NextResponse.json({
                error: `Cannot add ${participants.length} participants. Booking quantity is ${booking.quantity}`
            }, { status: 400 })
        }

        // Delete existing participants for this booking
        await supabase
            .from('participants')
            .delete()
            .eq('booking_id', bookingId)

        // Insert new participants
        const participantInserts = participants.map(participant => ({
            booking_id: bookingId,
            first_name: participant.first_name,
            last_name: participant.last_name,
            date_of_birth: participant.date_of_birth || null,
            contact_email: participant.contact_email || null,
            contact_phone: participant.contact_phone || null,
            gender: participant.gender || null,
            custom_data: participant.custom_data || {}
        }))

        const { data: insertedParticipants, error: insertError } = await supabase
            .from('participants')
            .insert(participantInserts)
            .select()

        if (insertError) {
            console.error('Error inserting participants:', insertError)
            return NextResponse.json({ error: 'Failed to save participants' }, { status: 500 })
        }

        return NextResponse.json(insertedParticipants)
    } catch (error) {
        console.error('Error in POST /api/events/[id]/participants:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}