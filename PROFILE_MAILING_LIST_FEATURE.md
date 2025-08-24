# Profile Mailing List Status Feature

This document describes the enhancement to the user profile page to display mailing list subscription status and provide unsubscribe functionality with confirmation.

## Overview

Users can now view their mailing list subscription status directly from their profile page and unsubscribe from marketing emails with a confirmation dialog, providing better control over their email preferences.

## Features

### 1. Mailing List Status Display
- **Location**: Profile page under "Email Preferences" section
- **Information Shown**:
  - Current subscription status (subscribed/unsubscribed)
  - Subscription date (if subscribed)
  - Clear description of what the subscription entails
- **Visual Indicators**:
  - Green envelope icon for subscribed users
  - Gray open envelope icon for unsubscribed users
  - Loading spinner while fetching status

### 2. Subscribe/Unsubscribe Functionality
- **Subscribe Button**: Green button shown for unsubscribed users
- **Unsubscribe Button**: Red button shown for subscribed users  
- **Confirmation Modals**: Required before both subscribing and unsubscribing
- **Success Feedback**: Clear confirmation messages after successful operations
- **Error Handling**: Proper error messages if operations fail

## Technical Implementation

### API Endpoint: `/api/profile/mailing-list-status`

#### GET Request
- **Purpose**: Fetch user's mailing list subscription status
- **Authentication**: Required (uses `getCurrentProfile()`)
- **Response**:
  ```json
  {
    "isSubscribed": boolean,
    "status": "subscribed" | "unsubscribed" | "not_subscribed",
    "subscribedAt": "2024-01-01T00:00:00Z" | null
  }
  ```

#### POST Request
- **Purpose**: Unsubscribe user from mailing list
- **Authentication**: Required
- **Body**:
  ```json
  {
    "action": "unsubscribe"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully unsubscribed from mailing list"
  }
  ```

### Frontend Components

#### Profile Page Updates (`src/app/profile/page.tsx`)
- **New State Variables**:
  - `mailingListStatus`: Current subscription status
  - `mailingListLoading`: Loading state for API calls
  - `showUnsubscribeModal`: Modal visibility state
  - `unsubscribing`: Unsubscribe operation loading state

- **New Functions**:
  - `loadMailingListStatus()`: Fetch subscription status
  - `handleUnsubscribe()`: Process unsubscribe request

- **UI Components**:
  - Email Preferences section with status display
  - Unsubscribe button with confirmation modal
  - Loading states and error handling

#### Confirmation Modal
- **Component**: `ConfirmationModal` from UI components
- **Props**:
  - `title`: "Unsubscribe from Marketing Emails"
  - `message`: Clear explanation of consequences
  - `variant`: "danger" for red styling
  - `loading`: Shows spinner during operation

## User Experience

### For Subscribed Users
1. **Status Display**: Shows green envelope icon and subscription details
2. **Unsubscribe Option**: Red "Unsubscribe" button prominently displayed
3. **Confirmation**: Modal explains consequences and requires confirmation
4. **Feedback**: Success message after unsubscribe
5. **Status Update**: UI immediately reflects new unsubscribed status

### For Unsubscribed Users
1. **Status Display**: Shows gray open envelope icon
2. **No Action Required**: No unsubscribe button shown
3. **Clear Information**: Explains they're not receiving marketing emails

### Error Scenarios
- **API Failures**: Graceful error handling with user-friendly messages
- **Network Issues**: Loading states and retry mechanisms
- **Authentication Issues**: Redirect to login if session expires

## Database Integration

### Mailing List Table
- **Table**: `mailing_list`
- **Key Fields**:
  - `email`: User's email address
  - `status`: 'subscribed', 'unsubscribed', or 'pending'
  - `created_at`: Subscription date
  - `updated_at`: Last modification date
  - `unsubscribe_reason`: Reason for unsubscribing
  - `confirmation_token`: UUID token for email confirmation (only for pending subscriptions)

### Row Level Security (RLS)
- **Policy**: Users can only manage their own email record
- **Authentication**: Required for all operations
- **Security**: Prevents unauthorized access to other users' data

## Styling and Design

### Visual Design
- **Consistent with Profile Page**: Matches existing design patterns
- **Dark Mode Support**: Full dark mode compatibility
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Icons and Colors
- **Subscribed**: Green envelope icon (`HiEnvelope`)
- **Unsubscribed**: Gray open envelope icon (`HiEnvelopeOpen`)
- **Unsubscribe Button**: Red styling to indicate destructive action
- **Loading States**: Consistent spinner animations

## Security Considerations

### Authentication
- **Required**: All operations require valid user session
- **Profile Validation**: Uses `getCurrentProfile()` for secure user identification
- **Email Matching**: Ensures users can only manage their own email preferences

### Data Protection
- **RLS Policies**: Database-level security for mailing list operations
- **Input Validation**: Proper validation of API requests
- **Error Handling**: Secure error messages that don't leak sensitive information
- **Secure Confirmation Links**: Additional email addresses require confirmation via secure tokens
- **Pending Status**: New subscriptions start as 'pending' and only activate after email confirmation
- **Token-Based Verification**: Each confirmation link uses a unique UUID token for security
- **Token Cleanup**: Confirmation tokens are cleared after successful activation
- **Duplicate Prevention**: System prevents duplicate subscriptions and handles existing entries gracefully

## Future Enhancements

### Potential Improvements
1. **Resubscribe Option**: Allow users to resubscribe from profile page
2. **Email Preferences**: Granular control over different types of emails
3. **Subscription History**: Show past subscription/unsubscription events
4. **Email Frequency**: Options for daily/weekly/monthly digests
5. **Event-Specific Subscriptions**: Subscribe to specific event types only

### Integration Opportunities
1. **Booking Flow**: Pre-check mailing list status during booking
2. **Event Pages**: Show subscription status on event pages
3. **Dashboard**: Add mailing list status to user dashboard
4. **Email Templates**: Include profile link in marketing emails

## Testing Scenarios

### Functional Testing
1. **Subscribed User**: Verify status display and unsubscribe flow
2. **Unsubscribed User**: Verify status display without unsubscribe option
3. **New User**: Verify handling of users not in mailing list
4. **Error Scenarios**: Test API failures and network issues

### User Experience Testing
1. **Confirmation Flow**: Ensure users understand unsubscribe consequences
2. **Loading States**: Verify smooth loading and error states
3. **Mobile Experience**: Test on various screen sizes
4. **Accessibility**: Test with screen readers and keyboard navigation

## Maintenance

### Monitoring
- **API Usage**: Monitor `/api/profile/mailing-list-status` endpoint usage
- **Error Rates**: Track unsubscribe operation success rates
- **User Feedback**: Monitor user complaints about email preferences

### Updates
- **Email Content**: Update confirmation modal text as needed
- **UI Improvements**: Enhance visual design based on user feedback
- **Feature Expansion**: Add new email preference options as requested
