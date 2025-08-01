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
                organizerName: (event as any)?.organizer_name || 'Event Organizer',
                organizerEmail: (event as any)?.organizer_email || '',
                organizerPhone: (event as any)?.organizer_phone || '',
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
                organizerName: (event as any)?.organizer_name || 'Event Organizer',
                organizerEmail: (event as any)?.organizer_email || '',
                organizerPhone: (event as any)?.organizer_phone || '',
                eventDescription: event.description,
                participants: participants || []
            }),
            { plainText: true }
        )
        const { data: emailData, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "" ,
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
    } catch (error) {
        console.error('Error sending booking confirmation email:', error)
        return { success: false, error: 'Failed to send booking confirmation email' }
    }
}

export async function sendWelcomeEmail(userEmail: string, userName: string) {
    try {
        const html = await render(
            React.createElement(WelcomeEmail, {
                userName,
                userEmail
            })
        )
        const text = await render(
            React.createElement(WelcomeEmail, {
                userName,
                userEmail
            }),
            { plainText: true }
        )
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "" ,
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
    } catch (error) {
        console.error('Error sending welcome email:', error)
        return { success: false, error: 'Failed to send welcome email' }
    }
}

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string) {
    try {
        const html = await render(
            React.createElement(PasswordResetEmail, {
                userName,
                resetUrl
            })
        )
        const text = await render(
            React.createElement(PasswordResetEmail, {
                userName,
                resetUrl
            }),
            { plainText: true }
        )
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "" ,
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
    } catch (error) {
        console.error('Error sending password reset email:', error)
        return { success: false, error: 'Failed to send password reset email' }
    }
}