import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        // Get the pending booking with all related data
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                events!bookings_event_id_fkey (
                    id,
                    title,
                    start_date,
                    end_date,
                    location,
                    custom_form_fields
                ),
                profiles!bookings_user_id_fkey (
                    id,
                    email,
                    full_name
                ),
                participants (
                    id,
                    first_name,
                    last_name,
                    contact_email,
                    date_of_birth,
                    custom_data
                )
            `)
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single()

        if (bookingError || !booking) {
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

        // Check if we have complete data for resumption
        const hasCompleteData = booking.participants && 
                               booking.participants.length === booking.quantity &&
                               booking.participants.every((p: { first_name?: string; last_name?: string; contact_email?: string }) => 
                                   p.first_name && 
                                   p.last_name && 
                                   p.contact_email
                               )

        // Check if event form fields are satisfied
        const formFields = booking.events.custom_form_fields || []
        const hasFormData = formFields.length === 0 || 
                           booking.participants.every((p: { custom_data?: Record<string, unknown> }) => 
                               !p.custom_data || 
                               Object.keys(p.custom_data).length >= formFields.length
                           )

        const canResume = hasCompleteData && hasFormData

        return NextResponse.json({
            canResume,
            hasCompleteData,
            hasFormData,
            booking: {
                id: booking.id,
                eventId: booking.event_id,
                eventTitle: booking.events.title,
                quantity: booking.quantity,
                totalAmount: booking.total_amount,
                participants: booking.participants,
                formFields: formFields,
                created_at: booking.created_at
            }
        })

    } catch (error) {
        console.error('❌ [check-complete-data] Error:', error)
        return NextResponse.json(
            { error: 'Failed to check booking data' },
            { status: 500 }
        )
    }
}
