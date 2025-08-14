import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const base = supabase
            .from('events')
            .select('id, title')
            .order('created_at', { ascending: false })

        const query = profile.role === 'admin' ? base : base.eq('organizer_id', profile.id)
        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}


