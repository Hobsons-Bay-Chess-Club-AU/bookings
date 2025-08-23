import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
    try {
        const { id: eventId, bookingId } = await params
        const supabase = await createClient()

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user is the organizer of this event
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.organizer_id !== user.id) {
            return NextResponse.json(
                { error: 'Unauthorized - not the event organizer' },
                { status: 403 }
            )
        }

        // Get the booking to verify it's pending approval
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                user:profiles!bookings_user_id_fkey(email, full_name),
                pricing:event_pricing(name, pricing_type)
            `)
            .eq('id', bookingId)
            .eq('event_id', eventId)
            .eq('status', 'pending_approval')
            .single()

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Booking not found or not pending approval' },
                { status: 404 }
            )
        }

        // Update booking status to confirmed
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
                status: 'confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('Error updating booking status:', updateError)
            return NextResponse.json(
                { error: 'Failed to update booking status' },
                { status: 500 }
            )
        }

        // Update participant status from pending_approval to active
        const { error: participantUpdateError } = await supabase
            .from('participants')
            .update({ 
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('booking_id', bookingId)
            .eq('status', 'pending_approval')

        if (participantUpdateError) {
            console.error('Error updating participant status:', participantUpdateError)
            // Don't fail the approval if participant update fails, but log it
        }

        // Send approval email to the user
        try {
            const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/conditional-free-approved`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: bookingId,
                    userEmail: booking.user?.email,
                    userName: booking.user?.full_name,
                    eventTitle: booking.event_title || 'Event'
                })
            })

            if (!emailResponse.ok) {
                console.error('Failed to send approval email:', await emailResponse.text())
            }
        } catch (emailError) {
            console.error('Error sending approval email:', emailError)
            // Don't fail the approval if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Conditional free entry approved successfully'
        })

    } catch (error) {
        console.error('Error approving conditional free entry:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
