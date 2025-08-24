import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderParticipantDataChangeEmail } from '@/lib/email/templates/participant-data-change'

interface EditParticipantRequest {
    first_name?: string
    last_name?: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
    external_verify?: boolean
    notify_booker?: boolean
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; participantId: string }> }
) {
    try {
        const resolvedParams = await params
        const supabase = await createClient()
        const { notify_booker = true, ...updateData }: EditParticipantRequest = await request.json()

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
            return NextResponse.json({ error: 'Cannot edit cancelled participant' }, { status: 400 })
        }

        // Verify participant belongs to the event
        if (participant.booking?.event_id !== resolvedParams.id) {
            return NextResponse.json({ error: 'Participant does not belong to this event' }, { status: 400 })
        }

        // Store original data for email comparison
        const originalData = {
            first_name: participant.first_name,
            last_name: participant.last_name,
            date_of_birth: participant.date_of_birth,
            contact_email: participant.contact_email,
            contact_phone: participant.contact_phone,
            custom_data: participant.custom_data,
            external_verify: participant.external_verify
        }

        // Prepare update data (only include fields that are provided)
        const updateFields: Record<string, unknown> = {}
        
        if (updateData.first_name !== undefined) updateFields.first_name = updateData.first_name
        if (updateData.last_name !== undefined) updateFields.last_name = updateData.last_name
        if (updateData.date_of_birth !== undefined) updateFields.date_of_birth = updateData.date_of_birth
        if (updateData.contact_email !== undefined) updateFields.contact_email = updateData.contact_email
        if (updateData.contact_phone !== undefined) updateFields.contact_phone = updateData.contact_phone
        if (updateData.custom_data !== undefined) updateFields.custom_data = updateData.custom_data
        if (updateData.external_verify !== undefined) updateFields.external_verify = updateData.external_verify

        // Update participant
        const { data: updatedParticipant, error: updateError } = await supabase
            .from('participants')
            .update(updateFields)
            .eq('id', resolvedParams.participantId)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update participant' }, { status: 400 })
        }

        // Record audit trail
        await supabase
            .from('booking_audit')
            .insert({
                booking_id: participant.booking_id,
                action: 'participant_edit',
                performed_by: user.id,
                details: {
                    participant_id: resolvedParams.participantId,
                    original_data: originalData,
                    updated_data: updateFields,
                    event_id: resolvedParams.id
                }
            })

        // Send email notification to booker if requested
        if (notify_booker && participant.booking?.user?.email) {
            // Determine what fields changed (excluding external_verify as it's internal organizer tracking)
            const changedFields: string[] = []
            if (updateData.first_name !== undefined && updateData.first_name !== originalData.first_name) {
                changedFields.push('First Name')
            }
            if (updateData.last_name !== undefined && updateData.last_name !== originalData.last_name) {
                changedFields.push('Last Name')
            }
            if (updateData.date_of_birth !== undefined && updateData.date_of_birth !== originalData.date_of_birth) {
                changedFields.push('Date of Birth')
            }
            if (updateData.contact_email !== undefined && updateData.contact_email !== originalData.contact_email) {
                changedFields.push('Contact Email')
            }
            if (updateData.contact_phone !== undefined && updateData.contact_phone !== originalData.contact_phone) {
                changedFields.push('Contact Phone')
            }
            if (updateData.custom_data !== undefined) {
                changedFields.push('Additional Information')
            }

            // Only send email if there are actual changes to participant data (not just external_verify)
            if (changedFields.length > 0) {
                // Debug logging to identify empty event title issue
                console.log('Debug - Email data:', {
                    eventTitle: event.title,
                    eventName: event.title,
                    eventId: event.id,
                    participantName: `${updatedParticipant.first_name} ${updatedParticipant.last_name}`,
                    changedFields
                })

                const { html: bookerHtml } = await renderParticipantDataChangeEmail({
                    bookingId: participant.booking.booking_id || participant.booking.id,
                    eventName: event.title || 'Event',
                    eventDate: event.start_date,
                    eventLocation: event.location || 'Location TBD',
                    participantName: `${updatedParticipant.first_name} ${updatedParticipant.last_name}`,
                    changedFields,
                    organizerName: event.organizer_name || 'Event Organizer',
                    organizerEmail: event.organizer_email || '',
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                })

                await sendEmail({
                    to: participant.booking.user.email,
                    subject: `Participant Details Updated: ${event.title || 'Event'}`,
                    html: bookerHtml
                })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Participant updated successfully',
            participant: updatedParticipant,
            emails_sent: notify_booker
        })

    } catch (error) {
        console.error('Error updating participant (organizer):', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
