import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderParticipantWithdrawalEmail } from '@/lib/email/templates/participant-withdrawal'
import { renderOrganizerParticipantWithdrawalEmail } from '@/lib/email/templates/organizer-participant-withdrawal'
import { RefundTimelineItem } from '@/lib/types/database'

interface WithdrawParticipantRequest {
    reason?: string
    notify_booker?: boolean
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; participantId: string }> }
) {
    try {
        const resolvedParams = await params
        const supabase = await createClient()
        const { reason, notify_booker = true }: WithdrawParticipantRequest = await request.json()

        // Get current user and verify organizer role
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'organizer'].includes(profile.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        // Get event and verify organizer ownership (unless admin)
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', resolvedParams.id)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (profile.role === 'organizer' && event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
        }

        // Get participant with booking details
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select(`
                *,
                booking:bookings!participants_booking_id_fkey(
                    *,
                    user:profiles!bookings_user_id_fkey(id, full_name, email)
                )
            `)
            .eq('id', resolvedParams.participantId)
            .single()

        if (participantError || !participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        if (participant.status === 'cancelled') {
            return NextResponse.json({ error: 'Participant already cancelled' }, { status: 400 })
        }

        // Verify participant belongs to the event
        if (participant.booking?.event_id !== resolvedParams.id) {
            return NextResponse.json({ error: 'Participant does not belong to this event' }, { status: 400 })
        }

        // Calculate refund amount based on event timeline
        let refundAmount = 0
        let refundPercentage = 0
        
        if (event.timeline?.refund && participant.price_paid) {
            const now = new Date()
            const refundTimeline = event.timeline.refund
                .sort((a: RefundTimelineItem, b: RefundTimelineItem) => {
                    const aDate = a.from_date ? new Date(a.from_date).getTime() : 0
                    const bDate = b.from_date ? new Date(b.from_date).getTime() : 0
                    return aDate - bDate
                })

            // Find applicable refund rate
            for (const item of refundTimeline) {
                const fromDate = item.from_date ? new Date(item.from_date) : new Date(participant.booking.created_at)
                const toDate = item.to_date ? new Date(item.to_date) : new Date(event.start_date)

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
                participant_id_param: resolvedParams.participantId,
                reason_param: reason,
                performed_by_param: user.id
            })

        if (withdrawalError || !withdrawalResult?.success) {
            return NextResponse.json({ 
                error: withdrawalResult?.error || 'Failed to withdraw participant' 
            }, { status: 400 })
        }

        // Get updated participant list for email
        const { data: remainingParticipants } = await supabase
            .from('participants')
            .select('first_name, last_name')
            .eq('booking_id', participant.booking_id)
            .neq('status', 'cancelled')

        // Get organizer profile
        const { data: organizerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        // Send email to booker if requested
        if (notify_booker && participant.booking?.user?.email) {
            const { html: bookerHtml } = await renderParticipantWithdrawalEmail({
                bookingId: participant.booking.booking_id || participant.booking.id,
                eventName: event.title,
                eventDate: event.start_date,
                eventLocation: event.location,
                participantName: `${participant.first_name} ${participant.last_name}`,
                withdrawnBy: 'organizer',
                reason: reason || undefined,
                refundAmount: refundAmount > 0 ? refundAmount : undefined,
                refundPercentage: refundPercentage > 0 ? refundPercentage : undefined,
                bookingCancelled: withdrawalResult.booking_cancelled,
                remainingParticipants: remainingParticipants && remainingParticipants.length > 0 ? remainingParticipants : undefined,
                organizerName: event.organizer_name || organizerProfile?.full_name || 'Event Organizer',
                organizerEmail: event.organizer_email || '',
                organizerPhone: event.organizer_phone || undefined,
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            })

            await sendEmail({
                to: participant.booking.user.email,
                subject: withdrawalResult.booking_cancelled 
                    ? `Booking Cancelled: ${event.title}`
                    : `Participant Withdrawn: ${event.title}`,
                html: bookerHtml
            })
        }

        // Send confirmation email to organizer
        const { html: organizerHtml } = await renderOrganizerParticipantWithdrawalEmail({
            bookingId: participant.booking.booking_id || participant.booking.id,
            eventName: event.title,
            eventDate: event.start_date,
            eventLocation: event.location,
            participantName: `${participant.first_name} ${participant.last_name}`,
            withdrawnBy: 'organizer',
            reason: reason || undefined,
            refundAmount: refundAmount > 0 ? refundAmount : undefined,
            refundPercentage: refundPercentage > 0 ? refundPercentage : undefined,
            bookingCancelled: withdrawalResult.booking_cancelled,
            bookerName: participant.booking.user?.full_name || participant.booking.user?.email || 'Unknown',
            bookerEmail: participant.booking.user?.email || '',
            remainingParticipants: remainingParticipants && remainingParticipants.length > 0 ? remainingParticipants : undefined,
            managementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${resolvedParams.id}/participants`
        })

        // Send to organizer's email (might be different from logged in user if admin performed action)
        const organizerEmail = event.organizer_email || user.email
        if (organizerEmail) {
            await sendEmail({
                to: organizerEmail,
                subject: `Withdrawal Processed: ${event.title}`,
                html: organizerHtml
            })
        }

        // Process refund if applicable
        if (refundAmount > 0 && participant.booking?.stripe_payment_intent_id) {
            // TODO: Implement Stripe refund processing
            console.log('Refund needed:', { 
                refundAmount, 
                paymentIntentId: participant.booking.stripe_payment_intent_id,
                withdrawnByOrganizer: true
            })
        }

        return NextResponse.json({
            success: true,
            message: withdrawalResult.booking_cancelled 
                ? 'Participant withdrawn and booking cancelled'
                : 'Participant withdrawn successfully',
            booking_cancelled: withdrawalResult.booking_cancelled,
            remaining_participants: withdrawalResult.remaining_participants,
            refund_amount: refundAmount,
            refund_percentage: refundPercentage,
            emails_sent: notify_booker
        })

    } catch (error) {
        console.error('Error withdrawing participant (organizer):', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}