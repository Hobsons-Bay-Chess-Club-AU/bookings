import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhitelistedBookingEmail } from '@/lib/email/service'

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

        // Fetch the booking with event and user details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                events!bookings_event_id_fkey (*),
                profiles!bookings_user_id_fkey (*)
            `)
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            console.error('❌ [SEND-WHITELISTED-EMAIL] Booking not found:', {
                bookingId,
                error: bookingError?.message
            })
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            )
        }

        // Only send email for whitelisted bookings
        if (booking.status !== 'whitelisted') {
            console.log('⚠️ [SEND-WHITELISTED-EMAIL] Booking is not whitelisted, skipping email:', {
                bookingId,
                status: booking.status
            })
            return NextResponse.json(
                { message: 'Booking is not whitelisted, email not sent' },
                { status: 200 }
            )
        }

        console.log('📧 [SEND-WHITELISTED-EMAIL] Sending whitelisted booking email:', {
            bookingId,
            eventTitle: booking.events?.title,
            userEmail: booking.profiles?.email
        })

        // Send the whitelisted booking email
        const emailResult = await sendWhitelistedBookingEmail({
            booking: booking,
            event: booking.events,
            user: booking.profiles
        })

        if (emailResult.success) {
            console.log('✅ [SEND-WHITELISTED-EMAIL] Email sent successfully:', {
                bookingId,
                emailId: emailResult.data?.id
            })
            return NextResponse.json({ success: true })
        } else {
            console.error('❌ [SEND-WHITELISTED-EMAIL] Failed to send email:', {
                bookingId,
                error: emailResult.error
            })
            return NextResponse.json(
                { error: emailResult.error },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error('💥 [SEND-WHITELISTED-EMAIL] Exception:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
