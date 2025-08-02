import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Content } from '@/lib/types/database'

// GET /api/admin/content - List all content
export async function GET(request: NextRequest) {
    try {
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

        // Get search and pagination params
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const published = searchParams.get('published')

        let query = supabase
            .from('content')
            .select(`
                id,
                title,
                slug,
                body,
                version,
                is_published,
                meta_description,
                meta_keywords,
                created_by,
                updated_by,
                created_at,
                updated_at,
                created_by_profile:profiles!content_created_by_fkey(full_name),
                updated_by_profile:profiles!content_updated_by_fkey(full_name)
            `)
            .order('updated_at', { ascending: false })

        // Apply search filter
        if (search) {
            query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,body.ilike.%${search}%`)
        }

        // Apply published filter
        if (published !== null) {
            query = query.eq('is_published', published === 'true')
        }

        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data: content, error, count } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
        }

        return NextResponse.json({
            content,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/admin/content - Create new content
export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json()
        const { title, slug, body: content, is_published, meta_description, meta_keywords } = body

        // Validate required fields
        if (!title || !slug || !content) {
            return NextResponse.json({
                error: 'Title, slug, and body are required'
            }, { status: 400 })
        }

        // Create content
        const { data, error } = await supabase
            .from('content')
            .insert({
                title,
                slug,
                body: content,
                is_published: is_published || false,
                meta_description,
                meta_keywords,
                created_by: user.id,
                updated_by: user.id
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return NextResponse.json({
                    error: 'Slug already exists. Please choose a different slug.'
                }, { status: 400 })
            }
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
