import { SupabaseClient } from '@supabase/supabase-js'

export interface BookingCleanupResult {
  success: boolean
  bookingDeleted: boolean
  participantsDeleted: boolean
  discountApplicationsDeleted: boolean
  paymentEventsDeleted: boolean
  errors: string[]
}

/**
 * Comprehensive cleanup function that removes all data associated with a booking
 * This includes participants, discount applications, payment events, and the booking itself
 */
export async function cleanupBookingData(
  supabase: SupabaseClient,
  bookingId: string,
  context: string = 'unknown'
): Promise<BookingCleanupResult> {
  const result: BookingCleanupResult = {
    success: false,
    bookingDeleted: false,
    participantsDeleted: false,
    discountApplicationsDeleted: false,
    paymentEventsDeleted: false,
    errors: []
  }

  try {
    console.log(`🗑️ CLEANING UP BOOKING (${context}):`, {
      bookingId,
      timestamp: new Date().toISOString()
    })

    // Delete all participants associated with this booking
    const { error: participantsError } = await supabase
      .from('participants')
      .delete()
      .eq('booking_id', bookingId)

    if (participantsError) {
      console.error(`❌ Error deleting participants for booking ${bookingId}:`, participantsError)
      result.errors.push(`Participants: ${participantsError.message}`)
    } else {
      result.participantsDeleted = true
      console.log(`✅ Participants deleted for booking: ${bookingId}`)
    }

    // Delete any discount applications for this booking
    const { error: discountError } = await supabase
      .from('discount_applications')
      .delete()
      .eq('booking_id', bookingId)

    if (discountError) {
      console.error(`❌ Error deleting discount applications for booking ${bookingId}:`, discountError)
      result.errors.push(`Discount applications: ${discountError.message}`)
    } else {
      result.discountApplicationsDeleted = true
      console.log(`✅ Discount applications deleted for booking: ${bookingId}`)
    }

    // Delete any payment events for this booking
    const { error: paymentEventsError } = await supabase
      .from('payment_events')
      .delete()
      .eq('booking_id', bookingId)

    if (paymentEventsError) {
      console.error(`❌ Error deleting payment events for booking ${bookingId}:`, paymentEventsError)
      result.errors.push(`Payment events: ${paymentEventsError.message}`)
    } else {
      result.paymentEventsDeleted = true
      console.log(`✅ Payment events deleted for booking: ${bookingId}`)
    }

    // Finally, delete the booking itself
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending')

    if (bookingError) {
      console.error(`❌ Error deleting booking ${bookingId}:`, bookingError)
      result.errors.push(`Booking: ${bookingError.message}`)
    } else {
      result.bookingDeleted = true
      console.log(`✅ BOOKING COMPLETELY CLEANED UP (${context}):`, {
        bookingId,
        timestamp: new Date().toISOString()
      })
    }

    // Consider cleanup successful if the booking was deleted, even if some related data had errors
    result.success = result.bookingDeleted

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Error in booking cleanup (${context}):`, error)
    result.errors.push(`General error: ${errorMessage}`)
  }

  return result
}
