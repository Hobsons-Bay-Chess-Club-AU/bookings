import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export interface WebhookContext {
    supabase: ReturnType<typeof createServiceClient>
    event: Stripe.Event
}

export interface BookingWithRelations {
    id: string
    booking_id?: string
    status: string
    quantity: number
    total_amount: number
    stripe_payment_intent_id?: string
    user_id: string
    event_id: string
    created_at: string
    updated_at: string
    events: {
        id: string
        title: string
        start_date: string
        location: string
        description?: string
        organizer_name?: string
        organizer_email?: string
        organizer_phone?: string
        settings?: Record<string, unknown>
        organizer?: {
            email: string
            full_name?: string
        }
    }
    profiles: {
        id: string
        email: string
        full_name?: string
    }
}

export interface PaymentEventData {
    bookingId: string
    eventType: string
    eventId: string
} 