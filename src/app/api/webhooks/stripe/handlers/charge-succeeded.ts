import Stripe from 'stripe'
import { createWebhookSupabaseClient, capturePaymentEvent, sendBookingConfirmationEmailWithLogging, sendOrganizerNotificationEmailWithLogging } from './utils'

export async function handleChargeSucceeded(event: Stripe.Event) {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = charge.payment_intent as string

    console.log('💳 CHARGE.SUCCEEDED:', {
        chargeId: charge.id,
        paymentIntentId,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        timestamp: new Date().toISOString()
    })

    if (!paymentIntentId) {
        console.log('⏭️ SKIPPING (charge.succeeded): No payment intent ID')
        return
    }

    const supabase = createWebhookSupabaseClient()

    // Find booking by payment intent ID
    console.log('🔍 SEARCHING FOR BOOKING (charge.succeeded):', {
        paymentIntentId,
        timestamp: new Date().toISOString()
    })

    const { data: booking, error: findError } = await supabase
        .from('bookings')
        .select(`
            *,
            events!bookings_event_id_fkey (*),
            profiles!bookings_user_id_fkey (*)
        `)
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

    if (findError || !booking) {
        console.log('❌ NO BOOKING FOUND (charge.succeeded):', {
            paymentIntentId,
            error: findError?.message,
            timestamp: new Date().toISOString()
        })
        return
    }

    console.log('📋 BOOKING FOUND (charge.succeeded):', {
        bookingId: booking.id,
        currentStatus: booking.status,
        paymentIntentId,
        timestamp: new Date().toISOString()
    })

    // Only update if the booking is not already verified
    if (booking.status !== 'verified') {
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'verified',
                stripe_payment_intent_id: paymentIntentId
            })
            .eq('id', booking.id)

        if (updateError) {
            console.error('Error verifying booking on charge success:', updateError)
        } else {
            console.log('✅ BOOKING STATUS UPDATED (charge.succeeded):', {
                bookingId: booking.id,
                oldStatus: booking.status,
                newStatus: 'verified',
                paymentIntentId,
                timestamp: new Date().toISOString()
            })

            // Capture payment event
            await capturePaymentEvent(supabase, {
                bookingId: booking.id,
                eventType: event.type,
                eventId: event.id
            })

            // Send confirmation email
            await sendBookingConfirmationEmailWithLogging(
                booking,
                booking.events,
                booking.profiles
            )

            // Send organizer notification email
            await sendOrganizerNotificationEmailWithLogging(supabase, booking)
        }
    } else {
        console.log('⏭️ SKIPPING UPDATE (charge.succeeded):', {
            bookingId: booking.id,
            currentStatus: booking.status,
            reason: 'Already verified',
            paymentIntentId,
            timestamp: new Date().toISOString()
        })
    }
} 