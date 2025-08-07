import Stripe from 'stripe'
import { createWebhookSupabaseClient, capturePaymentEvent, sendBookingConfirmationEmailWithLogging, sendOrganizerNotificationEmailWithLogging } from './utils'

// Helper function to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    // Add 30-second delay to ensure checkout.session.completed processes first
    console.log('⏳ [PAYMENT_INTENT.SUCCEEDED] Adding 30-second delay to ensure proper event order...')
    await delay(30000)
    console.log('✅ [PAYMENT_INTENT.SUCCEEDED] Delay completed, proceeding with processing...')

    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const bookingId = paymentIntent.metadata?.bookingId

    console.log('💳 PAYMENT_INTENT.SUCCEEDED:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        bookingId,
        timestamp: new Date().toISOString()
    })

    if (!bookingId) {
        console.log('⏭️ SKIPPING (payment_intent.succeeded): No booking ID in metadata')
        return
    }

    const supabase = createWebhookSupabaseClient()

    // Find booking by payment intent ID
    console.log('🔍 SEARCHING FOR BOOKING (payment_intent.succeeded):', {
        paymentIntentId: paymentIntent.id,
        bookingId,
        timestamp: new Date().toISOString()
    })

    const { data: booking, error: findError } = await supabase
        .from('bookings')
        .select(`
            *,
            events!bookings_event_id_fkey (*),
            profiles!bookings_user_id_fkey (*)
        `)
        .eq('id', bookingId)
        .single()

    if (findError || !booking) {
        console.log('❌ NO BOOKING FOUND (payment_intent.succeeded):', {
            paymentIntentId: paymentIntent.id,
            bookingId,
            error: findError?.message,
            timestamp: new Date().toISOString()
        })
        return
    }

    console.log('📋 BOOKING FOUND (payment_intent.succeeded):', {
        bookingId: booking.id,
        currentStatus: booking.status,
        existingPaymentIntent: booking.stripe_payment_intent_id,
        timestamp: new Date().toISOString()
    })

    // Only update if the booking is not already verified
    if (booking.status !== 'verified') {
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'verified',
                stripe_payment_intent_id: paymentIntent.id
            })
            .eq('id', booking.id)

        if (updateError) {
            console.error('Error verifying booking on payment success:', updateError)
        } else {
            console.log('✅ BOOKING STATUS UPDATED (payment_intent.succeeded):', {
                bookingId: booking.id,
                oldStatus: booking.status,
                newStatus: 'verified',
                paymentIntentId: paymentIntent.id,
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
        console.log('⏭️ SKIPPING UPDATE (payment_intent.succeeded):', {
            bookingId: booking.id,
            currentStatus: booking.status,
            reason: 'Already verified',
            paymentIntentId: paymentIntent.id,
            timestamp: new Date().toISOString()
        })
    }
} 