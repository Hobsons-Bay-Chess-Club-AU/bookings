import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { sendEmail } from '@/lib/email/service'
import { render } from '@react-email/render'
import React from 'react'
import BookingCancellationEmail from '@/lib/email/templates/booking-cancellation'

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile || !['admin', 'organizer'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { participant_id, reason } = await request.json()

        if (!participant_id) {
            return NextResponse.json(
                { error: 'Participant ID is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get participant details with booking and event info
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select(`
                *,
                booking:bookings(
                    *,
                    event:events!bookings_event_id_fkey(
                        id,
                        title,
                        organizer_id
                    ),
                    user:profiles!bookings_user_id_fkey(
                        id,
                        email,
                        full_name
                    )
                )
            `)
            .eq('id', participant_id)
            .single()

        if (participantError || !participant) {
            return NextResponse.json(
                { error: 'Participant not found' },
                { status: 404 }
            )
        }

        // Check if user is admin or organizer of this event
        if (profile.role !== 'admin' && participant.booking.event.organizer_id !== profile.id) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        // Start a transaction
        const { data: banEntry, error: banError } = await supabase.rpc('add_participant_to_ban_list', {
            p_first_name: participant.first_name,
            p_last_name: participant.last_name,
            p_date_of_birth: participant.date_of_birth,
            p_created_by: profile.id,
            p_notes: reason || `Banned by ${profile.role} from event: ${participant.booking.event.title}`
        })

        if (banError) {
            console.error('Error adding to ban list:', banError)
            return NextResponse.json(
                { error: 'Failed to add participant to ban list' },
                { status: 500 }
            )
        }

        // Cancel the booking
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', participant.booking.id)

        if (bookingError) {
            console.error('Error cancelling booking:', bookingError)
            return NextResponse.json(
                { error: 'Failed to cancel booking' },
                { status: 500 }
            )
        }

        // Send cancellation email to booker
        try {
            const emailHtml = await render(
                React.createElement(BookingCancellationEmail, {
                    eventTitle: participant.booking.event.title,
                    eventDate: participant.booking.event.start_date,
                    participantName: `${participant.first_name} ${participant.last_name}`,
                    bookingId: participant.booking.id,
                    reason: 'The organizer has cancelled this booking.'
                })
            )

            await sendEmail({
                to: participant.booking.user.email,
                subject: `Booking Cancelled - ${participant.booking.event.title}`,
                html: emailHtml
            })
        } catch (emailError) {
            console.error('Error sending cancellation email:', emailError)
            // Don't fail the entire operation if email fails
        }

        // Send cancellation email to participant if they have a different email
        if (participant.contact_email && participant.contact_email !== participant.booking.user.email) {
            try {
                const emailHtml = await render(
                    React.createElement(BookingCancellationEmail, {
                        eventTitle: participant.booking.event.title,
                        eventDate: participant.booking.event.start_date,
                        participantName: `${participant.first_name} ${participant.last_name}`,
                        bookingId: participant.booking.id,
                        reason: 'The organizer has cancelled this booking.'
                    })
                )

                await sendEmail({
                    to: participant.contact_email,
                    subject: `Booking Cancelled - ${participant.booking.event.title}`,
                    html: emailHtml
                })
            } catch (emailError) {
                console.error('Error sending cancellation email to participant:', emailError)
                // Don't fail the entire operation if email fails
            }
        }

        return NextResponse.json({
            success: true,
            banEntry,
            message: 'Participant banned and booking cancelled successfully'
        })

    } catch (error) {
        console.error('Error in ban-participant API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
