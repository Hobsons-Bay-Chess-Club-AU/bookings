import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCachedResponse, getCachePresets } from '@/lib/utils/cache'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params
  const supabase = await createClient()

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(full_name, email)
    `)
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Only return published events publicly
  if (event.status !== 'published') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return createCachedResponse(event, getCachePresets().EVENT)
} 