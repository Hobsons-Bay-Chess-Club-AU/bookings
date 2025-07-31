# Email Setup with Resend

This project uses [Resend](https://resend.com) for sending transactional emails. Follow these steps to set up email functionality:

## 1. Sign up for Resend

1. Go to [resend.com](https://resend.com) and create an account
2. Verify your email address
3. Add and verify your domain (or use the provided sandbox domain for testing)

## 2. Get Your API Key

1. In your Resend dashboard, go to the API Keys section
2. Create a new API key
3. Copy the API key (it starts with `re_`)

## 3. Set Environment Variables

### Option A: Quick Testing (Sandbox Domain)
For immediate testing, use Resend's sandbox domain:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Note**: Sandbox domain is limited to 100 emails/day and may go to spam.

### Option B: Gmail Address (Recommended for Development)
1. In Resend dashboard, go to "Domains" → "Add Domain" → "Verify Email Address"
2. Enter your Gmail address (e.g., `yourname@gmail.com`)
3. Check your Gmail for verification email and click the link
4. Use the verified Gmail address:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=yourname@gmail.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Option C: Your Own Domain (Best for Production)
1. Add your domain in Resend dashboard
2. Follow DNS setup instructions (SPF, DKIM records)
3. Use any email from your domain:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**Important Notes:**
- `RESEND_FROM_EMAIL` must be a verified email address or domain
- For development, you can use the sandbox domain or verify your Gmail
- `NEXT_PUBLIC_SITE_URL` should be your production URL in production

## 4. Email Templates

The project includes several email templates:

### Booking Confirmation Email
- Sent automatically when a booking is confirmed
- Includes event details, participant information, and organizer contact
- Triggered by Stripe webhooks (`payment_intent.succeeded`, `charge.succeeded`)

### Event Update Email
- Sent when an event is cancelled, rescheduled, or updated
- Can be sent to all participants of an event
- Available via API endpoint `/api/email/event-update`

### Welcome Email
- Sent to new users when they sign up
- Available via API endpoint `/api/email/welcome`

### Event Reminder Email
- Can be sent before events to remind participants
- Available via email service function

## 5. Testing Emails

### Admin Test Page
1. Go to `/admin/email-test` (admin access required)
2. Enter an email address, subject, and message
3. Click "Send Test Email" to verify your setup

### API Testing
You can also test emails via API endpoints:

```bash
# Test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email"
  }'

# Welcome email
curl -X POST http://localhost:3000/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here"
  }'

# Event update email
curl -X POST http://localhost:3000/api/email/event-update \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-uuid-here",
    "updateType": "cancelled",
    "updateDetails": "Event has been cancelled due to unforeseen circumstances."
  }'
```

## 6. Email Service Functions

The email service is located in `src/lib/email/` and includes:

- `client.ts` - Resend client configuration
- `templates.tsx` - React email templates
- `service.ts` - Email sending functions

### Available Functions

```typescript
// Send booking confirmation
await sendBookingConfirmationEmail({
  userEmail: 'user@example.com',
  bookingId: 'booking-uuid',
  eventName: 'Chess Tournament',
  eventDate: '2024-01-15T10:00:00Z',
  eventLocation: 'Community Center',
  participantCount: 2,
  totalAmount: 50.00,
  organizerName: 'John Doe',
  organizerEmail: 'john@example.com',
  eventDescription: 'Join us for a fun chess tournament...',
  participants: [/* participant data */]
})

// Send event update
await sendEventUpdateEmail({
  userEmail: 'user@example.com',
  eventName: 'Chess Tournament',
  eventDate: '2024-01-15T10:00:00Z',
  eventLocation: 'Community Center',
  updateType: 'cancelled',
  updateDetails: 'Event cancelled due to weather',
  organizerName: 'John Doe',
  organizerEmail: 'john@example.com'
})

// Send welcome email
await sendWelcomeEmail({
  userEmail: 'user@example.com',
  userName: 'John Doe'
})
```

## 7. Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your `RESEND_API_KEY` is correct
   - Ensure the API key is active in your Resend dashboard

2. **"Sender not verified" error**
   - Verify your domain in Resend dashboard
   - Use a verified email address for `RESEND_FROM_EMAIL`
   - For Gmail: Go to "Domains" → "Add Domain" → "Verify Email Address"

3. **Emails not sending**
   - Check browser console and server logs for errors
   - Verify environment variables are set correctly
   - Test with the admin email test page

4. **Template rendering issues**
   - Ensure `@react-email/render` is installed
   - Check that email templates are properly formatted

5. **Gmail verification issues**
   - Check your spam folder for verification emails
   - Make sure you're using the exact Gmail address you want to verify
   - Wait a few minutes for verification to process

### Logs

Email sending logs will appear in:
- Browser console (for client-side errors)
- Server logs (for API route errors)
- Resend dashboard (for delivery status)

## 8. Production Considerations

1. **Domain Verification**: Ensure your domain is properly verified in Resend
2. **Rate Limits**: Resend has rate limits (check their documentation)
3. **Monitoring**: Set up email delivery monitoring
4. **Bounce Handling**: Configure bounce handling for better deliverability
5. **SPF/DKIM**: Set up proper email authentication records

## 9. Security

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Regularly rotate API keys
- Monitor email sending for unusual activity