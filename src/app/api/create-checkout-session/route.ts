import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

async function createCheckoutSessionHandler(request: NextRequest) {
    try {
        const requestBody = await request.json()
        const { bookingId, eventId, quantity, amount: _clientAmount, eventTitle, optInMarketing, isMultiSectionEvent, selectedSections } = requestBody



        if (!bookingId || !eventId || !quantity || !_clientAmount || !eventTitle) {
            console.log('❌ [create-checkout-session] Missing required fields:', {
                hasBookingId: !!bookingId,
                hasEventId: !!eventId,
                hasQuantity: !!quantity,
                hasAmount: !!_clientAmount,
                hasEventTitle: !!eventTitle
            })
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
                user:profiles!bookings_user_id_fkey(email, full_name)
            `)
            .eq('id', bookingId)
            .in('status', ['pending', 'whitelisted'])
            .single()

        if (bookingError || !booking) {
            console.log('❌ [create-checkout-session] Invalid booking:', {
                bookingId,
                error: bookingError?.message,
                bookingExists: !!booking
            })
            return NextResponse.json(
                { error: 'Invalid booking' },
                { status: 400 }
            )
        }

        // If booking is whitelisted, allow checkout and implicitly move to pending for payment flow
        if (booking.status === 'whitelisted') {
            const { error: promoteError } = await supabase
                .from('bookings')
                .update({ status: 'pending', updated_at: new Date().toISOString() })
                .eq('id', bookingId)
            if (promoteError) {
                console.warn('⚠️ [create-checkout-session] Could not promote whitelisted booking to pending:', promoteError)
            }
        }

        // Get user email for prefilling
        const userEmail = booking.user?.email

        // Handle mailing list opt-in if user agreed
        if (optInMarketing && userEmail) {
            try {
                // Check if email already exists in mailing list
                const { data: existingSubscriber } = await supabase
                    .from('mailing_list')
                    .select('id')
                    .eq('email', userEmail)
                    .single()

                if (!existingSubscriber) {
                    // Add to mailing list
                    await supabase
                        .from('mailing_list')
                        .insert({
                            email: userEmail,
                            status: 'subscribed',
                            filter_event: ['all']
                        })
                }
            } catch (error) {
                console.error('❌ [create-checkout-session] Error handling mailing list opt-in:', error)
                // Don't fail the checkout if mailing list fails
            }
        }

        // Fetch the event to check its status and availability
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, status, max_attendees, current_attendees, entry_close_date')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            console.log('❌ [create-checkout-session] Event not found:', {
                eventId,
                error: eventError?.message,
                eventExists: !!event
            })
            return NextResponse.json({ error: 'Event not found' }, { status: 400 })
        }
        
        // For legitimate resumed bookings (status = 'pending'), bypass event validation checks
        const isLegitimateResume = booking.status === 'pending'
        
        if (!isLegitimateResume) {
            if (event.status !== 'published' || event.status === 'entry_closed') {
                console.log('❌ [create-checkout-session] Event not open for booking:', {
                    eventId,
                    status: event.status
                })
                return NextResponse.json({ error: 'This event is not open for booking.' }, { status: 400 })
            }
            if (event.max_attendees != null && event.current_attendees >= event.max_attendees) {
                console.log('❌ [create-checkout-session] Event is sold out:', {
                    eventId,
                    max: event.max_attendees,
                    current: event.current_attendees
                })
                return NextResponse.json({ error: 'This event is sold out.' }, { status: 400 })
            }
            if (event.entry_close_date && new Date(event.entry_close_date) < new Date()) {
                console.log('❌ [create-checkout-session] Entry close date has passed:', {
                    eventId,
                    entryCloseDate: event.entry_close_date
                })
                return NextResponse.json({ error: 'Entries for this event are now closed (entry close date has passed).' }, { status: 400 })
            }
        } else {
            console.log('✅ [create-checkout-session] Bypassing event validation for legitimate resume booking:', {
                bookingId,
                bookingStatus: booking.status,
                eventId
            })
        }

        // Calculate processing fee (1.7% + $0.30) based on booking total amount (server-side trusted)
        const bookingTotalAud = Number(booking.total_amount) || 0
        const processingFeeAud = bookingTotalAud > 0 ? (bookingTotalAud * 0.017 + 0.30) : 0
        const processingFeeCents = Math.round(processingFeeAud * 100)

        // Create line items for Stripe checkout session
        let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

        if (isMultiSectionEvent && selectedSections && selectedSections.length > 0) {
            // For multi-section events, create separate line items for each section
            lineItems = selectedSections.map((selection: { section: { title: string }, pricing: { price: number }, quantity: number }) => ({
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: `${eventTitle} - ${selection.section.title}`,
                        description: `${selection.section.title} section ticket`,
                    },
                    unit_amount: Math.round(selection.pricing.price * 100), // Convert to cents
                },
                quantity: selection.quantity,
            }))
        } else {
            // For single events, create a single line item
            lineItems = [{
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: eventTitle,
                        description: `${quantity} ticket${quantity > 1 ? 's' : ''}`,
                    },
                    unit_amount: Math.round((bookingTotalAud / quantity) * 100), // Convert to cents
                },
                quantity: quantity,
            }]
        }

        // Add processing fee as a transparent line item if applicable
        if (processingFeeCents > 0) {
            lineItems.push({
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: 'Processing fee',
                        description: '1.7% + A$0.30'
                    },
                    unit_amount: processingFeeCents,
                },
                quantity: 1,
            })
        }

        // Create Stripe checkout session (server-trusted amounts)
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/cancel-checkout?booking_id={CHECKOUT_SESSION_ID}`,
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

        // Try to get payment intent from initial session first
        let paymentIntentId = session.payment_intent as string | null

        // If not available, retrieve the session with expanded details
        if (!paymentIntentId) {
            try {
                const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['payment_intent']
                })

                if (fullSession.payment_intent && typeof fullSession.payment_intent !== 'string') {
                    paymentIntentId = fullSession.payment_intent.id
                } else if (typeof fullSession.payment_intent === 'string') {
                    paymentIntentId = fullSession.payment_intent
                }
            } catch (retrieveError) {
                console.error('❌ [create-checkout-session] Error retrieving full session:', retrieveError)
            }
        }

        // Update booking with Stripe session ID and payment intent ID (if available)
        const updateData: Record<string, unknown> = { stripe_session_id: session.id }

        if (paymentIntentId) {
            updateData.stripe_payment_intent_id = paymentIntentId
        }

        const { error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', bookingId)

        if (updateError) {
            console.error('❌ [create-checkout-session] Error updating booking with Stripe data:', updateError)
            return NextResponse.json(
                { error: 'Failed to update booking with payment information' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            sessionId: session.id,
            url: session.url
        })
    } catch (error) {
        console.error('❌ [create-checkout-session] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }
  
  return createCheckoutSessionHandler(request)
}