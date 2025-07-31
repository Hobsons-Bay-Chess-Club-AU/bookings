# Email Service Setup

This document explains how to set up email notifications for booking confirmations.

## Current Implementation

The booking system includes email notifications that are triggered when:
- `payment_intent.created` - Payment intent is created
- `payment_intent.succeeded` - Payment is successfully processed
- `charge.succeeded` - Charge is completed

## Development Mode

Currently, the email service is in **development mode** and only logs email content to the console. No actual emails are sent.

## Production Setup

To enable actual email sending in production, you need to:

### 1. Choose an Email Service Provider

Recommended options:
- **Resend** (recommended for Next.js projects)
- **SendGrid**
- **AWS SES**
- **Nodemailer with SMTP**

### 2. Install Email Service Package

#### For Resend (Recommended):
```bash
npm install resend
```

#### For SendGrid:
```bash
npm install @sendgrid/mail
```

### 3. Update Environment Variables

Add to your `.env.local`:

```env
# For Resend
RESEND_API_KEY=your_resend_api_key

# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# General email settings
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Your Event Platform"
```

### 4. Update Email Service Implementation

Replace the TODO section in `src/lib/email/service.ts`:

#### For Resend:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmationEmail(data: EmailData) {
    const { booking, event, user } = data
    
    const emailContent = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: `Booking Confirmed: ${event.title}`,
        html: generateBookingConfirmationHTML(data),
    }
    
    try {
        const result = await resend.emails.send(emailContent)
        console.log('📧 Email sent successfully:', result.data?.id)
        return { success: true, id: result.data?.id }
    } catch (error) {
        console.error('❌ Failed to send email:', error)
        throw error
    }
}
```

#### For SendGrid:
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendBookingConfirmationEmail(data: EmailData) {
    const { booking, event, user } = data
    
    const emailContent = {
        from: {
            email: process.env.FROM_EMAIL!,
            name: process.env.FROM_NAME!
        },
        to: user.email,
        subject: `Booking Confirmed: ${event.title}`,
        html: generateBookingConfirmationHTML(data),
    }
    
    try {
        const result = await sgMail.send(emailContent)
        console.log('📧 Email sent successfully')
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to send email:', error)
        throw error
    }
}
```

### 5. Email Template Customization

The email templates can be customized by modifying:
- `generateBookingConfirmationHTML()` - HTML email template
- `generateBookingConfirmationText()` - Plain text fallback

### 6. Testing

1. Set up your email service credentials
2. Create a test booking with a real email address
3. Complete the payment process
4. Check that confirmation emails are received

### 7. Email Deliverability

For production:
1. Set up proper DNS records (SPF, DKIM, DMARC)
2. Use a verified domain
3. Monitor bounce rates and spam complaints
4. Consider using a dedicated IP for high volume

## Troubleshooting

### Emails Not Sending
1. Check API keys are correct
2. Verify environment variables are loaded
3. Check console logs for error messages
4. Ensure email service quotas aren't exceeded

### Emails Going to Spam
1. Verify domain authentication
2. Check email content for spam triggers
3. Monitor sender reputation
4. Use proper from addresses

### Missing Email Data
1. Verify Supabase queries include all required relations
2. Check that booking, event, and profile data are properly populated
3. Ensure database triggers are working correctly

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Implement rate limiting for email sending
- Validate email addresses before sending
- Consider implementing email preferences/unsubscribe functionality