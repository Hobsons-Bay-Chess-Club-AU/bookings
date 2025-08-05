import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isOrganizer } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin or organizer
    const isUserAdmin = await isAdmin()
    const isUserOrganizer = await isOrganizer()
    
    if (!isUserAdmin && !isUserOrganizer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const excludeEventId = searchParams.get('excludeEventId')

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build query for available events
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        start_date,
        end_date,
        location,
        max_attendees,
        current_attendees,
        status,
        entry_close_date
      `)
      .eq('status', 'published')
      .order('start_date', { ascending: true })

    // Organizers can only see their own events
    if (isUserOrganizer && !isUserAdmin) {
      query = query.eq('organizer_id', user.id)
    }

    // Exclude the current event if specified
    if (excludeEventId) {
      query = query.neq('id', excludeEventId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Filter out events that are at capacity or have closed entry
    const availableEvents = events?.filter(event => {
      const isAtCapacity = event.max_attendees && event.current_attendees >= event.max_attendees
      const isEntryClosed = event.entry_close_date && new Date(event.entry_close_date) < new Date()
      return !isAtCapacity && !isEntryClosed
    }) || []

    return NextResponse.json({
      events: availableEvents
    })

  } catch (error) {
    console.error('Error fetching available events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 