import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()

    // Find bookings with session IDs but missing payment intent IDs
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, stripe_session_id, stripe_payment_intent_id, status')
      .not('stripe_session_id', 'is', null)
      .is('stripe_payment_intent_id', null)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    if (!bookings?.length) {
      return NextResponse.json({ 
        message: 'No bookings found with missing payment intent IDs',
        fixed: 0 
      })
    }

    console.log(`Found ${bookings.length} bookings missing payment intent IDs`)
    
    let fixedCount = 0
    const results = []

    for (const booking of bookings) {
      try {
        // Retrieve the Stripe session to get payment intent ID
        const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id, {
          expand: ['payment_intent']
        })

        let paymentIntentId = null
        if (session.payment_intent && typeof session.payment_intent !== 'string') {
          paymentIntentId = session.payment_intent.id
        } else if (typeof session.payment_intent === 'string') {
          paymentIntentId = session.payment_intent
        }

        if (paymentIntentId) {
          // Update the booking with payment intent ID
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq('id', booking.id)

          if (!updateError) {
            fixedCount++
            results.push({
              bookingId: booking.id,
              sessionId: booking.stripe_session_id,
              paymentIntentId: paymentIntentId,
              status: 'fixed'
            })
            console.log(`Fixed booking ${booking.id} with payment intent ${paymentIntentId}`)
          } else {
            results.push({
              bookingId: booking.id,
              error: updateError.message,
              status: 'error'
            })
          }
        } else {
          results.push({
            bookingId: booking.id,
            sessionId: booking.stripe_session_id,
            status: 'no_payment_intent'
          })
        }
      } catch (stripeError) {
        console.error(`Error processing booking ${booking.id}:`, stripeError)
        results.push({
          bookingId: booking.id,
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
          status: 'stripe_error'
        })
      }
    }

    return NextResponse.json({
      message: `Fixed ${fixedCount} out of ${bookings.length} bookings`,
      fixed: fixedCount,
      total: bookings.length,
      results
    })

  } catch (error) {
    console.error('Error in fix-payment-intents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}