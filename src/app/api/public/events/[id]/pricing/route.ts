import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { MembershipType } from '@/lib/types/database'
import { createCachedResponse, getCachePresets } from '@/lib/utils/cache'

interface RouteParams {
    params: Promise<{ id: string }>
}

// Get current pricing for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const url = new URL(request.url)
        const membershipType = url.searchParams.get('membership_type') as MembershipType || 'all'
        
        console.log('🔍 [PRICING-API] Fetching pricing for event:', id, 'membership type:', membershipType)
        
        const supabase = await createClient()

        // Call the database function to get current pricing
        console.log('🔍 [PRICING-API] Calling database function get_current_event_pricing')
        const { data: pricing, error } = await supabase
            .rpc('get_current_event_pricing', {
                p_event_id: id,
                p_membership_type: membershipType,
                p_booking_date: new Date().toISOString()
            })

        console.log('🔍 [PRICING-API] Database response - error:', error, 'pricing count:', pricing?.length || 0)

        if (error) {
            console.error('Error fetching current pricing:', error)
            return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
        }

        console.log('🔍 [PRICING-API] Returning pricing data')
        return createCachedResponse(pricing || [], getCachePresets().DYNAMIC)
    } catch (error) {
        console.error('Error in /api/events/[id]/pricing GET:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Create new pricing tier (organizers only)
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const profile = await getCurrentProfile()

        if (!profile || !['admin', 'organizer'].includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        const supabase = await createClient()

        // Verify event ownership
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', id)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Create pricing tier
        const { data: pricing, error } = await supabase
            .from('event_pricing')
            .insert({
                event_id: id,
                name: body.name,
                description: body.description,
                pricing_type: body.pricing_type,
                membership_type: body.membership_type,
                price: body.price,
                start_date: body.start_date,
                end_date: body.end_date,
                max_tickets: body.max_tickets
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating pricing:', error)
            return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 })
        }

        return NextResponse.json(pricing)
    } catch (error) {
        console.error('Error in /api/events/[id]/pricing POST:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}