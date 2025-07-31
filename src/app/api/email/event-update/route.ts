import { NextRequest, NextResponse } from 'next/server'
import { sendEventUpdateEmail } from '@/lib/email/service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      eventId, 
      updateType, 
      updateDetails 
    }: {
      eventId: string
      updateType: 'cancelled' | 'rescheduled' | 'updated'
      updateDetails: string
    } = await request.json()

    if (!eventId || !updateType || !updateDetails) {
      return NextResponse.json({ 
        error: 'Event ID, update type, and update details are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch all bookings for this event
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles (email, full_name)
      `)
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Send emails to all participants
    const emailPromises = bookings.map(async (booking) => {
      try {
        await sendEventUpdateEmail({
          userEmail: booking.profiles.email,
          eventName: event.title,
          eventDate: event.start_date,
          eventLocation: event.location,
          updateType,
          updateDetails,
          organizerName: event.organizer_name || 'Event Organizer',
          organizerEmail: event.organizer_email || 'organizer@example.com'
        })
        return { success: true, email: booking.profiles.email }
      } catch (error) {
        console.error(`Failed to send email to ${booking.profiles.email}:`, error)
        return { success: false, email: booking.profiles.email, error }
      }
    })

    const results = await Promise.allSettled(emailPromises)
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length
    const failed = results.length - successful

    return NextResponse.json({ 
      success: true, 
      message: `Event update emails sent`,
      stats: {
        total: results.length,
        successful,
        failed
      }
    })
  } catch (error) {
    console.error('Error sending event update emails:', error)
    return NextResponse.json(
      { error: 'Failed to send event update emails' },
      { status: 500 }
    )
  }
} 