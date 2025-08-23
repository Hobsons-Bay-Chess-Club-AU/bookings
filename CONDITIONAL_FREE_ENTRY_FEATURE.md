# Conditional Free Entry Feature

## Overview

The Conditional Free Entry feature allows event organizers to offer free entry to specific individuals (well-known people, titled players, etc.) while requiring organizer approval before confirming the booking. This provides a more practical alternative to creating individual discount codes for each person.

## Features

### For Event Organizers
- **Pricing Option**: Create a "Conditional Free" pricing type that shows as free but requires approval
- **Approval Workflow**: Review and approve conditional free entry requests
- **Email Notifications**: Automatically notify users when their request is approved
- **Booking Management**: View and manage conditional free entry bookings in the organizer dashboard

### For Users
- **Free Entry Option**: See "Conditional Free" as a pricing option when available
- **Request Submission**: Submit conditional free entry requests without payment
- **Status Tracking**: Receive confirmation when request is approved
- **Email Notifications**: Get notified via email when approval is granted

## Technical Implementation

### Database Changes

#### New Booking Status
```sql
-- Added to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_approval';
```

#### New Pricing Type
```sql
-- Added to pricing_type enum
ALTER TYPE pricing_type ADD VALUE IF NOT EXISTS 'conditional_free';
```

#### New Participant Status
```sql
-- Added to participant_status enum
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'pending_approval';
```

### Frontend Components

#### Booking Form (`src/components/events/booking-form.tsx`)
- **Conditional Free Detection**: Identifies when conditional free pricing is selected
- **Status Management**: Sets booking status to `pending_approval` for conditional free entries
- **Participant Status**: Sets participant status to `pending_approval` for conditional free entries
- **Success Flow**: Shows appropriate success message for pending approval bookings

#### Pricing Step (`src/components/events/booking-steps/step-1-pricing.tsx`)
- **Visual Indicator**: Shows "Conditional Free" badge for conditional free pricing options
- **Clear Labeling**: Distinguishes conditional free from regular free pricing

### Backend API

#### Conditional Free Approval (`src/app/api/organizer/events/[id]/bookings/[bookingId]/approve-conditional-free/route.ts`)
- **Authorization**: Verifies organizer permissions
- **Status Update**: Changes booking status from `pending_approval` to `confirmed`
- **Participant Update**: Changes participant status from `pending_approval` to `active`
- **Email Notification**: Triggers approval email to user

#### Conditional Free Request Notification (`src/app/api/email/conditional-free-request-notification/route.ts`)
- **Organizer Notification**: Sends email to organizer when conditional free entry is requested
- **Booking Details**: Includes complete booking and participant information
- **Quick Action**: Provides direct link to review and approve the request

#### Email Service (`src/app/api/email/conditional-free-approved/route.ts`)
- **Template Rendering**: Uses React Email templates for consistent styling
- **Data Enrichment**: Fetches booking and event details for email content

### Email Templates

#### Conditional Free Approval Email (`src/lib/email/templates/conditional-free-approved.tsx`)
- **Professional Design**: Clean, branded email template
- **Event Details**: Includes event name, date, location, and booking ID
- **Clear Instructions**: Provides next steps for the user

#### Conditional Free Request Notification Email (`src/lib/email/templates/conditional-free-request-notification.tsx`)
- **Organizer Notification**: Professional email template for conditional free entry requests
- **Complete Details**: Includes event information, booking details, and participant information
- **Quick Action**: Direct "Review & Approve Request" button linking to the booking
- **Visual Design**: Orange/amber color scheme to distinguish from regular notifications

## User Flow

### 1. Event Setup (Organizer)
1. Create or edit an event
2. Go to the "Pricing" section in the organizer dashboard
3. Click "Add New Pricing Option" or edit existing pricing
4. Select "Conditional Free" from the "Pricing Type" dropdown
5. Set price to $0.00
6. Add an appropriate name (e.g., "Titled Player Entry", "VIP Guest Entry")
7. Add a clear description explaining that approval is required
8. Set membership type and max tickets as needed
9. Save the pricing option

**Note**: The "Conditional Free" option is now available in both event pricing and section pricing interfaces.

### 2. User Booking Process
1. User selects the event and sees "Conditional Free" pricing option
2. User completes booking form with participant details
3. System creates booking with status `pending_approval`
4. **Organizer receives notification email** with booking details and quick approval link
5. User sees confirmation message indicating approval is pending

### 3. Organizer Approval Process
1. **Organizer receives email notification** with booking details and direct approval link
2. Organizer views booking in dashboard
3. Booking shows status "Pending Approval" with blue indicator
4. Organizer clicks "Approve Conditional Free Entry" action
5. System updates booking status to "Confirmed"
6. User receives approval email automatically

### 4. Post-Approval
1. User receives email with event details and confirmation
2. Booking appears as confirmed in user's dashboard
3. User can download tickets and attend the event

## Status Flow

```
User Submits Request → pending_approval → Organizer Approves → confirmed
                                    ↓                              ↓
                              Organizer Rejects → cancelled    participants: active
                                    ↓
                              participants: pending_approval
```

## UI Indicators

### Pricing Options
- **Conditional Free Badge**: Yellow badge with "Conditional Free" text
- **Price Display**: Shows $0 with clear indication that approval is required

### Booking Status
- **Pending Approval**: Blue status indicator with clock icon
- **Approved**: Green status indicator with checkmark icon

### Participant Status
- **Pending Approval**: Blue status indicator for participants awaiting approval
- **Active**: Green status indicator for confirmed participants

### Organizer Actions
- **Approve Button**: Green "Approve Conditional Free Entry" action
- **Cancel Button**: Red "Cancel Booking" action for rejected requests

## Email Notifications

### Organizer Notification Email
- **Subject**: "Conditional Free Entry Request - [Event Name]"
- **Content**:
  - Event details (name, date, location)
  - Booking information (ID, participant count, customer details)
  - Complete participant details with custom field responses
  - Direct "Review & Approve Request" button
  - Professional orange/amber color scheme

### Approval Email Content
- **Subject**: "Your conditional free entry has been approved - [Event Name]"
- **Content**: 
  - Congratulations message
  - Event details (name, date, location, booking ID)
  - Confirmation that no payment is required
  - Instructions for attendance
  - Contact information for questions

## Security Considerations

- **Authorization**: Only event organizers can approve conditional free entries
- **Audit Trail**: All status changes are logged with timestamps
- **Email Verification**: Approval emails are sent to verified user email addresses
- **Rate Limiting**: API endpoints are protected against abuse

## Future Enhancements

- **Bulk Approval**: Approve multiple conditional free entries at once
- **Approval Reasons**: Allow organizers to add notes when approving/rejecting
- **Auto-Approval Rules**: Set up automatic approval for certain user types
- **Approval History**: Track who approved what and when
- **Conditional Free Limits**: Set maximum number of conditional free entries per event

## Configuration

### Environment Variables
No additional environment variables are required for this feature.

### Database Migrations
Run the following migrations to enable the feature:
```bash
# Add pending_approval status
supabase/migrations/20250107000001_add_pending_approval_status.sql

# Add conditional_free pricing type
supabase/migrations/20250107000002_add_conditional_free_pricing_type.sql

# Add pending_approval participant status
supabase/migrations/20250107000003_add_pending_approval_participant_status.sql
```

## Testing

### Test Scenarios
1. **User submits conditional free request**
   - Verify booking is created with `pending_approval` status
   - Verify success message is shown to user

2. **Organizer approves request**
   - Verify booking status changes to `confirmed`
   - Verify approval email is sent to user
   - Verify email contains correct event details

3. **Organizer rejects request**
   - Verify booking status changes to `cancelled`
   - Verify appropriate notifications are sent

4. **Multiple conditional free options**
   - Verify all conditional free options are displayed correctly
   - Verify proper status handling for each option

## Troubleshooting

### Common Issues
1. **Email not sent**: Check email service configuration and logs
2. **Status not updating**: Verify organizer permissions and API response
3. **UI not reflecting changes**: Clear browser cache and refresh page

### Debug Information
- Check browser console for JavaScript errors
- Review server logs for API endpoint errors
- Verify database migrations have been applied
- Confirm email service is properly configured
