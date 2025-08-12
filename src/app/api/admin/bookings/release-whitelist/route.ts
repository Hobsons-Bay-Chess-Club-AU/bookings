import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isOrganizer } from '@/lib/utils/auth'
import { sendWhitelistReleasedEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const canAdmin = await isAdmin()
    const canOrganizer = await isOrganizer()
    if (!canAdmin && !canOrganizer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { bookingId } = await request.json()
    
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        events!bookings_event_id_fkey (
          id, 
          title, 
          start_date, 
          end_date, 
          location, 
          description,
          organizer:profiles!events_organizer_id_fkey (full_name, email)
        ), 
        profiles!bookings_user_id_fkey (id, email, full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Permission: if organizer, ensure booking belongs to their event
    if (!canAdmin) {
      const { data: event } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', booking.event_id)
        .single()
      const { data: { user } } = await supabase.auth.getUser()
      if (!event || !user || event.organizer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (booking.status !== 'whitelisted') {
      return NextResponse.json({ error: 'Only whitelisted bookings can be released' }, { status: 400 })
    }

    // Promote to pending allowing payment
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    // Fetch participants for this booking
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    // Email user
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const dashboardUrl = `${baseUrl}/dashboard`
    const completePaymentUrl = `${baseUrl}/events/${booking.event_id}?step=4&resume=${booking.id}`
    
    if (booking.profiles?.email) {
      await sendWhitelistReleasedEmail({
        userEmail: booking.profiles.email,
        userName: booking.profiles.full_name || undefined,
        eventTitle: booking.events?.title || 'Event',
        bookingId: booking.booking_id || booking.id,
        dashboardUrl,
        completePaymentUrl,
        eventDate: booking.events?.start_date,
        eventLocation: booking.events?.location,
        eventEndDate: booking.events?.end_date,
        participantCount: booking.quantity,
        totalAmount: booking.total_amount,
        organizerName: booking.events?.organizer?.full_name || 'Event Organizer',
        organizerEmail: booking.events?.organizer?.email || '',
        organizerPhone: undefined, // Phone field doesn't exist in profiles table
        eventDescription: booking.events?.description,
        participants: participants || []
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error releasing whitelisted booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


