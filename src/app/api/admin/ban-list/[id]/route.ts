import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const { first_name, middle_name, last_name, date_of_birth, active, notes } = await request.json()

        if (!first_name || !last_name || !date_of_birth) {
            return NextResponse.json(
                { error: 'First name, last name, and date of birth are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('ban_list')
            .update({
                first_name,
                middle_name: middle_name || null,
                last_name,
                date_of_birth,
                active,
                notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating ban list entry:', error)
            return NextResponse.json(
                { error: 'Failed to update ban list entry' },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Error in ban-list PUT API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const supabase = await createClient()

        const { error } = await supabase
            .from('ban_list')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting ban list entry:', error)
            return NextResponse.json(
                { error: 'Failed to delete ban list entry' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error in ban-list DELETE API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
