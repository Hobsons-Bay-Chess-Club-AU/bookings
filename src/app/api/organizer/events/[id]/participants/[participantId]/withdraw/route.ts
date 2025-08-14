import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { sendParticipantWithdrawalNotification } from '@/lib/email/user-notifications'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; participantId: string }> }
) {
    try {
        const { id: eventId, participantId } = await params
        const user = await getCurrentUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin or organizer of this event
        const supabase = await createClient()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
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
        const { message } = body

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Withdrawal message is required' }, { status: 400 })
        }

        // Get participant details before updating
        const { data: participantData, error: participantError } = await supabase
            .from('participants')
            .select(`
                *,
                bookings!inner (
                    id,
                    status,
                    user_id,
                    event_id,
                    profiles!bookings_user_id_fkey (
                        full_name,
                        email
                    )
                )
            `)
            .eq('id', participantId)
            .eq('bookings.event_id', eventId)
            .single()

        if (participantError || !participantData) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Get event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('title, start_date, location')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Update participant status to cancelled
        const { data: updatedParticipant, error: updateError } = await supabase
            .from('participants')
            .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', participantId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating participant status:', updateError)
            return NextResponse.json({ error: 'Failed to withdraw participant' }, { status: 500 })
        }

        // Send notification emails
        try {
            const bookerEmail = participantData.bookings.profiles.email
            const participantEmail = participantData.contact_email || participantData.email
            const participantName = `${participantData.first_name} ${participantData.last_name}`
            const bookerName = participantData.bookings.profiles.full_name || 'Participant'
            const adminName = profile.full_name || 'Administrator'

            // Send to booker (always)
            if (bookerEmail) {
                await sendParticipantWithdrawalNotification({
                    recipientEmail: bookerEmail,
                    recipientName: bookerName,
                    participantName,
                    eventTitle: event.title,
                    eventDate: event.start_date,
                    eventLocation: event.location,
                    withdrawalMessage: message,
                    adminName,
                    eventId
                })
            }

            // Send to participant if they have a different email
            if (participantEmail && participantEmail !== bookerEmail) {
                await sendParticipantWithdrawalNotification({
                    recipientEmail: participantEmail,
                    recipientName: participantName,
                    participantName,
                    eventTitle: event.title,
                    eventDate: event.start_date,
                    eventLocation: event.location,
                    withdrawalMessage: message,
                    adminName,
                    eventId
                })
            }
        } catch (emailError) {
            console.error('Error sending withdrawal notification email:', emailError)
            // Don't fail the request if email fails
        }

        return NextResponse.json({ 
            success: true, 
            participant: updatedParticipant,
            message: 'Participant withdrawn successfully'
        })

    } catch (error) {
        console.error('Error in participant withdrawal:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
