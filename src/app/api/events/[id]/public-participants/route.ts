import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params
  const supabase = await createClient()

  // 1. Fetch event and check if public participants are enabled
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status !== 'published' || !event.settings?.show_participants_public) {
    return NextResponse.json({ error: 'Participants list is not public' }, { status: 403 })
  }

  // 2. Use service role to bypass RLS and fetch all bookings/participants
  const serviceSupabase = createServiceClient()
  
  const { data: bookings, error: bookingsError } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      status,
      quantity,
      total_amount,
      created_at,
      booking_date,
      user_id,
      participants(*),
      profile:profiles!bookings_user_id_fkey(full_name, email)
    `)
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'verified'])
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
  }

  // 3. Return the full booking structure that the UI expects
  return NextResponse.json(bookings || [])
}