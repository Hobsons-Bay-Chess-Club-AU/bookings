import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
    try {
        const { bookingId, eventId, quantity, amount, eventTitle } = await request.json()

        if (!bookingId || !eventId || !quantity || !amount || !eventTitle) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify the booking exists and is pending, and get user info
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                user:profiles(email, full_name)
            `)
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single()

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Invalid booking' },
                { status: 400 }
            )
        }

        // Get user email for prefilling
        const userEmail = booking.user?.email

        // Fetch the event to check its status and availability
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, status, max_attendees, current_attendees, entry_close_date')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 400 })
        }
        if (event.status !== 'published' || event.status === 'entry_closed') {
            return NextResponse.json({ error: 'This event is not open for booking.' }, { status: 400 })
        }
        if (event.max_attendees != null && event.current_attendees >= event.max_attendees) {
            return NextResponse.json({ error: 'This event is sold out.' }, { status: 400 })
        }
        if (event.entry_close_date && new Date(event.entry_close_date) < new Date()) {
            return NextResponse.json({ error: 'Entries for this event are now closed (entry close date has passed).' }, { status: 400 })
        }

        // Create Stripe checkout session
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: eventTitle,
                            description: `${quantity} ticket${quantity > 1 ? 's' : ''}`,
                        },
                        unit_amount: Math.round((amount / quantity) * 100), // Convert to cents
                    },
                    quantity: quantity,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`,
            metadata: {
                bookingId: bookingId,
                eventId: eventId,
            },
        }

        // Prefill customer email if available
        if (userEmail) {
            sessionConfig.customer_email = userEmail
        }

        // Collect customer details for better UX
        sessionConfig.billing_address_collection = 'auto'
        sessionConfig.phone_number_collection = {
            enabled: false  // Made optional as requested
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)
        console.log('Initial session created:', session.id, 'payment_intent:', session.payment_intent)

        // Try to get payment intent from initial session first
        let paymentIntentId = session.payment_intent as string | null

        // If not available, retrieve the session with expanded details
        if (!paymentIntentId) {
            try {
                const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['payment_intent']
                })
                console.log('Retrieved full session:', {
                    id: fullSession.id,
                    payment_intent: fullSession.payment_intent,
                    payment_status: fullSession.payment_status
                })

                if (fullSession.payment_intent && typeof fullSession.payment_intent !== 'string') {
                    paymentIntentId = fullSession.payment_intent.id
                } else if (typeof fullSession.payment_intent === 'string') {
                    paymentIntentId = fullSession.payment_intent
                }
            } catch (retrieveError) {
                console.error('Error retrieving full session:', retrieveError)
            }
        }

        // Update booking with Stripe session ID and payment intent ID (if available)
        const updateData: any = { stripe_session_id: session.id }
        
        if (paymentIntentId) {
            updateData.stripe_payment_intent_id = paymentIntentId
            console.log('Will store payment intent ID:', paymentIntentId)
        } else {
            console.log('No payment intent ID available yet - will be updated via webhooks')
        }

        const { error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', bookingId)

        if (updateError) {
            console.error('Error updating booking with session info:', updateError)
        } else {
            console.log('Successfully updated booking with:', updateData)
        }

        console.log('Final checkout session result:', {
            sessionId: session.id,
            paymentIntentId: paymentIntentId,
            bookingId,
            hasPaymentIntent: !!paymentIntentId
        })

        return NextResponse.json({ sessionId: session.id })
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}