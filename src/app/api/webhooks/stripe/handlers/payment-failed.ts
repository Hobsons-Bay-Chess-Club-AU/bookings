import Stripe from 'stripe'
import { createWebhookSupabaseClient } from './utils'

export async function handlePaymentIntentPaymentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const bookingId = paymentIntent.metadata?.bookingId

    console.log('❌ PAYMENT_INTENT.PAYMENT_FAILED:', {
        paymentIntentId: paymentIntent.id,
        bookingId,
        lastPaymentError: paymentIntent.last_payment_error?.message,
        timestamp: new Date().toISOString()
    })

    if (!bookingId) {
        console.log('⏭️ SKIPPING (payment_intent.payment_failed): No booking ID in metadata')
        return
    }

    const supabase = createWebhookSupabaseClient()

    // Update booking status to failed
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'failed' })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error updating booking to failed:', updateError)
    } else {
        console.log('✅ BOOKING STATUS UPDATED (payment_intent.payment_failed):', {
            bookingId,
            newStatus: 'failed',
            timestamp: new Date().toISOString()
        })
    }
} 