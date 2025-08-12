import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string; sectionId: string }> }
) {
    try {
        const { id: eventId, sectionId } = await context.params
        const profile = await getCurrentProfile()
        const supabase = await createClient()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is organizer of this event or admin
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { title, description, start_date, end_date, max_seats, section_type, section_config, custom_form_fields, status } = body

        // Update the section
        const { data: section, error } = await supabase
            .from('event_sections')
            .update({
                title,
                description,
                start_date,
                end_date,
                max_seats,
                section_type,
                section_config: section_config || {},
                custom_form_fields: custom_form_fields || [],
                status
            })
            .eq('id', sectionId)
            .eq('event_id', eventId)
            .select()
            .single()

        if (error) {
            console.error('Error updating section:', error)
            return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
        }

        return NextResponse.json(section)
    } catch (error) {
        console.error('Error in section PUT:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string; sectionId: string }> }
) {
    try {
        const { id: eventId, sectionId } = await context.params
        const profile = await getCurrentProfile()
        const supabase = await createClient()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is organizer of this event or admin
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Check if section has any participants
        const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .eq('section_id', sectionId)
            .limit(1)

        if (participantsError) {
            console.error('Error checking participants:', participantsError)
            return NextResponse.json({ error: 'Failed to check section participants' }, { status: 500 })
        }

        if (participants && participants.length > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete section with participants. Please remove all participants first.' 
            }, { status: 400 })
        }

        // Delete the section
        const { error } = await supabase
            .from('event_sections')
            .delete()
            .eq('id', sectionId)
            .eq('event_id', eventId)

        if (error) {
            console.error('Error deleting section:', error)
            return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in section DELETE:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
