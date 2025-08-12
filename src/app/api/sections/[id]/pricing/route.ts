import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sectionId } = await context.params
        const supabase = await createClient()

        // Fetch pricing for the section
        const { data: pricing, error } = await supabase
            .from('section_pricing')
            .select('*')
            .eq('section_id', sectionId)
            .eq('is_active', true)
            .order('price', { ascending: true })

        if (error) {
            console.error('Error fetching section pricing:', error)
            return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
        }

        // Calculate available tickets for each pricing tier
        const pricingWithAvailability = pricing?.map(price => ({
            ...price,
            available_tickets: price.max_tickets ? price.max_tickets - price.tickets_sold : null
        }))

        return NextResponse.json(pricingWithAvailability || [])
    } catch (error) {
        console.error('Error in section pricing GET:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
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

        const body = await request.json()
        const { 
            name, 
            description, 
            pricing_type, 
            membership_type, 
            price, 
            start_date, 
            end_date, 
            max_tickets 
        } = body

        // Validate required fields
        if (!name || !price || !start_date || !end_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create new pricing option
        const { data: pricing, error } = await supabase
            .from('section_pricing')
            .insert({
                section_id: sectionId,
                name,
                description,
                pricing_type: pricing_type || 'regular',
                membership_type: membership_type || 'all',
                price,
                start_date,
                end_date,
                max_tickets,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating section pricing:', error)
            return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 })
        }

        return NextResponse.json(pricing)
    } catch (error) {
        console.error('Error in section pricing POST:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
