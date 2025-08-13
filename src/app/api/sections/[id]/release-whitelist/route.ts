import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { sendWhitelistReleasedEmail } from '@/lib/email/service'

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sectionId } = await context.params
        const profile = await getCurrentProfile()
        const supabase = await createClient()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { bookingId } = await request.json()
        
        if (!bookingId) {
            return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
        }

        // Check if user is organizer of this section's event or admin
        const { data: section, error: sectionError } = await supabase
            .from('event_sections')
            .select(`
                *,
                events!inner(
                    id,
                    title,
                    start_date,
                    end_date,
                    location,
                    description,
                    organizer_id,
                    organizer:profiles!events_organizer_id_fkey (full_name, email)
                )
            `)
            .eq('id', sectionId)
            .single()

        if (sectionError || !section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }

        if (section.events.organizer_id !== profile.id && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Check if section booking exists and is whitelisted
        const { data: sectionBooking, error: sectionBookingError } = await supabase
            .from('section_bookings')
            .select(`
                *,
                booking:bookings!section_bookings_booking_id_fkey (
                    id,
                    booking_id,
                    quantity,
                    total_amount,
                    booking_date,
                    user:profiles!bookings_user_id_fkey (id, email, full_name)
                )
            `)
            .eq('booking_id', bookingId)
            .eq('section_id', sectionId)
            .eq('is_whitelisted', true)
            .single()

        if (sectionBookingError || !sectionBooking) {
            return NextResponse.json({ error: 'Whitelisted section booking not found' }, { status: 404 })
        }

        // Release from whitelist
        const { error: updateError } = await supabase
            .from('section_bookings')
            .update({ 
                status: 'pending',
                is_whitelisted: false,
                released_from_whitelist_at: new Date().toISOString()
            })
            .eq('id', sectionBooking.id)

        if (updateError) {
            console.error('Error releasing section whitelist:', updateError)
            return NextResponse.json({ error: 'Failed to release whitelist' }, { status: 500 })
        }

        // Check if all section bookings in this booking are now released
        const { data: allSectionBookings } = await supabase
            .from('section_bookings')
            .select('is_whitelisted')
            .eq('booking_id', bookingId)

        const allReleased = allSectionBookings?.every(sb => !sb.is_whitelisted) ?? false

        // If all sections are released, update the main booking status
        if (allReleased) {
            await supabase
                .from('bookings')
                .update({ status: 'pending' })
                .eq('id', bookingId)
        }

        // Send email notification
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const dashboardUrl = `${baseUrl}/dashboard`
        const completePaymentUrl = `${baseUrl}/events/${section.events.id}?step=4&resume=${bookingId}`
        
        if (sectionBooking.booking?.user?.email) {
            await sendWhitelistReleasedEmail({
                userEmail: sectionBooking.booking.user.email,
                userName: sectionBooking.booking.user.full_name || undefined,
                eventTitle: `${section.events.title} - ${section.title}`,
                bookingId: sectionBooking.booking.booking_id || sectionBooking.booking.id,
                dashboardUrl,
                completePaymentUrl,
                eventDate: section.events.start_date,
                eventLocation: section.events.location,
                eventEndDate: section.events.end_date,
                participantCount: sectionBooking.quantity,
                totalAmount: sectionBooking.total_amount,
                organizerName: section.events.organizer?.full_name || 'Event Organizer',
                organizerEmail: section.events.organizer?.email || '',
                organizerPhone: undefined,
                eventDescription: section.events.description,
                participants: [], // Will be populated if needed
                sectionName: section.title
            })
        }

        return NextResponse.json({ 
            success: true,
            allReleased,
            sectionBooking: {
                id: sectionBooking.id,
                status: 'pending',
                is_whitelisted: false
            }
        })
    } catch (error) {
        console.error('Error releasing section whitelist:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
