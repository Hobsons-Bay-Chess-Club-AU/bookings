# Email Manager

The Email Manager is a comprehensive communication tool for event organizers that allows sending emails to participants, users, and specific bookings with template support and scheduling capabilities.

## Features

### 🎯 Context Detection
- **Event ID**: Enter an event UUID to email all participants and booking users for that event
- **Booking ID**: Enter a booking UUID to email the booking user and all participants
- **Participant ID**: Enter a participant UUID to email that specific participant
- **Email Address**: Enter an email to send to a specific user
- **Event Alias**: Enter an event alias to target that event

### 📧 Email Templates
Pre-defined templates with variable substitution:

1. **Event Reminder** - Remind participants about upcoming events
2. **Event Update** - Send important updates about event changes
3. **Custom Message** - Send personalized messages
4. **Payment Reminder** - Remind users about pending payments

#### Available Variables
- `{{recipientName}}` - Recipient's name
- `{{eventName}}` - Event title
- `{{eventDate}}` - Event date (formatted)
- `{{eventLocation}}` - Event location
- `{{organizerName}}` - Organizer's name
- `{{organizerEmail}}` - Organizer's email
- `{{customMessage}}` - Custom message content
- `{{amountDue}}` - Amount due for booking

### 📋 Recipient Management
- **Automatic Deduplication** - Removes duplicate email addresses
- **Recipient Count** - Shows number of unique recipients
- **Source Tracking** - Shows where each recipient comes from (booking, participant, etc.)
- **Context Display** - Shows relevant event/booking/participant information

### ⏰ Scheduling
- **Send Now** - Immediate email delivery
- **Schedule for Later** - Schedule emails for future delivery
- **Cron Processing** - Automated processing of scheduled emails

### 👁️ Preview
- **Real-time Preview** - See how emails will look before sending
- **Variable Substitution** - Preview shows actual values instead of placeholders
- **HTML Rendering** - Uses consistent email layout with proper styling

### 📁 File Attachments
- **Multi-file Support** - Attach multiple files to emails
- **File Management** - Add/remove attachments before sending

## Usage

### Basic Usage
1. Navigate to `/organizer/email-manager`
2. Enter an Event ID, Booking ID, Participant ID, or Email Address
3. Wait for context detection and recipient loading
4. Choose a template or create a custom message
5. Preview the email
6. Send immediately or schedule for later

### URL Parameters
You can pre-fill the context by using URL parameters:

- `/organizer/email-manager?eventId=EVENT_UUID` - Pre-fill with event ID
- `/organizer/email-manager?bookingId=BOOKING_UUID` - Pre-fill with booking ID
- `/organizer/email-manager?participantId=PARTICIPANT_UUID` - Pre-fill with participant ID

### Quick Access Links
- **Organizer Dashboard** - "Email Manager" button
- **Individual Event Pages** - "Email Manager" link in Quick Actions
- **Booking Detail Pages** - Context-specific email links

## API Endpoints

### Send Email
```
POST /api/organizer/send-email
```

**Body:**
```json
{
  "recipients": ["email1@example.com", "email2@example.com"],
  "subject": "Email subject with {{variables}}",
  "message": "Email message with {{variables}}",
  "context": {
    "event": { /* event object */ },
    "booking": { /* booking object */ },
    "participant": { /* participant object */ }
  },
  "scheduledDate": "2024-01-15T10:00:00Z", // optional
  "attachments": ["file1.pdf", "file2.jpg"] // optional
}
```

### Process Scheduled Emails (Cron)
```
GET /api/cron/process-scheduled-emails
Authorization: Bearer CRON_SECRET
```

## Database Tables

### scheduled_emails
- `id` - Primary key
- `organizer_id` - FK to profiles
- `recipients` - Array of email addresses
- `subject` - Email subject
- `message` - Email content
- `context` - JSON context data (event, booking, etc.)
- `scheduled_date` - When to send
- `status` - scheduled|sent|failed|cancelled
- `sent_at` - When email was sent
- `error_message` - Error details if failed

### email_logs
- `id` - Primary key
- `organizer_id` - FK to profiles
- `recipients` - Array of email addresses
- `subject` - Email subject
- `message` - Email content
- `context` - JSON context data
- `sent_count` - Number of successful sends
- `failed_count` - Number of failed sends
- `status` - sent|failed|partial

## Security

### Row Level Security (RLS)
- Organizers can only access their own emails
- Admins can access all emails
- Users cannot access email management features

### Role-based Access
- Requires `organizer` or `admin` role
- Authenticated users only
- Context validation to ensure organizer owns referenced events

## Cron Job Setup

To enable scheduled emails, set up a cron job to call:
```
GET /api/cron/process-scheduled-emails
Authorization: Bearer YOUR_CRON_SECRET
```

Recommended frequency: Every 5-15 minutes

## Environment Variables

```env
# Required for email sending
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Required for cron job security
CRON_SECRET=your_secure_cron_secret

# App URL for links
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Email Layout

Emails use the consistent `EmailLayout` component with:
- Branded header with club logo and colors
- Responsive design for all email clients
- Proper HTML structure for deliverability
- Event context cards when relevant
- Professional footer with club information

## Error Handling

- **Invalid Context**: Shows helpful error messages
- **No Recipients**: Prevents sending emails without recipients
- **Missing Required Fields**: Validates subject and message
- **Send Failures**: Tracks and reports failed email attempts
- **Network Issues**: Graceful error handling with user feedback

## Performance

- **Batch Processing**: Cron job processes up to 50 scheduled emails per run
- **Duplicate Prevention**: Automatic email deduplication
- **Efficient Queries**: Optimized database queries with proper indexing
- **Parallel Sending**: Sends multiple emails concurrently

## Future Enhancements

- Email templates management UI
- Email campaign analytics
- Bounce and unsubscribe handling
- Rich text editor for email content
- Email template library expansion
- A/B testing for email content
