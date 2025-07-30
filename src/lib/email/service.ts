import { Booking, Event, Profile } from '@/lib/types/database'

interface EmailData {
    booking: Booking
    event: Event
    user: Profile
}

export async function sendBookingConfirmationEmail(data: EmailData) {
    const { booking, event, user } = data
    
    // For now, we'll log the email content
    // In production, you would integrate with an email service like:
    // - Resend (recommended for Next.js)
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    const emailContent = {
        to: user.email,
        subject: `Booking Confirmed: ${event.title}`,
        html: generateBookingConfirmationHTML(data),
        text: generateBookingConfirmationText(data)
    }
    
    console.log('📧 Email would be sent:', emailContent)
    
    // TODO: Replace with actual email service integration
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send(emailContent)
    
    return { success: true, message: 'Email logged (not sent in development)' }
}

function generateBookingConfirmationHTML(data: EmailData): string {
    const { booking, event, user } = data
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Booking Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Booking Confirmed!</h1>
                </div>
                
                <div class="content">
                    <p>Hi ${user.full_name || user.email},</p>
                    
                    <p>Great news! Your booking has been confirmed and payment has been verified.</p>
                    
                    <div class="booking-details">
                        <h3>📅 Event Details</h3>
                        <p><strong>Event:</strong> ${event.title}</p>
                        <p><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        <p><strong>Location:</strong> ${event.location}</p>
                        
                        <h3>🎫 Booking Details</h3>
                        <p><strong>Booking ID:</strong> ${booking.id}</p>
                        <p><strong>Quantity:</strong> ${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''}</p>
                        <p><strong>Total Amount:</strong> $${booking.total_amount.toFixed(2)} AUD</p>
                        <p><strong>Status:</strong> ✅ Verified</p>
                    </div>
                    
                    <p>Please save this email as your booking confirmation. You may need to present it at the event.</p>
                    
                    <p>If you have any questions, please contact the event organizer.</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `
}

function generateBookingConfirmationText(data: EmailData): string {
    const { booking, event, user } = data
    
    return `
Booking Confirmed!

Hi ${user.full_name || user.email},

Great news! Your booking has been confirmed and payment has been verified.

Event Details:
- Event: ${event.title}
- Date: ${new Date(event.start_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}
- Location: ${event.location}

Booking Details:
- Booking ID: ${booking.id}
- Quantity: ${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''}
- Total Amount: $${booking.total_amount.toFixed(2)} AUD
- Status: Verified

Please save this email as your booking confirmation. You may need to present it at the event.

If you have any questions, please contact the event organizer.

This is an automated message. Please do not reply to this email.
    `
}