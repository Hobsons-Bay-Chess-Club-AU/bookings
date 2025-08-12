import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { sendEmail } from '@/lib/email/service'
import { render } from '@react-email/render'
import React from 'react'
import ParticipantTransferNotification from '@/lib/email/templates/participant-transfer-notification'

export async function POST(
    request: NextRequest,
    context: unknown
) {
    const { params } = context as { params: { id: string } }
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: eventId } = params
        const { participantId, newSectionId } = await request.json()

        if (!participantId || !newSectionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if user is organizer of this event or admin
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id, title')
            .eq('id', eventId)
            .single()

        if (eventError) {
            console.error('Error fetching event:', eventError)
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get participant with booking and section info
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select(`
                *,
                bookings!inner (
                    id,
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
            .eq('id', participantId)
            .eq('bookings.event_id', eventId)
            .single()

        if (participantError || !participant) {
            console.error('Error fetching participant:', participantError)
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Get new section info
        const { data: newSection, error: sectionError } = await supabase
            .from('event_sections')
            .select('id, title, description')
            .eq('id', newSectionId)
            .eq('event_id', eventId)
            .single()

        if (sectionError || !newSection) {
            console.error('Error fetching new section:', sectionError)
            return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }

        // Update participant's section
        const { error: updateError } = await supabase
            .from('participants')
            .update({ section_id: newSectionId })
            .eq('id', participantId)

        if (updateError) {
            console.error('Error updating participant section:', updateError)
            return NextResponse.json({ error: 'Failed to transfer participant' }, { status: 500 })
        }

        // Send email notification to the booker
        try {
            const oldSectionName = participant.section?.title || 'No section assigned'
            const newSectionName = newSection.title

            // Render the email template to HTML
            const emailHtml = await render(
                React.createElement(ParticipantTransferNotification, {
                    bookerName: participant.bookings.profiles.full_name || 'there',
                    participantName: `${participant.first_name} ${participant.last_name}`,
                    eventTitle: event.title,
                    oldSection: oldSectionName,
                    newSection: newSectionName,
                    eventId: eventId,
                    organizerName: profile.full_name || 'Event Organizer'
                })
            )

            await sendEmail({
                to: participant.bookings.profiles.email,
                subject: `Participant Transfer Confirmation - ${event.title}`,
                html: emailHtml
            })

            console.log('✅ [PARTICIPANT-TRANSFER] Email notification sent successfully')
        } catch (emailError) {
            console.error('❌ [PARTICIPANT-TRANSFER] Failed to send email notification:', emailError)
            // Don't fail the transfer if email fails
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Participant transferred successfully',
            oldSection: participant.section?.title || 'No section assigned',
            newSection: newSection.title
        })
    } catch (error) {
        console.error('Error in /api/events/[id]/participants/transfer:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
