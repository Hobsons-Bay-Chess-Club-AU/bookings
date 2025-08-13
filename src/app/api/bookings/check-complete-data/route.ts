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
                    custom_form_fields,
                    has_sections
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
        
        // Debug logging for data completeness check
        console.log('🔍 Data completeness check:', {
            participantsCount: booking.participants?.length,
            bookingQuantity: booking.quantity,
            participants: booking.participants?.map((p: { first_name?: string; last_name?: string; contact_email?: string }) => ({
                first_name: p.first_name,
                last_name: p.last_name,
                contact_email: p.contact_email,
                hasRequiredFields: !!(p.first_name && p.last_name && p.contact_email)
            })),
            hasCompleteData,
            hasFormData
        })

        const canResume = hasCompleteData && hasFormData

        // Get section bookings for multi-section events
        let sectionBookings = null
        console.log('🔍 API Debug - Event has sections:', booking.events.has_sections)
        
        if (booking.events.has_sections) {
            console.log('🔍 API Debug - Fetching section bookings for booking ID:', bookingId)
            
            const { data: sectionBookingsData, error: sectionBookingsError } = await supabase
                .from('section_bookings')
                .select(`
                    *,
                    section:event_sections!section_bookings_section_id_fkey (
                        id,
                        title,
                        description,
                        max_seats,
                        current_seats
                    ),
                    pricing:section_pricing!section_bookings_pricing_id_fkey (
                        id,
                        name,
                        description,
                        price,
                        pricing_type,
                        membership_type
                    )
                `)
                .eq('booking_id', bookingId)
            
            if (sectionBookingsError) {
                console.error('❌ API Error fetching section bookings:', sectionBookingsError)
            }
            
            sectionBookings = sectionBookingsData || []
            console.log('🔍 API Debug - Section bookings found:', sectionBookings.length, sectionBookings)
        } else {
            console.log('🔍 API Debug - Event does not have sections, skipping section bookings fetch')
        }

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
                created_at: booking.created_at,
                section_bookings: sectionBookings
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
