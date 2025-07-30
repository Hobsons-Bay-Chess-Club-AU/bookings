import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

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

        const supabase = await createClient()

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const bookingId = session.metadata?.bookingId

                if (!bookingId) {
                    console.error('No booking ID in session metadata')
                    return NextResponse.json(
                        { error: 'No booking ID found' },
                        { status: 400 }
                    )
                }

                // Update booking status to confirmed
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({
                        status: 'confirmed',
                        stripe_payment_intent_id: session.payment_intent as string,
                    })
                    .eq('id', bookingId)

                if (updateError) {
                    console.error('Error updating booking status:', updateError)
                    return NextResponse.json(
                        { error: 'Failed to update booking' },
                        { status: 500 }
                    )
                }

                console.log(`Booking ${bookingId} confirmed via Stripe webhook`)
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
                    }

                    console.log(`Booking ${booking.id} cancelled due to payment failure`)
                }
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