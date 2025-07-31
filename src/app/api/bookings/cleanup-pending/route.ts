import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete the pending booking
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error cleaning up booking:', error)
      return NextResponse.json({ error: 'Failed to cleanup booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Booking cleaned up successfully' })
  } catch (error) {
    console.error('Error in cleanup-pending:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 