import Stripe from 'stripe'
import { createWebhookSupabaseClient, capturePaymentEvent, sendBookingConfirmationEmailWithLogging, sendOrganizerNotificationEmailWithLogging } from './utils'

export async function handlePaymentIntentCreated(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const bookingId = paymentIntent.metadata?.bookingId

    console.log('💳 PAYMENT_INTENT.CREATED:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        bookingId,
        timestamp: new Date().toISOString()
    })

    if (!bookingId) {
        console.log('⏭️ SKIPPING (payment_intent.created): No booking ID in metadata')
        return
    }

    const supabase = createWebhookSupabaseClient()

    // Find booking by payment intent ID
    console.log('🔍 SEARCHING FOR BOOKING (payment_intent.created):', {
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
        console.log('❌ NO BOOKING FOUND (payment_intent.created):', {
            paymentIntentId: paymentIntent.id,
            bookingId,
            error: findError?.message,
            timestamp: new Date().toISOString()
        })
        return
    }

    console.log('📋 BOOKING FOUND (payment_intent.created):', {
        bookingId: booking.id,
        currentStatus: booking.status,
        existingPaymentIntent: booking.stripe_payment_intent_id,
        timestamp: new Date().toISOString()
    })

    // Only update if the booking is still pending
    if (booking.status === 'pending') {
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'verified',
                stripe_payment_intent_id: paymentIntent.id
            })
            .eq('id', booking.id)

        if (updateError) {
            console.error('Error updating booking to verified on payment intent created:', updateError)
        } else {
            console.log('✅ BOOKING STATUS UPDATED (payment_intent.created):', {
                bookingId: booking.id,
                oldStatus: 'pending',
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
        console.log('⏭️ SKIPPING UPDATE (payment_intent.created):', {
            bookingId: booking.id,
            currentStatus: booking.status,
            reason: 'Already verified',
            paymentIntentId: paymentIntent.id,
            timestamp: new Date().toISOString()
        })
    }
} 