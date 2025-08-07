import Stripe from 'stripe'
import { createWebhookSupabaseClient } from './utils'

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

    // Update booking status to expired
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error updating booking to expired:', updateError)
    } else {
        console.log('✅ BOOKING STATUS UPDATED (checkout.session.expired):', {
            bookingId,
            newStatus: 'expired',
            timestamp: new Date().toISOString()
        })
    }
} 