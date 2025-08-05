import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { eventId } = await request.json()

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get current user to verify they can clone this event
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch the original event
        const { data: originalEvent, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('organizer_id', user.id)
            .single()

        if (eventError || !originalEvent) {
            return NextResponse.json(
                { error: 'Event not found or you do not have permission to clone it' },
                { status: 404 }
            )
        }

        // Generate alias for the new event
        let alias: string | null = null
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events/generate-alias`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const data = await response.json()
                alias = data.alias
            }
        } catch (error) {
            console.error('Error generating alias:', error)
        }

        // Create the cloned event
        const clonedEvent = {
            title: `Copy of ${originalEvent.title}`,
            description: originalEvent.description,
            start_date: originalEvent.start_date,
            end_date: originalEvent.end_date,
            entry_close_date: originalEvent.entry_close_date,
            location: originalEvent.location,
            price: originalEvent.price,
            max_attendees: originalEvent.max_attendees,
            image_url: originalEvent.image_url,
            organizer_name: originalEvent.organizer_name,
            organizer_email: originalEvent.organizer_email,
            organizer_phone: originalEvent.organizer_phone,
            status: 'draft' as const, // Always set to draft
            alias: alias,
            organizer_id: user.id,
            custom_form_fields: originalEvent.custom_form_fields,
            timeline: originalEvent.timeline,
            is_promoted: false, // Reset promotion status
            location_settings: originalEvent.location_settings,
            settings: originalEvent.settings
        }

        const { data: newEvent, error: insertError } = await supabase
            .from('events')
            .insert(clonedEvent)
            .select()
            .single()

        if (insertError) {
            console.error('Error cloning event:', insertError)
            return NextResponse.json(
                { error: 'Failed to clone event' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            eventId: newEvent.id,
            message: 'Event cloned successfully'
        })

    } catch (error) {
        console.error('Error in clone event:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 