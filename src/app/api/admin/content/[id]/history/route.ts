import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
    params: {
        id: string
    }
}

// GET /api/admin/content/[id]/history - Get content version history
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { params } = context
        const supabase = await createClient()

        // Check if user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Get current content
        const { data: currentContent, error: contentError } = await supabase
            .from('content')
            .select(`
                id,
                title,
                body,
                version,
                updated_by,
                updated_at,
                updated_by_profile:profiles!content_updated_by_fkey(full_name)
            `)
            .eq('id', params.id)
            .single()

        if (contentError) {
            if (contentError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 })
            }
            console.error('Database error:', contentError)
            return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
        }

        // Get content history
        const { data: history, error: historyError } = await supabase
            .from('content_history')
            .select(`
                id,
                title,
                body,
                version,
                created_by,
                created_at,
                created_by_profile:profiles!content_history_created_by_fkey(full_name)
            `)
            .eq('content_id', params.id)
            .order('version', { ascending: false })

        if (historyError) {
            console.error('Database error:', historyError)
            return NextResponse.json({ error: 'Failed to fetch content history' }, { status: 500 })
        }

        // Combine current version with history
        const allVersions = [
            {
                id: currentContent.id,
                title: currentContent.title,
                body: currentContent.body,
                version: currentContent.version,
                created_by: currentContent.updated_by,
                created_at: currentContent.updated_at,
                created_by_profile: currentContent.updated_by_profile,
                is_current: true
            },
            ...(history || []).map(h => ({ ...h, is_current: false }))
        ].sort((a, b) => b.version - a.version)

        return NextResponse.json({
            content_id: params.id,
            current_version: currentContent.version,
            versions: allVersions
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
