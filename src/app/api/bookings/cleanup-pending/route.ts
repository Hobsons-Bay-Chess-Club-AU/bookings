import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupBookingData } from '@/lib/utils/booking-cleanup'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // First, check if the booking exists and is pending
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status, event_id')
      .eq('id', bookingId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found or not pending' }, { status: 404 })
    }

    // Use the comprehensive cleanup function
    const cleanupResult = await cleanupBookingData(supabase, bookingId, 'cleanup-pending')

    if (!cleanupResult.success) {
      console.error('❌ Failed to cleanup booking:', cleanupResult.errors)
      return NextResponse.json({ 
        error: 'Failed to cleanup booking',
        details: cleanupResult.errors
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Booking cleaned up successfully' })
  } catch (error) {
    console.error('Error in cleanup-pending:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 