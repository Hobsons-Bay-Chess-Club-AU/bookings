import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBookingConfirmationEmail, sendWhitelistedBookingEmail, sendOrganizerBookingNotificationEmail } from '@/lib/email/service'
import { PaymentEventData } from './types'

// Create service role client for webhooks to bypass RLS
export const createWebhookSupabaseClient = () => {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Helper function to capture payment events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const capturePaymentEvent = async (supabase: any, data: PaymentEventData) => {
    try {
        const { error } = await supabase
            .from('payment_events')
            .insert({
                booking_id: data.bookingId,
                stripe_event_type: data.eventType,
                stripe_event_id: data.eventId
            })

        if (error) {
            console.error('Error capturing payment event:', error)
        } else {
            console.log('✅ Payment event captured:', {
                bookingId: data.bookingId,
                eventType: data.eventType,
                eventId: data.eventId,
                timestamp: new Date().toISOString()
            })
        }
    } catch (error) {
        console.error('Error capturing payment event:', error)
    }
}

// Helper function to send booking confirmation email
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendBookingConfirmationEmailWithLogging = async (booking: any, event: any, user: any) => {
    try {
        console.log('📧 [WEBHOOK] Attempting to send booking confirmation email:', {
            bookingId: booking.id,
            userEmail: user.email,
            eventTitle: event.title,
            bookingStatus: booking.status,
            timestamp: new Date().toISOString()
        })

        // Choose the appropriate email function based on booking status
        const emailFunction = booking.status === 'whitelisted' ? sendWhitelistedBookingEmail : sendBookingConfirmationEmail
        const emailType = booking.status === 'whitelisted' ? 'whitelisted booking' : 'booking confirmation'

        const emailResult = await emailFunction({
            booking: booking,
            event: event,
            user: user
        })

        if (emailResult.success) {
            console.log(`✅ [WEBHOOK] ${emailType} email sent successfully:`, {
                bookingId: booking.id,
                emailId: emailResult.data?.id,
                userEmail: user.email,
                eventTitle: event.title,
                bookingStatus: booking.status,
                timestamp: new Date().toISOString()
            })
        } else {
            console.error(`❌ [WEBHOOK] ${emailType} email failed:`, {
                bookingId: booking.id,
                error: emailResult.error,
                userEmail: user.email,
                eventTitle: event.title,
                bookingStatus: booking.status,
                timestamp: new Date().toISOString()
            })
        }

        return emailResult
    } catch (emailError) {
        console.error('💥 [WEBHOOK] Exception sending confirmation email:', {
            bookingId: booking.id,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            errorStack: emailError instanceof Error ? emailError.stack : undefined,
            userEmail: user.email,
            eventTitle: event.title,
            bookingStatus: booking.status,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Exception occurred' }
    }
}

// Helper function to send organizer notification email
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendOrganizerNotificationEmailWithLogging = async (supabase: any, booking: any) => {
    try {
        if (booking.events?.settings?.notify_organizer_on_booking && booking.events?.organizer?.email) {
            console.log('📧 [WEBHOOK] Attempting to send organizer notification email:', {
                bookingId: booking.id,
                organizerEmail: booking.events.organizer.email,
                eventTitle: booking.events.title,
                timestamp: new Date().toISOString()
            })

            // Fetch participants for this booking
            const { data: participants } = await supabase
                .from('participants')
                .select('*')
                .eq('booking_id', booking.id)
                .order('created_at', { ascending: true })

            await sendOrganizerBookingNotificationEmail({
                organizerEmail: booking.events.organizer.email,
                organizerName: booking.events.organizer.full_name || booking.events.organizer.email,
                eventTitle: booking.events.title,
                eventDate: booking.events.start_date,
                eventLocation: booking.events.location,
                bookingId: booking.booking_id || booking.id,
                participantCount: booking.quantity,
                totalAmount: booking.total_amount,
                customerName: booking.profiles.full_name || booking.profiles.email,
                customerEmail: booking.profiles.email,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                participants: (participants as any) || []
            })

            console.log('✅ [WEBHOOK] Organizer notification email sent successfully:', {
                bookingId: booking.id,
                organizerEmail: booking.events.organizer.email,
                eventTitle: booking.events.title,
                timestamp: new Date().toISOString()
            })

            return { success: true }
        } else {
            console.log('⏭️ [WEBHOOK] Skipping organizer notification email:', {
                bookingId: booking.id,
                reason: 'Organizer notification disabled or no organizer email',
                timestamp: new Date().toISOString()
            })
            return { success: true, skipped: true }
        }
    } catch (organizerEmailError) {
        console.error('❌ [WEBHOOK] Failed to send organizer notification email:', {
            bookingId: booking.id,
            error: organizerEmailError instanceof Error ? organizerEmailError.message : 'Unknown error',
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send organizer notification' }
    }
} 