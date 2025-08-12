import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await context.params
        const supabase = await createClient()

        // Fetch sections for the event
        const { data: sections, error } = await supabase
            .from('event_sections')
            .select(`
                *,
                pricing:section_pricing(*)
            `)
            .eq('event_id', eventId)
            .eq('status', 'published')
            .order('start_date', { ascending: true })

        if (error) {
            console.error('Error fetching sections:', error)
            return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
        }

        // Calculate available seats for each section
        const sectionsWithAvailability = sections?.map(section => ({
            ...section,
            available_seats: section.max_seats - section.current_seats
        }))

        return NextResponse.json(sectionsWithAvailability || [])
    } catch (error) {
        console.error('Error in sections GET:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await context.params
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
        const { title, description, start_date, end_date, max_seats, section_type, section_config, custom_form_fields } = body

        // Validate required fields
        if (!title || !start_date || !end_date || !max_seats) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create new section
        const { data: section, error } = await supabase
            .from('event_sections')
            .insert({
                event_id: eventId,
                title,
                description,
                start_date,
                end_date,
                max_seats,
                section_type,
                section_config: section_config || {},
                custom_form_fields: custom_form_fields || []
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating section:', error)
            return NextResponse.json({ error: 'Failed to create section' }, { status: 500 })
        }

        // Update event to mark it as having sections
        await supabase
            .from('events')
            .update({ has_sections: true })
            .eq('id', eventId)

        return NextResponse.json(section)
    } catch (error) {
        console.error('Error in sections POST:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}


