# Email Templates

This directory contains all email templates for the HBCC Bookings application. The templates have been refactored to use a consistent layout and styling system.

## Structure

```
src/lib/email/
├── layout/
│   └── EmailLayout.tsx          # Shared layout component
├── templates/
│   ├── index.ts                 # Export all templates
│   ├── booking-confirmation.tsx # Booking confirmation email
│   ├── event-update.tsx         # Event update/cancellation email
│   ├── welcome.tsx              # Welcome email for new users
│   ├── password-reset.tsx       # Password reset email
│   ├── organizer-reply.tsx      # Organizer reply to user message
│   ├── user-profile-update.tsx  # User profile update notification
│   ├── booking-transfer-notification.tsx # Booking transfer notification
│   └── organizer-booking-notification.tsx # Organizer booking notification
└── templates.tsx                # Legacy file (deprecated)
```

## Email Layout Component

The `EmailLayout` component provides consistent styling for all email templates:

### Props

- `children`: React nodes to render in the main content area
- `title`: Email title (default: "Hobsons Bay Chess Club")
- `subtitle`: Email subtitle
- `headerColor`: Header background color (default: "#1f2937")
- `showFooter`: Whether to show the footer (default: true)
- `footerText`: Custom footer text

### Styled Components

The layout also exports reusable styled components:

- `EmailSection`: Container for email sections
- `EmailCard`: Styled card with background and border
- `EmailButton`: Styled button with consistent appearance
- `EmailText`: Styled text with consistent typography
- `EmailHeading`: Styled headings with consistent hierarchy

## Usage

### Render Functions

Each email template exports a render function that handles both HTML and text rendering:

- `renderBookingConfirmationEmail(data)` - Booking confirmation emails
- `renderEventUpdateEmail(data)` - Event update/cancellation emails
- `renderWelcomeEmail(data)` - Welcome emails for new users
- `renderPasswordResetEmail(data)` - Password reset emails
- `renderOrganizerReplyEmail(data)` - Organizer reply emails
- `renderUserProfileUpdateEmail(data)` - User profile update notifications
- `renderBookingTransferNotificationEmail(data)` - Booking transfer notifications
- `renderOrganizerBookingNotificationEmail(data)` - Organizer booking notifications

These functions return `{ html, text }` objects that can be used directly with email services.

### Importing Templates

```typescript
// Import individual templates
import BookingConfirmationEmail from '@/lib/email/templates/booking-confirmation'
import WelcomeEmail from '@/lib/email/templates/welcome'

// Or import from the index file
import { 
  BookingConfirmationEmail, 
  WelcomeEmail,
  EmailLayout,
  EmailCard 
} from '@/lib/email/templates'
```

### Using Templates

#### Direct Component Usage
```typescript
// Render a booking confirmation email
const emailHtml = renderToString(
  <BookingConfirmationEmail
    bookingId="12345"
    eventName="Chess Tournament"
    eventDate="2024-01-15T10:00:00Z"
    eventLocation="Community Center"
    participantCount={2}
    totalAmount={50.00}
    organizerName="John Doe"
    organizerEmail="john@example.com"
  />
)
```

#### Using Render Functions (Recommended)
```typescript
// Import render functions
import { renderBookingConfirmationEmail } from '@/lib/email/templates'

// Render both HTML and text versions
const { html, text } = await renderBookingConfirmationEmail({
  bookingId: "12345",
  eventName: "Chess Tournament",
  eventDate: "2024-01-15T10:00:00Z",
  eventLocation: "Community Center",
  participantCount: 2,
  totalAmount: 50.00,
  organizerName: "John Doe",
  organizerEmail: "john@example.com"
})

// Use in email service
await resend.emails.send({
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Booking Confirmed',
  html,
  text
})
```

### Creating New Templates

1. Create a new file in `src/lib/email/templates/`
2. Import the layout components
3. Use the `EmailLayout` component as the base
4. Use the styled components for consistent styling
5. Export the component as default
6. Add the export to `src/lib/email/templates/index.ts`

Example:

```typescript
import React from 'react'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading } from '../layout/EmailLayout'

interface MyEmailProps {
  userName: string
  // ... other props
}

export default function MyEmail({ userName }: MyEmailProps) {
  return (
    <EmailLayout
      title="My Email Title"
      subtitle="Email subtitle"
      headerColor="#3b82f6"
    >
      <EmailHeading level={2}>Hello {userName}</EmailHeading>
      
      <EmailCard backgroundColor="#f7fafc" borderColor="#3b82f6">
        <EmailText>Your email content here...</EmailText>
      </EmailCard>
    </EmailLayout>
  )
}
```

## Migration from Legacy Templates

The old `templates.tsx` file is deprecated but still exports the new templates for backward compatibility. To migrate:

1. Update imports to use the new template files
2. The new templates have the same props interface
3. The styling is now consistent across all templates

## Styling Guidelines

- Use the `EmailLayout` component for consistent structure
- Use `EmailCard` for content sections with background colors
- Use `EmailButton` for call-to-action buttons
- Use `EmailText` and `EmailHeading` for consistent typography
- Colors follow the application's design system
- All emails are responsive and work across email clients

## Email Client Compatibility

The templates are designed to work with:
- Gmail
- Outlook (desktop and web)
- Apple Mail
- Thunderbird
- Mobile email clients

The styling uses inline CSS for maximum compatibility across email clients. 