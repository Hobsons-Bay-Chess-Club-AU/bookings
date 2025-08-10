import Stripe from 'stripe'
import { createWebhookSupabaseClient } from './utils'
import { cleanupBookingData } from '@/lib/utils/booking-cleanup'

export async function handleCheckoutSessionExpired(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.bookingId

    console.log('⏰ CHECKOUT.SESSION.EXPIRED:', {
        sessionId: session.id,
        bookingId,
        timestamp: new Date().toISOString()
    })

    if (!bookingId) {
        console.log('⏭️ SKIPPING (checkout.session.expired): No booking ID in metadata')
        return
    }

    const supabase = createWebhookSupabaseClient()

    try {
        // First, check if the booking exists and is still pending
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('id, status, event_id')
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single()

        if (fetchError || !booking) {
            console.log('⏭️ SKIPPING (checkout.session.expired): Booking not found or not pending:', {
                bookingId,
                error: fetchError?.message,
                bookingExists: !!booking
            })
            return
        }

        // Use the comprehensive cleanup function
        const cleanupResult = await cleanupBookingData(supabase, bookingId, 'checkout.session.expired')

        if (!cleanupResult.success) {
            console.error('❌ Failed to cleanup expired booking:', cleanupResult.errors)
            throw new Error(`Failed to cleanup booking: ${cleanupResult.errors.join(', ')}`)
        }

    } catch (error) {
        console.error('❌ Error in checkout.session.expired cleanup:', error)
        throw error
    }
} 