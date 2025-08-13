import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sectionId } = await context.params
        const profile = await getCurrentProfile()
        const supabase = await createClient()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { whitelist_enabled } = await request.json()

        if (typeof whitelist_enabled !== 'boolean') {
            return NextResponse.json({ error: 'whitelist_enabled must be a boolean' }, { status: 400 })
        }

        // Check if user is organizer of this section's event or admin
        const { data: section, error: sectionError } = await supabase
            .from('event_sections')
            .select(`
                *,
                events!inner(organizer_id)
            `)
            .eq('id', sectionId)
            .single()

        if (sectionError || !section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }

        if (section.events.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Update the section whitelist setting
        const { data: updatedSection, error: updateError } = await supabase
            .from('event_sections')
            .update({ 
                whitelist_enabled,
                updated_at: new Date().toISOString()
            })
            .eq('id', sectionId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating section whitelist setting:', updateError)
            return NextResponse.json({ error: 'Failed to update section whitelist setting' }, { status: 500 })
        }

        return NextResponse.json(updatedSection)
    } catch (error) {
        console.error('Error updating section whitelist setting:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
