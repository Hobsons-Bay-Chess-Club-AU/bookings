import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isOrganizer } from '@/lib/utils/auth'
import { sendBookingTransferNotification } from '@/lib/email/user-notifications'

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin or organizer
    const isUserAdmin = await isAdmin()
    const isUserOrganizer = await isOrganizer()
    
    if (!isUserAdmin && !isUserOrganizer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { bookingId, targetEventId, reason, notes } = await request.json()

    console.log('Transfer request:', { bookingId, targetEventId, reason, notes })

    if (!bookingId || !targetEventId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, targetEventId, reason' },
        { status: 400 }
      )
    }

    // Get current user info for audit
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the booking to transfer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        event:events!bookings_event_id_fkey(*),
        user:profiles!user_id(*)
      `)
      .eq('id', bookingId)
      .single()

    console.log('Booking query result:', { booking, bookingError })

    if (bookingError || !booking) {
      console.error('Booking not found:', { bookingId, bookingError })
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get admin user profile for email notification
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (adminProfileError) {
      console.error('Error fetching admin profile:', adminProfileError)
    }

    // Check if user has permission to transfer this booking
    if (isUserOrganizer && !isUserAdmin) {
      // Organizers can only transfer bookings from their own events
      if (booking.event.organizer_id !== user.id) {
        return NextResponse.json({ error: 'You can only transfer bookings from your own events' }, { status: 403 })
      }
    }

    // Get the target event
    const { data: targetEvent, error: targetEventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', targetEventId)
      .single()

    if (targetEventError || !targetEvent) {
      return NextResponse.json({ error: 'Target event not found' }, { status: 404 })
    }

    // Check if target event is published and has capacity
    if (targetEvent.status !== 'published') {
      return NextResponse.json({ error: 'Target event is not published' }, { status: 400 })
    }

    if (targetEvent.max_attendees && targetEvent.current_attendees >= targetEvent.max_attendees) {
      return NextResponse.json({ error: 'Target event is at full capacity' }, { status: 400 })
    }

    // Check if target event entry is still open
    if (targetEvent.entry_close_date && new Date(targetEvent.entry_close_date) < new Date()) {
      return NextResponse.json({ error: 'Target event entry is closed' }, { status: 400 })
    }

    // Start transaction
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        event_id: targetEventId,
        transferred_from_event_id: booking.event_id,
        transferred_at: new Date().toISOString(),
        transferred_by: user.id
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to transfer booking' }, { status: 500 })
    }

    // Update attendee counts
    // Decrease count from original event
    const { error: decreaseError } = await supabase
      .from('events')
      .update({
        current_attendees: booking.event.current_attendees - booking.quantity
      })
      .eq('id', booking.event_id)

    if (decreaseError) {
      console.error('Error decreasing attendee count:', decreaseError)
    }

    // Increase count in target event
    const { error: increaseError } = await supabase
      .from('events')
      .update({
        current_attendees: targetEvent.current_attendees + booking.quantity
      })
      .eq('id', targetEventId)

    if (increaseError) {
      console.error('Error increasing attendee count:', increaseError)
    }

            // Create audit record
        const { error: auditError } = await supabase
            .from('booking_audit')
            .insert({
                booking_id: bookingId,
                event_id: targetEventId,
                action: 'transfer',
                from_event_id: booking.event_id,
                to_event_id: targetEventId,
                reason: reason,
                notes: notes || null,
                performed_by: user.id
            })

        if (auditError) {
            console.error('Error creating audit record:', auditError)
            // Don't fail the transfer if audit fails
        }

        // Send email notification to the user
        try {
            await sendBookingTransferNotification({
                userName: booking.user?.full_name || 'User',
                userEmail: booking.user?.email || '',
                bookingId: booking.booking_id || booking.id,
                quantity: booking.quantity,
                totalAmount: booking.total_amount,
                fromEventTitle: booking.event.title,
                fromEventDate: booking.event.start_date,
                fromEventLocation: booking.event.location,
                toEventTitle: targetEvent.title,
                toEventDate: targetEvent.start_date,
                toEventLocation: targetEvent.location,
                transferReason: reason,
                transferNotes: notes,
                adminName: adminProfile?.full_name || 'Admin',
                transferredAt: new Date().toISOString()
            })
        } catch (emailError) {
            console.error('Error sending transfer notification email:', emailError)
            // Don't fail the transfer if email fails
        }

        return NextResponse.json({
            message: 'Booking transferred successfully',
            booking: updatedBooking
        })

  } catch (error) {
    console.error('Error transferring booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 