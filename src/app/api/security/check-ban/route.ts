import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { first_name, middle_name, last_name, date_of_birth } = await request.json()

        if (!first_name || !last_name || !date_of_birth) {
            return NextResponse.json(
                { error: 'First name, last name, and date of birth are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Use the database function to check if participant is banned
        const { data, error } = await supabase.rpc('is_participant_banned', {
            p_first_name: first_name,
            p_middle_name: middle_name || null,
            p_last_name: last_name,
            p_date_of_birth: date_of_birth
        })

        if (error) {
            console.error('Error checking ban status:', error)
            return NextResponse.json(
                { error: 'Failed to check participant status' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            is_banned: data
        })

    } catch (error) {
        console.error('Error in check-ban API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
