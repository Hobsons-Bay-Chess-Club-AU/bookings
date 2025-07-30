import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const signature = request.headers.get('stripe-signature')!

        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err) {
            console.error('Webhook signature verification failed:', err)
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            )
        }

        // Use service role client for webhooks to bypass RLS
        const supabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        console.log('Received Stripe event:', event.type, 'Event ID:', event.id)
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const bookingId = session.metadata?.bookingId

                console.log('checkout.session.completed:', {
                    sessionId: session.id,
                    bookingId,
                    paymentIntent: session.payment_intent,
                    paymentStatus: session.payment_status
                })

                if (!bookingId) {
                    console.error('No booking ID in session metadata')
                    return NextResponse.json(
                        { error: 'No booking ID found' },
                        { status: 400 }
                    )
                }

                // Prepare update data
                const updateData: any = { status: 'confirmed' }
                
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
                    console.error('Booking not found:', bookingId, fetchError)
                    return NextResponse.json(
                        { error: 'Booking not found' },
                        { status: 404 }
                    )
                }

                console.log('Found existing booking:', existingBooking)

                // Update booking status to confirmed
                const { data: updatedBooking, error: updateError } = await supabase
                    .from('bookings')
                    .update(updateData)
                    .eq('id', bookingId)
                    .select()
                    .single()

                if (updateError) {
                    console.error('Error updating booking status:', updateError)
                    return NextResponse.json(
                        { error: 'Failed to update booking' },
                        { status: 500 }
                    )
                }

                console.log(`Booking ${bookingId} confirmed via checkout.session.completed`)
                console.log('Before update:', existingBooking)
                console.log('After update:', updatedBooking)
                console.log('Update data applied:', updateData)
                break
            }

            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session
                const bookingId = session.metadata?.bookingId

                if (bookingId) {
                    // Update booking status to cancelled
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', bookingId)

                    if (updateError) {
                        console.error('Error updating expired booking:', updateError)
                    }

                    console.log(`Booking ${bookingId} cancelled due to expired session`)
                }
                break
            }

            case 'payment_intent.created': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log("payment_intent.created", paymentIntent.id)

                // Find booking by payment intent ID and update to verified
                const { data: booking, error: findError } = await supabase
                    .from('bookings')
                    .select('id, status, stripe_payment_intent_id')
                    .eq('stripe_payment_intent_id', paymentIntent.id)
                    .single()

                if (!findError && booking) {
                    // Update booking status to verified when payment intent is created
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
                        console.log(`Booking ${booking.id} marked as verified via payment_intent.created`)
                    }
                } else {
                    console.error('No booking found for payment intent created:', paymentIntent.id)
                }
                break
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log("paymentIntent.succeeded", paymentIntent.id)

                // Find booking by payment intent ID
                let { data: booking, error: findError } = await supabase
                    .from('bookings')
                    .select('id, status, stripe_payment_intent_id')
                    .eq('stripe_payment_intent_id', paymentIntent.id)
                    .single()

                // If not found by payment intent ID, try alternative methods
                if (findError) {
                    console.log('Payment intent not found directly, trying alternatives...')
                    
                    // Method 1: Try to find by session ID in metadata
                    if (paymentIntent.metadata?.session_id) {
                        console.log('Trying to find by session ID:', paymentIntent.metadata.session_id)
                        const { data: sessionBooking, error: sessionError } = await supabase
                            .from('bookings')
                            .select('id, status, stripe_session_id')
                            .eq('stripe_session_id', paymentIntent.metadata.session_id)
                            .single()

                        if (!sessionError && sessionBooking) {
                            console.log('Found booking by session ID:', sessionBooking.id)
                            // Update the booking with payment intent ID
                            const { error: updatePIError } = await supabase
                                .from('bookings')
                                .update({ stripe_payment_intent_id: paymentIntent.id })
                                .eq('id', sessionBooking.id)

                            if (!updatePIError) {
                                booking = { ...sessionBooking, stripe_payment_intent_id: paymentIntent.id }
                                findError = null
                            }
                        }
                    }
                    
                    // Method 2: Try to find any pending booking with null payment intent
                    if (findError) {
                        console.log('Trying to find pending booking with null payment intent...')
                        const { data: pendingBookings, error: pendingError } = await supabase
                            .from('bookings')
                            .select('id, status, stripe_session_id, created_at')
                            .eq('status', 'pending')
                            .is('stripe_payment_intent_id', null)
                            .order('created_at', { ascending: false })
                            .limit(5)

                        if (!pendingError && pendingBookings?.length) {
                            console.log(`Found ${pendingBookings.length} pending bookings without payment intent`)
                            // For safety, only auto-link if there's exactly one recent pending booking
                            const recentBooking = pendingBookings[0]
                            const timeDiff = Date.now() - new Date(recentBooking.created_at).getTime()
                            
                            // Only link if booking was created within last 30 minutes
                            if (timeDiff < 30 * 60 * 1000) {
                                console.log('Linking recent pending booking:', recentBooking.id)
                                const { error: updatePIError } = await supabase
                                    .from('bookings')
                                    .update({ stripe_payment_intent_id: paymentIntent.id })
                                    .eq('id', recentBooking.id)

                                if (!updatePIError) {
                                    booking = { ...recentBooking, stripe_payment_intent_id: paymentIntent.id }
                                    findError = null
                                }
                            }
                        }
                    }
                }

                console.log('Found booking:', booking?.id)
                
                if (!findError && booking) {
                    // Only update if booking is still pending or not already verified
                    if (booking.status === 'pending' || booking.status !== 'verified') {
                        const { error: updateError } = await supabase
                            .from('bookings')
                            .update({ 
                                status: 'verified',
                                stripe_payment_intent_id: paymentIntent.id // Ensure it's stored
                            })
                            .eq('id', booking.id)

                        if (updateError) {
                            console.error('Error verifying booking on payment success:', updateError)
                        } else {
                            console.log(`Booking ${booking.id} verified via payment_intent.succeeded`)
                        }
                    }
                } else {
                    console.error('No booking found for payment intent:', paymentIntent.id)
                }
                break
            }

            case 'charge.succeeded': {
                const charge = event.data.object as Stripe.Charge
                console.log("charge.succeeded", charge.payment_intent)

                // Find booking by payment intent ID from the charge
                if (charge.payment_intent) {
                    const { data: booking, error: findError } = await supabase
                        .from('bookings')
                        .select('id, status')
                        .eq('stripe_payment_intent_id', charge.payment_intent as string)
                        .single()

                    if (!findError && booking) {
                        // Only update if booking is still pending or not already verified
                        if (booking.status === 'pending' || booking.status !== 'verified') {
                            const { error: updateError } = await supabase
                                .from('bookings')
                                .update({ 
                                    status: 'verified',
                                    stripe_payment_intent_id: charge.payment_intent as string // Ensure it's stored
                                })
                                .eq('id', booking.id)

                            if (updateError) {
                                console.error('Error verifying booking on charge success:', updateError)
                            } else {
                                console.log(`Booking ${booking.id} verified via charge.succeeded`)
                            }
                        }
                    } else {
                        console.error('No booking found for charge payment intent:', charge.payment_intent)
                    }
                }
                break
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent

                // Find booking by payment intent ID
                const { data: booking, error: findError } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('stripe_payment_intent_id', paymentIntent.id)
                    .single()

                if (!findError && booking) {
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', booking.id)

                    if (updateError) {
                        console.error('Error updating failed payment booking:', updateError)
                    } else {
                        console.log(`Booking ${booking.id} cancelled due to payment failure`)
                    }
                }
                break
            }

            case 'charge.dispute.created': {
                const dispute = event.data.object as Stripe.Dispute
                const charge = dispute.charge as string

                // Find booking by charge or payment intent
                const { data: booking, error: findError } = await supabase
                    .from('bookings')
                    .select('id, status')
                    .or(`stripe_payment_intent_id.eq.${charge},stripe_payment_intent_id.like.%${charge}%`)
                    .single()

                if (!findError && booking && booking.status === 'confirmed') {
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', booking.id)

                    if (updateError) {
                        console.error('Error updating disputed booking:', updateError)
                    } else {
                        console.log(`Booking ${booking.id} cancelled due to payment dispute`)
                    }
                }
                break
            }

            case 'invoice.payment_succeeded': {
                // Handle subscription or invoice payments if you add recurring billing
                console.log('Invoice payment succeeded - no action needed for current booking system')
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}