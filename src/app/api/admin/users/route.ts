import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'

export async function GET() {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch all users from auth.users and join with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // For now, we'll assume all users are active and add a status field later
    // In production, you'd need to set up a service role key for admin operations
    const usersWithStatus = profiles.map(profile => ({
      ...profile,
      active: true, // Default to active - can be managed via a separate status field
      email_confirmed: true, // Default to confirmed
      last_sign_in: null
    }))

    return NextResponse.json(usersWithStatus)
  } catch (error) {
    console.error('Error in /api/admin/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}