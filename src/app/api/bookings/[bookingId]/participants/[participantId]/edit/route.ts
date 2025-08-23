import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderParticipantDataChangeEmail } from '@/lib/email/templates/participant-data-change'
import { FormField } from '@/lib/types/database'

interface EditParticipantRequest {
    first_name?: string
    last_name?: string
    contact_email?: string
    contact_phone?: string
    date_of_birth?: string
    custom_data?: Record<string, unknown>
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string; participantId: string }> }
) {
    try {
        const resolvedParams = await params
        const supabase = await createClient()
        const updateData: EditParticipantRequest = await request.json()

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
                event:events(
                    id,
                    title,
                    start_date,
                    organizer_id,
                    organizer_name,
                    organizer_email,
                    custom_form_fields
                )
            `)
            .eq('id', resolvedParams.bookingId)
            .eq('user_id', user.id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // Check if booking can be modified (only confirmed/verified bookings)
        if (!['confirmed', 'verified'].includes(booking.status)) {
            return NextResponse.json({ 
                error: 'Booking cannot be modified in its current status' 
            }, { status: 400 })
        }

        // Get current participant data
        const { data: currentParticipant, error: participantError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', resolvedParams.participantId)
            .eq('booking_id', resolvedParams.bookingId)
            .single()

        if (participantError || !currentParticipant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Check if participant is active
        if (currentParticipant.status === 'cancelled') {
            return NextResponse.json({ 
                error: 'Cannot modify cancelled participant' 
            }, { status: 400 })
        }

        // Validate required fields
        const firstName = updateData.first_name ?? currentParticipant.first_name
        const lastName = updateData.last_name ?? currentParticipant.last_name

        if (!firstName || !lastName) {
            return NextResponse.json({ 
                error: 'First name and last name are required' 
            }, { status: 400 })
        }

        // Track changes for notification email
        const changes: Array<{
            field: string
            oldValue: string
            newValue: string
        }> = []

        // Check for changes in basic fields
        const fieldMappings = {
            first_name: 'First Name',
            last_name: 'Last Name',
            contact_email: 'Contact Email',
            contact_phone: 'Contact Phone',
            date_of_birth: 'Date of Birth'
        }

        Object.entries(fieldMappings).forEach(([field, label]) => {
            const oldValue = currentParticipant[field as keyof typeof currentParticipant] as string || ''
            const newValue = updateData[field as keyof EditParticipantRequest] as string || oldValue

            if (oldValue !== newValue) {
                changes.push({
                    field: label,
                    oldValue,
                    newValue
                })
            }
        })

        // Check for custom data changes
        if (updateData.custom_data && booking.event?.custom_form_fields) {
            const oldCustomData = currentParticipant.custom_data || {}
            const newCustomData = updateData.custom_data

            booking.event.custom_form_fields.forEach((field: FormField) => {
                const oldValue = String(oldCustomData[field.name] || '')
                const newValue = String(newCustomData[field.name] || '')

                if (oldValue !== newValue) {
                    changes.push({
                        field: field.label,
                        oldValue,
                        newValue
                    })
                }
            })
        }

        // If no changes, return early
        if (changes.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No changes detected',
                participant: currentParticipant
            })
        }

        // Prepare update data
        const finalUpdateData: Partial<EditParticipantRequest> & { updated_at?: string } = {
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
        }

        // Only include changed fields
        if (updateData.contact_email !== undefined) {
            finalUpdateData.contact_email = updateData.contact_email
        }
        if (updateData.contact_phone !== undefined) {
            finalUpdateData.contact_phone = updateData.contact_phone
        }
        if (updateData.date_of_birth !== undefined) {
            finalUpdateData.date_of_birth = updateData.date_of_birth
        }
        if (updateData.custom_data !== undefined) {
            finalUpdateData.custom_data = updateData.custom_data
        }

        // Update participant
        const { data: updatedParticipant, error: updateError } = await supabase
            .from('participants')
            .update(finalUpdateData)
            .eq('id', resolvedParams.participantId)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ 
                error: 'Failed to update participant' 
            }, { status: 500 })
        }

        // Get user profile for notification
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

        // Send notification to organizer if there are changes
        if (changes.length > 0 && booking.event?.organizer_email) {
            const { html } = await renderParticipantDataChangeEmail({
                bookingId: booking.booking_id || booking.id,
                eventName: booking.event.title,
                eventDate: booking.event.start_date,
                eventLocation: booking.event.location,
                participantName: `${firstName} ${lastName}`,
                changedFields: changes.map(c => c.field),
                organizerName: booking.event.organizer_name || 'Event Organizer',
                organizerEmail: booking.event.organizer_email,
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${booking.event_id}/participants`
            })

            await sendEmail({
                to: booking.event.organizer_email,
                subject: `Participant Information Updated: ${booking.event.title}`,
                html
            })
        }

        // Create audit record
        await supabase
            .from('booking_audit')
            .insert({
                booking_id: resolvedParams.bookingId,
                event_id: booking.event_id,
                action: 'modification',
                reason: 'Participant data updated',
                notes: `Updated fields: ${changes.map(c => c.field).join(', ')}`,
                performed_by: user.id,
                performed_at: new Date().toISOString()
            })

        return NextResponse.json({
            success: true,
            message: 'Participant updated successfully',
            participant: updatedParticipant,
            changes_made: changes.length,
            organizer_notified: !!booking.event?.organizer_email
        })

    } catch (error) {
        console.error('Error updating participant:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
