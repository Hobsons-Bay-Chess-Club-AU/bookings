import Stripe from 'stripe'
import { createWebhookSupabaseClient, capturePaymentEvent, sendBookingConfirmationEmailWithLogging, sendOrganizerNotificationEmailWithLogging } from './utils'

export async function handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.bookingId

    console.log('🛒 CHECKOUT.SESSION.COMPLETED:', {
        sessionId: session.id,
        bookingId,
        paymentIntent: session.payment_intent,
        paymentStatus: session.payment_status,
        timestamp: new Date().toISOString()
    })

    if (!bookingId) {
        console.error('No booking ID in session metadata')
        throw new Error('No booking ID found')
    }

    const supabase = createWebhookSupabaseClient()

    // Prepare update data
    const updateData: Record<string, unknown> = { status: 'confirmed' }

    // Add payment intent ID if available
    if (session.payment_intent) {
        updateData.stripe_payment_intent_id = session.payment_intent as string
        console.log('Storing payment intent ID from session:', session.payment_intent)
    }

    // First, check if the booking exists
    const { data: existingBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, status, stripe_payment_intent_id')
        .eq('id', bookingId)
        .single()

    if (fetchError || !existingBooking) {
        console.error('Booking not found:', { bookingId, error: fetchError })
        throw new Error('Booking not found')
    }

    console.log('📋 EXISTING BOOKING FOUND:', {
        bookingId: existingBooking.id,
        currentStatus: existingBooking.status,
        existingPaymentIntent: existingBooking.stripe_payment_intent_id,
        timestamp: new Date().toISOString()
    })

    // Only update if the booking is still pending
    if (existingBooking.status === 'pending') {
        const { error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', bookingId)

        if (updateError) {
            console.error('Error updating booking status:', updateError)
            throw new Error('Failed to update booking status')
        }

        console.log('✅ BOOKING STATUS UPDATED (checkout.session.completed):', {
            bookingId,
            oldStatus: 'pending',
            newStatus: 'confirmed',
            paymentIntentId: session.payment_intent,
            timestamp: new Date().toISOString()
        })

        // Capture payment event
        await capturePaymentEvent(supabase, {
            bookingId,
            eventType: event.type,
            eventId: event.id
        })

        // Fetch the updated booking with all relations for email
        const { data: updatedBooking, error: fetchUpdatedError } = await supabase
            .from('bookings')
            .select(`
                *,
                events!bookings_event_id_fkey (*),
                profiles!bookings_user_id_fkey (*)
            `)
            .eq('id', bookingId)
            .single()

        if (fetchUpdatedError || !updatedBooking) {
            console.error('Failed to fetch updated booking for email:', fetchUpdatedError)
            return
        }

        // Send confirmation email
        await sendBookingConfirmationEmailWithLogging(
            updatedBooking,
            updatedBooking.events,
            updatedBooking.profiles
        )

        // Send organizer notification email
        await sendOrganizerNotificationEmailWithLogging(supabase, updatedBooking)
    } else {
        console.log('⏭️ SKIPPING UPDATE (checkout.session.completed):', {
            bookingId,
            currentStatus: existingBooking.status,
            reason: 'Already confirmed or verified',
            paymentIntentId: session.payment_intent,
            timestamp: new Date().toISOString()
        })
    }
} 