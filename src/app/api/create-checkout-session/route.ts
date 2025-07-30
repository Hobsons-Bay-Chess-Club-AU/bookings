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

        // Verify the booking exists and is pending
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single()

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Invalid booking' },
                { status: 400 }
            )
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
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
        })

        // Update booking with Stripe session ID
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ stripe_session_id: session.id })
            .eq('id', bookingId)

        if (updateError) {
            console.error('Error updating booking with session ID:', updateError)
        }

        return NextResponse.json({ sessionId: session.id })
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}