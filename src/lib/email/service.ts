// Send a generic email
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    console.log('📧 [EMAIL SERVICE] Starting generic email send:', {
        to,
        subject,
        htmlLength: html.length,
        timestamp: new Date().toISOString()
    })

    // Check environment variables
    console.log('🔧 [EMAIL SERVICE] Environment check:', {
        hasResendFromEmail: !!process.env.RESEND_FROM_EMAIL,
        resendFromEmail: process.env.RESEND_FROM_EMAIL,
        hasResendApiKey: !!process.env.RESEND_API_KEY,
        nodeEnv: process.env.NODE_ENV
    })

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || '',
            to,
            subject,
            html
        })
        if (error) {
            console.error('❌ [EMAIL SERVICE] Failed to send email:', {
                error: error.message,
                errorDetails: error,
                to,
                subject,
                timestamp: new Date().toISOString()
            })
            return { success: false, error: error.message }
        }
        console.log('✅ [EMAIL SERVICE] Email sent successfully:', {
            emailId: data?.id,
            to,
            subject,
            timestamp: new Date().toISOString()
        })
        return { success: true, data }
    } catch (error) {
        console.error('💥 [EMAIL SERVICE] Exception sending email:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            to,
            subject,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send email' }
    }
}

// Send event update email
export async function sendEventUpdateEmail({
    userEmail,
    eventName,
    eventDate,
    eventLocation,
    updateType,
    updateDetails,
    organizerName,
    organizerEmail
}: {
    userEmail: string
    eventName: string
    eventDate: string
    eventLocation: string
    updateType: 'cancelled' | 'rescheduled' | 'updated'
    updateDetails: string
    organizerName?: string
    organizerEmail: string
}) {
    try {
        const { html, text } = await renderEventUpdateEmail({
            eventName,
            eventDate,
            eventLocation,
            updateType,
            updateDetails,
            organizerName: organizerName || 'Event Organizer',
            organizerEmail
        })
        
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || '',
            to: userEmail,
            subject: `Event Update: ${eventName}`,
            html,
            text
        })
        if (error) {
            console.error('Failed to send event update email:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data }
    } catch (error) {
        console.error('Error sending event update email:', error)
        return { success: false, error: 'Failed to send event update email' }
    }
}
import { Booking, Event, Profile } from '@/lib/types/database'
import { 
    renderBookingConfirmationEmail, 
    renderEventUpdateEmail, 
    renderWelcomeEmail, 
    renderPasswordResetEmail,
    renderOrganizerBookingNotificationEmail,
    renderWhitelistedBookingEmail,
    renderWhitelistReleasedEmail
} from './templates/index'
import { resend } from './client'
import { createClient } from '@/lib/supabase/server'
import { CalendarEvent, generateGoogleCalendarUrl, generateOutlookCalendarUrl, generateIcsFile } from '@/lib/utils/calendar'

interface EmailData {
    booking: Booking
    event: Event
    user: Profile
}

export async function sendBookingConfirmationEmail(data: EmailData) {
    const { booking, event, user } = data

    console.log('📧 [BOOKING CONFIRMATION] Starting email send:', {
        bookingId: booking.id,
        eventId: event.id,
        eventTitle: event.title,
        userEmail: user.email,
        userName: user.full_name,
        status: booking.status,
        timestamp: new Date().toISOString()
    })

    // Validate required data
    if (!user.email) {
        console.error('❌ [BOOKING CONFIRMATION] Missing user email:', {
            bookingId: booking.id,
            userId: user.id,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Missing user email' }
    }

    if (!event.title) {
        console.error('❌ [BOOKING CONFIRMATION] Missing event title:', {
            bookingId: booking.id,
            eventId: event.id,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Missing event title' }
    }

    // Fetch participants for this booking
    const supabase = await createClient()
    console.log('🔍 [BOOKING CONFIRMATION] Fetching participants for booking:', {
        bookingId: booking.id,
        timestamp: new Date().toISOString()
    })

    const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
            *,
            section:event_sections(*)
        `)
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

    if (participantsError) {
        console.error('❌ [BOOKING CONFIRMATION] Failed to fetch participants:', {
            bookingId: booking.id,
            error: participantsError.message,
            timestamp: new Date().toISOString()
        })
    } else {
        console.log('✅ [BOOKING CONFIRMATION] Participants fetched:', {
            bookingId: booking.id,
            participantCount: participants?.length || 0,
            timestamp: new Date().toISOString()
        })
    }

    try {
        console.log('🎨 [BOOKING CONFIRMATION] Rendering email template:', {
            bookingId: booking.id,
            timestamp: new Date().toISOString()
        })

        // Prepare calendar event and links
        const startDate = new Date(event.start_date)
        const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
        const calendarEvent: CalendarEvent = {
            title: event.title,
            description: event.description,
            location: event.location,
            startDate,
            endDate,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${event.id}`,
            organizerName: (event && 'organizer_name' in event ? (event as Event & { organizer_name?: string }).organizer_name : undefined) || undefined,
            organizerEmail: (event && 'organizer_email' in event ? (event as Event & { organizer_email?: string }).organizer_email : undefined) || undefined
        }

        const googleCalendarUrl = generateGoogleCalendarUrl(calendarEvent)
        const outlookCalendarUrl = generateOutlookCalendarUrl(calendarEvent)

        // Determine if this is a multi-section event
        const isMultiSectionEvent = Boolean(booking.is_multi_section) || (participants && participants.some(p => p.section)) || false

        const { html, text } = await renderBookingConfirmationEmail({
            bookingId: booking.booking_id || booking.id,
            eventName: event.title,
            eventDate: event.start_date,
            eventLocation: event.location,
            eventEndDate: event.end_date,
            participantCount: booking.quantity,
            totalAmount: booking.total_amount,
            organizerName: (event && 'organizer_name' in event ? (event as Event & { organizer_name?: string }).organizer_name : undefined) || 'Event Organizer',
            organizerEmail: (event && 'organizer_email' in event ? (event as Event & { organizer_email?: string }).organizer_email : undefined) || '',
            organizerPhone: (event && 'organizer_phone' in event ? (event as Event & { organizer_phone?: string }).organizer_phone : undefined) || '',
            eventDescription: event.description,
            participants: participants || [],
            calendarUrls: {
                google: googleCalendarUrl,
                outlook: outlookCalendarUrl
            },
            hasIcsAttachment: true,
            isMultiSectionEvent
        })

        console.log('✅ [BOOKING CONFIRMATION] Email template rendered:', {
            bookingId: booking.id,
            htmlLength: html.length,
            textLength: text.length,
            timestamp: new Date().toISOString()
        })

        console.log('📤 [BOOKING CONFIRMATION] Sending email via Resend:', {
            bookingId: booking.id,
            from: process.env.RESEND_FROM_EMAIL || "",
            to: user.email,
            subject: `Booking Confirmed: ${event.title}`,
            timestamp: new Date().toISOString()
        })

        const icsContent = generateIcsFile(calendarEvent)
        const icsFilename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${startDate
            .toISOString()
            .slice(0, 10)}.ics`

        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: user.email,
            subject: `Booking Confirmed: ${event.title}`,
            html,
            text,
            attachments: [
                {
                    filename: icsFilename,
                    content: Buffer.from(icsContent),
                    contentType: 'text/calendar; charset=utf-8'
                }
            ]
        })

        if (error) {
            console.error('❌ [BOOKING CONFIRMATION] Resend API error:', {
                bookingId: booking.id,
                error: error.message,
                errorDetails: error,
                timestamp: new Date().toISOString()
            })
            return { success: false, error: error.message }
        }

        console.log('✅ [BOOKING CONFIRMATION] Email sent successfully:', {
            bookingId: booking.id,
            emailId: emailData?.id,
            userEmail: user.email,
            eventTitle: event.title,
            timestamp: new Date().toISOString()
        })

        return { success: true, data: emailData }
    } catch (error: unknown) {
        console.error('💥 [BOOKING CONFIRMATION] Exception during email send:', {
            bookingId: booking.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send booking confirmation email' }
    }
}

export async function sendWhitelistedBookingEmail(data: EmailData) {
    const { booking, event, user } = data

    console.log('📧 [WHITELISTED BOOKING] Starting email send:', {
        bookingId: booking.id,
        eventId: event.id,
        eventTitle: event.title,
        userEmail: user.email,
        userName: user.full_name,
        timestamp: new Date().toISOString()
    })

    // Validate required data
    if (!user.email) {
        console.error('❌ [WHITELISTED BOOKING] Missing user email:', {
            bookingId: booking.id,
            userId: user.id,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Missing user email' }
    }

    if (!event.title) {
        console.error('❌ [WHITELISTED BOOKING] Missing event title:', {
            bookingId: booking.id,
            eventId: event.id,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Missing event title' }
    }

    // Fetch participants for this booking
    const supabase = await createClient()
    console.log('🔍 [WHITELISTED BOOKING] Fetching participants for booking:', {
        bookingId: booking.id,
        timestamp: new Date().toISOString()
    })

    const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
            *,
            section:event_sections(*)
        `)
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

    if (participantsError) {
        console.error('❌ [WHITELISTED BOOKING] Failed to fetch participants:', {
            bookingId: booking.id,
            error: participantsError.message,
            timestamp: new Date().toISOString()
        })
    } else {
        console.log('✅ [WHITELISTED BOOKING] Participants fetched:', {
            bookingId: booking.id,
            participantCount: participants?.length || 0,
            timestamp: new Date().toISOString()
        })
    }

    try {
        console.log('🎨 [WHITELISTED BOOKING] Rendering email template:', {
            bookingId: booking.id,
            timestamp: new Date().toISOString()
        })

        // Determine if this is a multi-section event
        const isMultiSectionEvent = Boolean(booking.is_multi_section) || (participants && participants.some(p => p.section)) || false

        const { html, text } = await renderWhitelistedBookingEmail({
            bookingId: booking.booking_id || booking.id,
            eventName: event.title,
            eventDate: event.start_date,
            eventLocation: event.location,
            eventEndDate: event.end_date,
            participantCount: booking.quantity,
            totalAmount: booking.total_amount,
            organizerName: (event && 'organizer_name' in event ? (event as Event & { organizer_name?: string }).organizer_name : undefined) || 'Event Organizer',
            organizerEmail: (event && 'organizer_email' in event ? (event as Event & { organizer_email?: string }).organizer_email : undefined) || '',
            organizerPhone: (event && 'organizer_phone' in event ? (event as Event & { organizer_phone?: string }).organizer_phone : undefined) || '',
            eventDescription: event.description,
            participants: participants || [],
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
            isMultiSectionEvent
        })

        console.log('✅ [WHITELISTED BOOKING] Email template rendered:', {
            bookingId: booking.id,
            htmlLength: html.length,
            textLength: text.length,
            timestamp: new Date().toISOString()
        })

        console.log('📤 [WHITELISTED BOOKING] Sending email via Resend:', {
            bookingId: booking.id,
            from: process.env.RESEND_FROM_EMAIL || "",
            to: user.email,
            subject: `Booking Reserved: ${event.title}`,
            timestamp: new Date().toISOString()
        })

        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: user.email,
            subject: `Booking Reserved: ${event.title}`,
            html,
            text
        })

        if (error) {
            console.error('❌ [WHITELISTED BOOKING] Resend API error:', {
                bookingId: booking.id,
                error: error.message,
                errorDetails: error,
                timestamp: new Date().toISOString()
            })
            return { success: false, error: error.message }
        }

        console.log('✅ [WHITELISTED BOOKING] Email sent successfully:', {
            bookingId: booking.id,
            emailId: emailData?.id,
            userEmail: user.email,
            eventTitle: event.title,
            timestamp: new Date().toISOString()
        })

        return { success: true, data: emailData }
    } catch (error: unknown) {
        console.error('💥 [WHITELISTED BOOKING] Exception during email send:', {
            bookingId: booking.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send whitelisted booking email' }
    }
}


export async function sendWelcomeEmail(userEmail: string, userName: string) {
    try {
        const { html, text } = await renderWelcomeEmail({
            userName: userName,
            userEmail,
        })
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: userEmail,
            subject: 'Welcome to HBCC Bookings!',
            html,
            text
        })
        if (error) {
            console.error('Failed to send welcome email:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data }
    } catch (error: unknown) {
        console.error('Error sending welcome email:', error)
        return { success: false, error: 'Failed to send welcome email' }
    }
}


export async function sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string) {
    try {
        const { html, text } = await renderPasswordResetEmail({
            userName: userName,
            resetUrl: resetUrl
        })
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: userEmail,
            subject: 'Reset Your Password - HBCC Bookings',
            html,
            text
        })
        if (error) {
            console.error('Failed to send password reset email:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data }
    } catch (error: unknown) {
        console.error('Error sending password reset email:', error)
        return { success: false, error: 'Failed to send password reset email' }
    }
}

export async function sendOrganizerBookingNotificationEmail(data: {
    organizerEmail: string
    organizerName: string
    eventTitle: string
    eventDate: string
    eventLocation: string
    bookingId: string
    participantCount: number
    totalAmount: number
    customerName: string
    customerEmail: string
    participants?: Array<{
        first_name: string
        last_name: string
        date_of_birth?: string
        contact_email?: string
        contact_phone?: string
        custom_data?: Record<string, unknown>
    }>
}) {
    try {
        const { html, text } = await renderOrganizerBookingNotificationEmail(data)
        
        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || '',
            to: data.organizerEmail,
            subject: `New Booking: ${data.eventTitle}`,
            html,
            text
        })
        
        if (error) {
            console.error('Failed to send organizer booking notification email:', error)
            return { success: false, error: error.message }
        }
        
        return { success: true, data: emailData }
    } catch (error) {
        console.error('Error sending organizer booking notification email:', error)
        return { success: false, error: 'Failed to send organizer booking notification email' }
    }
}

export async function sendWhitelistReleasedEmail(params: {
    userEmail: string
    userName?: string
    eventTitle: string
    bookingId: string
    dashboardUrl: string
    completePaymentUrl: string
    eventDate?: string
    eventLocation?: string
    eventEndDate?: string
    eventTimezone?: string
    participantCount?: number
    totalAmount?: number
    organizerName?: string
    organizerEmail?: string
    eventDescription?: string
    organizerPhone?: string
    participants?: Array<{
        first_name: string
        last_name: string
        date_of_birth?: string
        contact_email?: string
        contact_phone?: string
        custom_data?: Record<string, unknown>
    }>
}) {
    const { 
        userEmail, 
        userName, 
        eventTitle, 
        bookingId, 
        dashboardUrl,
        completePaymentUrl,
        eventDate,
        eventLocation,
        eventEndDate,
        eventTimezone,
        participantCount,
        totalAmount,
        organizerName,
        organizerEmail,
        eventDescription,
        organizerPhone,
        participants
    } = params

    console.log('📧 [WHITELIST RELEASED] Starting email send:', {
        bookingId,
        eventTitle,
        userEmail,
        userName,
        timestamp: new Date().toISOString()
    })

    try {
        console.log('🎨 [WHITELIST RELEASED] Rendering email template:', {
            bookingId,
            timestamp: new Date().toISOString()
        })

        const { html, text } = await renderWhitelistReleasedEmail({
            bookingId,
            eventName: eventTitle,
            eventDate: eventDate || new Date().toISOString(),
            eventLocation: eventLocation || 'TBD',
            eventEndDate,
            eventTimezone,
            participantCount: participantCount || 1,
            totalAmount: totalAmount || 0,
            organizerName: organizerName || 'Event Organizer',
            organizerEmail: organizerEmail || '',
            organizerPhone,
            eventDescription,
            participants: participants || [],
            dashboardUrl,
            completePaymentUrl
        })

        console.log('✅ [WHITELIST RELEASED] Email template rendered:', {
            bookingId,
            htmlLength: html.length,
            textLength: text.length,
            timestamp: new Date().toISOString()
        })

        console.log('📤 [WHITELIST RELEASED] Sending email via Resend:', {
            bookingId,
            from: process.env.RESEND_FROM_EMAIL || "",
            to: userEmail,
            subject: `Your booking for ${eventTitle} is now available`,
            timestamp: new Date().toISOString()
        })

        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: userEmail,
            subject: `Your booking for ${eventTitle} is now available`,
            html,
            text
        })

        if (error) {
            console.error('❌ [WHITELIST RELEASED] Failed to send email:', {
                bookingId,
                error: error.message,
                timestamp: new Date().toISOString()
            })
            return { success: false, error: error.message }
        }

        console.log('✅ [WHITELIST RELEASED] Email sent successfully:', {
            bookingId,
            emailId: emailData?.id,
            timestamp: new Date().toISOString()
        })

        return { success: true, data: emailData }
    } catch (error) {
        console.error('💥 [WHITELIST RELEASED] Exception during email send:', {
            bookingId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send whitelist released email' }
    }
}