import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'

export async function GET(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = params

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        event:events(title, price),
        user:profiles!bookings_user_id_fkey(email, full_name),
        transferred_by_user:profiles!bookings_transferred_by_fkey(email, full_name)
      `)
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      booking,
      debug: {
        hasSessionId: !!booking.stripe_session_id,
        hasPaymentIntentId: !!booking.stripe_payment_intent_id,
        status: booking.status,
        created: booking.created_at,
        updated: booking.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}