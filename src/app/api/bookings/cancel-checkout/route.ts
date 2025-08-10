import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupBookingData } from '@/lib/utils/booking-cleanup'

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

    // Use the comprehensive cleanup function
    const cleanupResult = await cleanupBookingData(supabase, booking.id, 'cancel-checkout')

    if (!cleanupResult.success) {
      console.error('❌ Failed to cleanup cancelled booking:', cleanupResult.errors)
    }

    // Redirect back to the event page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/events/${booking.event_id}`)
  } catch (error) {
    console.error('Error in cancel-checkout:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`)
  }
} 