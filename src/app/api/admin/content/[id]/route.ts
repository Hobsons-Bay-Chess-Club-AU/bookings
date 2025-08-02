import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
    params: {
        id: string
    }
}

// GET /api/admin/content/[id] - Get specific content
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

        const { data: content, error } = await supabase
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
            .eq('id', params.id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 })
            }
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
        }

        return NextResponse.json(content)

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/admin/content/[id] - Update content
export async function PUT(request: NextRequest, context: RouteContext) {
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

        const body = await request.json()
        const { title, slug, body: content, is_published, meta_description, meta_keywords } = body

        // Validate required fields
        if (!title || !slug || !content) {
            return NextResponse.json({
                error: 'Title, slug, and body are required'
            }, { status: 400 })
        }

        // Update content
        const { data, error } = await supabase
            .from('content')
            .update({
                title,
                slug,
                body: content,
                is_published: is_published || false,
                meta_description,
                meta_keywords,
                updated_by: user.id
            })
            .eq('id', params.id)
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return NextResponse.json({
                    error: 'Slug already exists. Please choose a different slug.'
                }, { status: 400 })
            }
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 })
            }
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
        }

        return NextResponse.json(data)

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/admin/content/[id] - Delete content
export async function DELETE(request: NextRequest, context: RouteContext) {
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

        const { error } = await supabase
            .from('content')
            .delete()
            .eq('id', params.id)

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Content deleted successfully' })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
