import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
    params: {
        slug: string
    }
}

// GET /api/content/[slug] - Get published content by slug
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { params } = context
        const supabase = await createClient()

        const { data: content, error } = await supabase
            .from('content')
            .select(`
                id,
                title,
                slug,
                body,
                version,
                meta_description,
                meta_keywords,
                created_at,
                updated_at,
                is_published
            `)
            .eq('slug', params.slug)
            .eq('is_published', true)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 })
            }
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
        }

        // Set cache headers for published content
        const response = NextResponse.json(content)
        response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

        return response

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
