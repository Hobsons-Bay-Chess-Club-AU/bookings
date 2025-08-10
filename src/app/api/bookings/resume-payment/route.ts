import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
    try {
        const { bookingId } = await request.json()

        if (!bookingId) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get the pending booking with event and user details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                events!bookings_event_id_fkey (
                    id,
                    title,
                    start_date,
                    end_date,
                    location
                ),
                profiles!bookings_user_id_fkey (
                    id,
                    email,
                    full_name
                )
            `)
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single()

        if (bookingError || !booking) {
            console.log('❌ [resume-payment] Invalid booking:', {
                bookingId,
                error: bookingError?.message,
                bookingExists: !!booking
            })
            return NextResponse.json(
                { error: 'Invalid or expired booking' },
                { status: 400 }
            )
        }

        // Check if booking is older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (new Date(booking.created_at) < sevenDaysAgo) {
            return NextResponse.json(
                { error: 'Booking has expired and cannot be resumed' },
                { status: 400 }
            )
        }

        // Calculate processing fee (1.7% + A$0.30)
        const baseAmount = booking.total_amount
        const processingFeePercentage = 0.017
        const processingFeeFixed = 0.30
        const processingFee = (baseAmount * processingFeePercentage) + processingFeeFixed
        const totalAmount = baseAmount + processingFee

        // Create new Stripe checkout session
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: booking.events.title,
                            description: `${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''}`,
                        },
                        unit_amount: Math.round((baseAmount / booking.quantity) * 100), // Convert to cents
                    },
                    quantity: booking.quantity,
                },
                // Add processing fee as a transparent line item
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: 'Processing fee',
                            description: '1.7% + A$0.30'
                        },
                        unit_amount: Math.round(processingFee * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/cancel-checkout?booking_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                bookingId: booking.id,
                eventId: booking.event_id,
                isResume: 'true'
            },
        }

        // Prefill customer email if available
        if (booking.profiles?.email) {
            sessionConfig.customer_email = booking.profiles.email
        }

        // Collect customer details for better UX
        sessionConfig.billing_address_collection = 'auto'
        sessionConfig.phone_number_collection = {
            enabled: false
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)

        // Update booking with new Stripe session ID
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
                stripe_session_id: session.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('❌ [resume-payment] Error updating booking with new session:', updateError)
            return NextResponse.json(
                { error: 'Failed to update booking with payment information' },
                { status: 500 }
            )
        }

        console.log('✅ [resume-payment] Payment resumed successfully:', {
            bookingId,
            sessionId: session.id,
            timestamp: new Date().toISOString()
        })

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
            booking: {
                id: booking.id,
                eventTitle: booking.events.title,
                quantity: booking.quantity,
                totalAmount: booking.total_amount,
                processingFee,
                finalAmount: totalAmount
            }
        })

    } catch (error) {
        console.error('❌ [resume-payment] Error:', error)
        return NextResponse.json(
            { error: 'Failed to resume payment' },
            { status: 500 }
        )
    }
}
