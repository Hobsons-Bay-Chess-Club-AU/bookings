import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('booking_id') // This is actually the session ID from Stripe

    if (!sessionId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`)
    }

    const supabase = await createClient()

    // Find the booking associated with this session
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, event_id, status')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'pending')
      .single()

    if (error || !booking) {
      console.log('No pending booking found for session:', sessionId)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`)
    }

    // Delete the pending booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)
      .eq('status', 'pending')

    if (deleteError) {
      console.error('Error deleting cancelled booking:', deleteError)
    } else {
      console.log('Successfully cleaned up cancelled booking:', booking.id)
    }

    // Redirect back to the event page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/events/${booking.event_id}`)
  } catch (error) {
    console.error('Error in cancel-checkout:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`)
  }
} 