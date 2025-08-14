import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const type = searchParams.get('type')
        const popular = searchParams.get('popular')

        let query = supabase
            .from('custom_fields')
            .select('*')
            .or(`organizer_id.eq.${profile.id},is_global.eq.true`)

        // Apply filters
        if (search) {
            query = query.or(`label.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        if (type) {
            query = query.eq('type', type)
        }

        // Order by popularity or creation date
        if (popular === 'true') {
            query = query.order('usage_count', { ascending: false }).order('created_at', { ascending: false })
        } else {
            query = query.order('created_at', { ascending: false })
        }

        const { data: customFields, error } = await query

        if (error) {
            console.error('Error fetching custom fields:', error)
            return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
        }

        return NextResponse.json(customFields)
    } catch (error) {
        console.error('Error in /api/organizer/custom-fields:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            label,
            description,
            type,
            required,
            options,
            validation,
            placeholder,
            is_global = false,
            admin_only = false,
            config = null
        } = body

        // Validate required fields
        if (!name || !label || !type) {
            return NextResponse.json({
                error: 'Name, label, and type are required'
            }, { status: 400 })
        }

        // Only admins can create global fields
        const canCreateGlobal = profile.role === 'admin' && is_global

        // Check for duplicate names for this organizer
        const { data: existing, error: checkError } = await supabase
            .from('custom_fields')
            .select('id')
            .eq('organizer_id', profile.id)
            .eq('name', name)
            .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking for duplicate:', checkError)
            return NextResponse.json({ error: 'Failed to validate field name' }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({
                error: 'A field with this name already exists'
            }, { status: 400 })
        }

        // Create the custom field
        const { data: customField, error: insertError } = await supabase
            .from('custom_fields')
            .insert({
                organizer_id: profile.id,
                name,
                label,
                description,
                type,
                required: !!required,
                options: options || null,
                validation: validation || null,
                placeholder: placeholder || null,
                is_global: canCreateGlobal,
                admin_only: !!admin_only,
                config: config
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating custom field:', insertError)
            return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 })
        }

        return NextResponse.json(customField, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/organizer/custom-fields:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}