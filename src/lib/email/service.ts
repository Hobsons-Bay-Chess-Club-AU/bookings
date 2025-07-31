import resend from './client'
import { 
  BookingConfirmationEmail, 
  EventUpdateEmail, 
  WelcomeEmail 
} from './templates'
import { renderAsync } from '@react-email/render'

export interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(emailData: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@hbccbookings.com',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    })

    if (error) {
      console.error('Email sending failed:', error)
      throw error
    }

    console.log('Email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}

export async function sendBookingConfirmationEmail({
  userEmail,
  bookingId,
  eventName,
  eventDate,
  eventLocation,
  participantCount,
  totalAmount,
  organizerName,
  organizerEmail,
  organizerPhone,
  eventDescription,
  participants
}: {
  userEmail: string
  bookingId: string
  eventName: string
  eventDate: string
  eventLocation: string
  participantCount: number
  totalAmount: number
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
  eventDescription?: string
  participants?: Array<{
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, any>
  }>
}) {
  const html = await renderAsync(
    BookingConfirmationEmail({
      bookingId,
      eventName,
      eventDate,
      eventLocation,
      participantCount,
      totalAmount,
      organizerName,
      organizerEmail,
      organizerPhone,
      eventDescription,
      participants
    })
  )

  return sendEmail({
    to: userEmail,
    subject: `Booking Confirmation - ${eventName}`,
    html
  })
}

export async function sendEventUpdateEmail({
  userEmail,
  eventName,
  eventDate,
  eventLocation,
  updateType,
  updateDetails,
  organizerName,
  organizerEmail,
  organizerPhone
}: {
  userEmail: string
  eventName: string
  eventDate: string
  eventLocation: string
  updateType: 'cancelled' | 'rescheduled' | 'updated'
  updateDetails: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
}) {
  const html = await renderAsync(
    EventUpdateEmail({
      eventName,
      eventDate,
      eventLocation,
      updateType,
      updateDetails,
      organizerName,
      organizerEmail,
      organizerPhone
    })
  )

  const subjectMap = {
    cancelled: `Event Cancelled - ${eventName}`,
    rescheduled: `Event Rescheduled - ${eventName}`,
    updated: `Event Updated - ${eventName}`
  }

  return sendEmail({
    to: userEmail,
    subject: subjectMap[updateType],
    html
  })
}

export async function sendWelcomeEmail({
  userEmail,
  userName
}: {
  userEmail: string
  userName: string
}) {
  const html = await renderAsync(
    WelcomeEmail({
      userName,
      userEmail
    })
  )

  return sendEmail({
    to: userEmail,
    subject: 'Welcome to HBCC Bookings!',
    html
  })
}

export async function sendEventReminderEmail({
  userEmail,
  eventName,
  eventDate,
  eventLocation,
  organizerName,
  organizerEmail
}: {
  userEmail: string
  eventName: string
  eventDate: string
  eventLocation: string
  organizerName: string
  organizerEmail: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
        <h1 style="color: #2d3748; margin: 0;">Event Reminder</h1>
      </div>
      
      <div style="padding: 20px;">
        <h2 style="color: #2d3748;">Your event is coming up!</h2>
        
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-top: 0;">Event Details</h3>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
        </div>

        <div style="background-color: #e6fffa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-top: 0;">Organizer Contact</h3>
          <p><strong>Organizer:</strong> ${organizerName}</p>
          <p><strong>Email:</strong> ${organizerEmail}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #718096; font-size: 14px;">
            We look forward to seeing you at the event!
          </p>
        </div>
      </div>
    </div>
  `

  return sendEmail({
    to: userEmail,
    subject: `Event Reminder - ${eventName}`,
    html
  })
}