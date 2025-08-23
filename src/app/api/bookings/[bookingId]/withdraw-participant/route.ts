import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderParticipantWithdrawalEmail } from '@/lib/email/templates/participant-withdrawal'
import { renderOrganizerParticipantWithdrawalEmail } from '@/lib/email/templates/organizer-participant-withdrawal'
import { RefundTimelineItem } from '@/lib/types/database'

interface WithdrawParticipantRequest {
    participant_id: string
    reason?: string
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const resolvedParams = await params
        const supabase = await createClient()
        const { participant_id, reason }: WithdrawParticipantRequest = await request.json()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify booking belongs to user
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events!bookings_event_id_fkey(
                    id,
                    title,
                    start_date,
                    location,
                    timeline,
                    organizer_id,
                    organizer_name,
                    organizer_email,
                    organizer_phone
                )
            `)
            .eq('id', resolvedParams.bookingId)
            .eq('user_id', user.id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // Get participant details
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', participant_id)
            .eq('booking_id', resolvedParams.bookingId)
            .single()

        if (participantError || !participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        if (participant.status === 'cancelled') {
            return NextResponse.json({ error: 'Participant already cancelled' }, { status: 400 })
        }

        // Calculate refund amount based on event timeline
        let refundAmount = 0
        let refundPercentage = 0
        
        if (booking.event?.timeline?.refund && participant.price_paid) {
            const now = new Date()
            const refundTimeline = booking.event.timeline.refund
                .sort((a: RefundTimelineItem, b: RefundTimelineItem) => {
                    const aDate = a.from_date ? new Date(a.from_date).getTime() : 0
                    const bDate = b.from_date ? new Date(b.from_date).getTime() : 0
                    return aDate - bDate
                })

            // Find applicable refund rate
            for (const item of refundTimeline) {
                const fromDate = item.from_date ? new Date(item.from_date) : new Date(booking.created_at)
                const toDate = item.to_date ? new Date(item.to_date) : new Date(booking.event.start_date)

                if (now >= fromDate && now <= toDate) {
                    if (item.type === 'percentage') {
                        refundPercentage = item.value
                        refundAmount = (participant.price_paid * item.value) / 100
                    } else {
                        refundAmount = Math.min(item.value, participant.price_paid)
                        refundPercentage = (refundAmount / participant.price_paid) * 100
                    }
                    break
                }
            }
        }

        // Use database function to handle withdrawal
        const { data: withdrawalResult, error: withdrawalError } = await supabase
            .rpc('withdraw_participant', {
                participant_id_param: participant_id,
                reason_param: reason,
                performed_by_param: user.id
            })

        if (withdrawalError || !withdrawalResult?.success) {
            return NextResponse.json({ 
                error: withdrawalResult?.error || withdrawalError?.message || 'Failed to withdraw participant' 
            }, { status: 400 })
        }

        // Get updated participant list for email
        const { data: remainingParticipants } = await supabase
            .from('participants')
            .select('first_name, last_name')
            .eq('booking_id', resolvedParams.bookingId)
            .neq('status', 'cancelled')

        // Get user profile for email
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

        // Send email to booker
        const { html: bookerHtml } = await renderParticipantWithdrawalEmail({
            bookingId: booking.booking_id || booking.id,
            eventName: booking.event!.title,
            eventDate: booking.event!.start_date,
            eventLocation: booking.event!.location,
            participantName: `${participant.first_name} ${participant.last_name}`,
            withdrawnBy: 'user',
            reason: reason || undefined,
            refundAmount: refundAmount > 0 ? refundAmount : undefined,
            refundPercentage: refundPercentage > 0 ? refundPercentage : undefined,
            bookingCancelled: withdrawalResult.booking_cancelled,
            remainingParticipants: remainingParticipants && remainingParticipants.length > 0 ? remainingParticipants : undefined,
            organizerName: booking.event!.organizer_name || 'Event Organizer',
            organizerEmail: booking.event!.organizer_email || '',
            organizerPhone: booking.event!.organizer_phone || undefined,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        })

        await sendEmail({
            to: userProfile?.email || user.email!,
            subject: withdrawalResult.booking_cancelled 
                ? `Booking Cancelled: ${booking.event!.title}`
                : `Participant Withdrawn: ${booking.event!.title}`,
            html: bookerHtml
        })

        // Send email to organizer
        const { html: organizerHtml } = await renderOrganizerParticipantWithdrawalEmail({
            bookingId: booking.booking_id || booking.id,
            eventName: booking.event!.title,
            eventDate: booking.event!.start_date,
            eventLocation: booking.event!.location,
            participantName: `${participant.first_name} ${participant.last_name}`,
            withdrawnBy: 'user',
            reason: reason || undefined,
            refundAmount: refundAmount > 0 ? refundAmount : undefined,
            refundPercentage: refundPercentage > 0 ? refundPercentage : undefined,
            bookingCancelled: withdrawalResult.booking_cancelled,
            bookerName: userProfile?.full_name || user.email!,
            bookerEmail: userProfile?.email || user.email!,
            remainingParticipants: remainingParticipants && remainingParticipants.length > 0 ? remainingParticipants : undefined,
            managementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${booking.event!.id}/participants`
        })

        if (booking.event!.organizer_email) {
            await sendEmail({
                to: booking.event!.organizer_email,
                subject: withdrawalResult.booking_cancelled
                    ? `Booking Cancelled: ${booking.event!.title}`
                    : `Participant Withdrawn: ${booking.event!.title}`,
                html: organizerHtml
            })
        }

        // Process refund if applicable
        if (refundAmount > 0 && booking.stripe_payment_intent_id) {
            // TODO: Implement Stripe refund processing
            console.log('Refund needed:', { refundAmount, paymentIntentId: booking.stripe_payment_intent_id })
        }

        return NextResponse.json({
            success: true,
            message: withdrawalResult.booking_cancelled 
                ? 'Participant withdrawn and booking cancelled'
                : 'Participant withdrawn successfully',
            booking_cancelled: withdrawalResult.booking_cancelled,
            remaining_participants: withdrawalResult.remaining_participants,
            refund_amount: refundAmount,
            refund_percentage: refundPercentage
        })

    } catch (error) {
        console.error('Error withdrawing participant:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
