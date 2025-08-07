// Send a generic email
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || '',
            to,
            subject,
            html
        })
        if (error) {
            console.error('Failed to send email:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data }
    } catch (error) {
        console.error('Error sending email:', error)
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
    renderOrganizerBookingNotificationEmail
} from './templates/index'
import { resend } from './client'
import { createClient } from '@/lib/supabase/server'

interface EmailData {
    booking: Booking
    event: Event
    user: Profile
}

export async function sendBookingConfirmationEmail(data: EmailData) {
    const { booking, event, user } = data

    // Fetch participants for this booking
    const supabase = await createClient()
    const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

    try {
        const { html, text } = await renderBookingConfirmationEmail({
            bookingId: booking.booking_id || booking.id,
            eventName: event.title,
            eventDate: event.start_date,
            eventLocation: event.location,
            participantCount: booking.quantity,
            totalAmount: booking.total_amount,
            organizerName: (event && 'organizer_name' in event ? (event as Event & { organizer_name?: string }).organizer_name : undefined) || 'Event Organizer',
            organizerEmail: (event && 'organizer_email' in event ? (event as Event & { organizer_email?: string }).organizer_email : undefined) || '',
            organizerPhone: (event && 'organizer_phone' in event ? (event as Event & { organizer_phone?: string }).organizer_phone : undefined) || '',
            eventDescription: event.description,
            participants: participants || []
        })
        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "",
            to: user.email,
            subject: `Booking Confirmed: ${event.title}`,
            html,
            text
        })
        if (error) {
            console.error('Failed to send booking confirmation email:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data: emailData }
    } catch (error: unknown) {
        console.error('Error sending booking confirmation email:', error)
        return { success: false, error: 'Failed to send booking confirmation email' }
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