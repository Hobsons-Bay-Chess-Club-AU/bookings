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
        const html = await render(
            React.createElement(EventUpdateEmail, {
                eventName,
                eventDate,
                eventLocation,
                updateType,
                updateDetails,
                organizerName: organizerName || 'Event Organizer',
                organizerEmail
            })
        )
        const text = await render(
            React.createElement(EventUpdateEmail, {
                eventName,
                eventDate,
                eventLocation,
                updateType,
                updateDetails,
                organizerName: organizerName || 'Event Organizer',
                organizerEmail
            }),
            { plainText: true }
        )
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
import { render } from '@react-email/render'
import { BookingConfirmationEmail, EventUpdateEmail, WelcomeEmail, PasswordResetEmail } from './templates'
import { resend } from './client'
import { createClient } from '@/lib/supabase/server'
import React from 'react'

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
        const html = await render(
            React.createElement(BookingConfirmationEmail, {
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
        )
        const text = await render(
            React.createElement(BookingConfirmationEmail, {
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
            }),
            { plainText: true }
        )
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
        const html = await render(
            React.createElement(WelcomeEmail, {
                userName: userName,
                userEmail,
            })
        )
        const text = await render(
            React.createElement(WelcomeEmail, {
                userName: userName,
                userEmail: userEmail
            }),
            { plainText: true }
        )
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
        const html = await render(
            React.createElement(PasswordResetEmail, {
                userName: userName,
                resetUrl: resetUrl
            })
        )
        const text = await render(
            React.createElement(PasswordResetEmail, {
                userName: userName,
                resetUrl: resetUrl
            }),
            { plainText: true }
        )
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