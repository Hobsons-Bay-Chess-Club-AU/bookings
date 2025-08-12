import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string; pricingId: string }> }
) {
    try {
        const { id: sectionId, pricingId } = await context.params
        const profile = await getCurrentProfile()
        const supabase = await createClient()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Check if pricing option exists and belongs to this section
        const { data: pricing, error: pricingError } = await supabase
            .from('section_pricing')
            .select('*')
            .eq('id', pricingId)
            .eq('section_id', sectionId)
            .single()

        if (pricingError || !pricing) {
            return NextResponse.json({ error: 'Pricing option not found' }, { status: 404 })
        }

        // Check if pricing option has any tickets sold
        if (pricing.tickets_sold > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete pricing option with sold tickets. Consider deactivating instead.' 
            }, { status: 400 })
        }

        // Delete the pricing option
        const { error: deleteError } = await supabase
            .from('section_pricing')
            .delete()
            .eq('id', pricingId)
            .eq('section_id', sectionId)

        if (deleteError) {
            console.error('Error deleting section pricing:', deleteError)
            return NextResponse.json({ error: 'Failed to delete pricing' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in section pricing DELETE:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
