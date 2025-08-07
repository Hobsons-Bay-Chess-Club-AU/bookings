import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
    handleCheckoutSessionCompleted,
    handleCheckoutSessionExpired,
    handlePaymentIntentCreated,
    handlePaymentIntentSucceeded,
    handleChargeSucceeded,
    handlePaymentIntentPaymentFailed,
    handleChargeDisputeCreated
} from './handlers'

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

        console.log('🔔 WEBHOOK RECEIVED:', {
            eventType: event.type,
            eventId: event.id,
            timestamp: new Date().toISOString()
        })

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await handleCheckoutSessionCompleted(event)
                    break

                case 'checkout.session.expired':
                    await handleCheckoutSessionExpired(event)
                    break

                case 'payment_intent.created':
                    await handlePaymentIntentCreated(event)
                    break

                case 'payment_intent.succeeded':
                    await handlePaymentIntentSucceeded(event)
                    break

                case 'charge.succeeded':
                    await handleChargeSucceeded(event)
                    break

                case 'payment_intent.payment_failed':
                    await handlePaymentIntentPaymentFailed(event)
                    break

                case 'charge.dispute.created':
                    await handleChargeDisputeCreated(event)
                    break

                case 'invoice.payment_succeeded':
                    // Handle subscription payments if needed
                    console.log('📄 INVOICE.PAYMENT_SUCCEEDED (not implemented):', {
                        eventId: event.id,
                        timestamp: new Date().toISOString()
                    })
                    break

                default:
                    console.log('⚠️ UNHANDLED WEBHOOK EVENT:', {
                        eventType: event.type,
                        eventId: event.id,
                        timestamp: new Date().toISOString()
                    })
                    break
            }

            console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY:', {
                eventType: event.type,
                eventId: event.id,
                timestamp: new Date().toISOString()
            })

            return NextResponse.json({ received: true })

        } catch (handlerError) {
            console.error('❌ WEBHOOK HANDLER ERROR:', {
                eventType: event.type,
                eventId: event.id,
                error: handlerError instanceof Error ? handlerError.message : 'Unknown error',
                errorStack: handlerError instanceof Error ? handlerError.stack : undefined,
                timestamp: new Date().toISOString()
            })

            // Return 200 to acknowledge receipt, but log the error
            return NextResponse.json(
                { error: 'Handler error occurred' },
                { status: 200 }
            )
        }

    } catch (error) {
        console.error('💥 WEBHOOK PROCESSING ERROR:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        })

        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        )
    }
}