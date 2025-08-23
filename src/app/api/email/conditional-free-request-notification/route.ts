import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { renderConditionalFreeRequestNotificationEmail } from '@/lib/email/templates/conditional-free-request-notification'
import { sendEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
    try {
        const { bookingId } = await request.json()

        if (!bookingId) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Fetch booking with all related data
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                events (
                    id,
                    title,
                    start_date,
                    end_date,
                    location,
                    organizer_id
                ),
                profiles!bookings_user_id_fkey (
                    full_name,
                    email
                ),
                participants (*)
            `)
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            console.error('Error fetching booking:', bookingError)
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            )
        }

        // Fetch organizer details
        const { data: organizer, error: organizerError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.events.organizer_id)
            .single()

        if (organizerError || !organizer) {
            console.error('Error fetching organizer:', organizerError)
            return NextResponse.json(
                { error: 'Organizer not found' },
                { status: 404 }
            )
        }

        // Prepare email data
        const emailData = {
            organizerName: organizer.full_name || 'Organizer',
            eventTitle: booking.events.title,
            eventDate: booking.events.start_date,
            eventLocation: booking.events.location,
            bookingId: booking.id,
            participantCount: booking.quantity,
            customerName: booking.profiles.full_name || 'Customer',
            customerEmail: booking.profiles.email,
            participants: booking.participants,
            eventId: booking.events.id
        }

        // Render email template
        const { html } = await renderConditionalFreeRequestNotificationEmail(emailData)

        // Send email to organizer
        const emailResponse = await sendEmail({
            to: organizer.email,
            subject: `Conditional Free Entry Request - ${booking.events.title}`,
            html
        })

        if (emailResponse.error) {
            console.error('Error sending conditional free request notification email:', emailResponse.error)
            return NextResponse.json(
                { error: 'Failed to send notification email' },
                { status: 500 }
            )
        }

        console.log('✅ Conditional free request notification email sent successfully to organizer:', organizer.email)

        return NextResponse.json({ 
            message: 'Conditional free request notification sent successfully',
            organizerEmail: organizer.email
        })

    } catch (error) {
        console.error('Error in conditional free request notification API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
