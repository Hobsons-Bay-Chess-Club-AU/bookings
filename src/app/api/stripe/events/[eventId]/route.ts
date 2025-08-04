import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentProfile } from '@/lib/utils/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

export async function GET(
    request: NextRequest, context: unknown) {
    const { params } = context as { params: { eventId: string } };
    try {
        // Check authentication and authorization
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Check if user has permission to view payment events
        if (!['admin', 'customer_support'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            )
        }

        const { eventId } = params

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        // Retrieve the event from Stripe
        const event = await stripe.events.retrieve(eventId)

        // Return the event data (Stripe automatically handles sensitive data filtering)
        return NextResponse.json(event)

    } catch (error: unknown) {
        console.error('Error retrieving Stripe event:', error)

        if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: string }).type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to retrieve event' },
            { status: 500 }
        )
    }
}
