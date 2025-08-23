import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'
import { renderConditionalFreeApprovedEmail } from '@/lib/email/templates/conditional-free-approved'

export async function POST(request: NextRequest) {
    try {
        const { bookingId, userEmail, userName, eventTitle } = await request.json()

        if (!bookingId || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get booking details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events(title, start_date, location)
            `)
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            )
        }

        // Send approval email
        const emailData = {
            userName: userName || 'there',
            eventTitle: eventTitle || booking.event?.title || 'Event',
            eventDate: booking.event?.start_date ? new Date(booking.event.start_date).toLocaleDateString() : 'TBD',
            eventLocation: booking.event?.location || 'TBD',
            bookingId: bookingId
        }

        // Render the email template
        const { html } = await renderConditionalFreeApprovedEmail(emailData)

        await sendEmail({
            to: userEmail,
            subject: `Your conditional free entry has been approved - ${emailData.eventTitle}`,
            html: html
        })

        return NextResponse.json({
            success: true,
            message: 'Approval email sent successfully'
        })

    } catch (error) {
        console.error('Error sending conditional free approval email:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
