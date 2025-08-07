import Stripe from 'stripe'
import { createWebhookSupabaseClient } from './utils'

export async function handleChargeDisputeCreated(event: Stripe.Event) {
    const dispute = event.data.object as Stripe.Dispute
    const chargeId = dispute.charge as string

    console.log('⚠️ CHARGE.DISPUTE.CREATED:', {
        disputeId: dispute.id,
        chargeId,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        timestamp: new Date().toISOString()
    })

    const supabase = createWebhookSupabaseClient()

    // Find booking by charge ID (via payment intent)
    const { data: booking, error: findError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('stripe_payment_intent_id', chargeId)
        .single()

    if (findError || !booking) {
        console.log('❌ NO BOOKING FOUND (charge.dispute.created):', {
            chargeId,
            error: findError?.message,
            timestamp: new Date().toISOString()
        })
        return
    }

    console.log('📋 BOOKING FOUND (charge.dispute.created):', {
        bookingId: booking.id,
        currentStatus: booking.status,
        timestamp: new Date().toISOString()
    })

    // Update booking status to disputed
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'disputed' })
        .eq('id', booking.id)

    if (updateError) {
        console.error('Error updating booking to disputed:', updateError)
    } else {
        console.log('✅ BOOKING STATUS UPDATED (charge.dispute.created):', {
            bookingId: booking.id,
            oldStatus: booking.status,
            newStatus: 'disputed',
            timestamp: new Date().toISOString()
        })
    }
} 