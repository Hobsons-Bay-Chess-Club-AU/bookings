import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''
        const active = searchParams.get('active')

        let query = supabase
            .from('ban_list')
            .select(`
                *,
                created_by_profile:profiles!ban_list_created_by_fkey(
                    id,
                    full_name,
                    email
                )
            `, { count: 'exact' })

        // Apply filters
        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        }

        if (active !== null) {
            query = query.eq('active', active === 'true')
        }

        // Apply pagination
        const offset = (page - 1) * limit
        query = query.order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
            console.error('Error fetching ban list:', error)
            return NextResponse.json(
                { error: 'Failed to fetch ban list' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (error) {
        console.error('Error in ban-list GET API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { first_name, last_name, date_of_birth, notes } = await request.json()

        if (!first_name || !last_name || !date_of_birth) {
            return NextResponse.json(
                { error: 'First name, last name, and date of birth are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('ban_list')
            .insert({
                first_name,
                last_name,
                date_of_birth,
                notes,
                created_by: profile.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding to ban list:', error)
            return NextResponse.json(
                { error: 'Failed to add to ban list' },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Error in ban-list POST API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
