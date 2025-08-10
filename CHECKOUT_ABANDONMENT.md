# Checkout Abandonment Handling

This system handles abandoned checkouts to prevent orphaned pending bookings and improve user experience.

## Features

### 1. **Multi-Stage Abandonment Detection**
- **Pre-Checkout**: Confirmation dialog when leaving booking form page
- **During Stripe Checkout**: Automatic cleanup when user cancels or session expires
- **Post-Checkout**: Webhook handling for session expiration

### 2. **Automatic Cleanup**
- **Immediate Cleanup**: Removes pending booking when user abandons checkout
- **Stripe Integration**: Handles cancellation and session expiration with comprehensive data cleanup
- **Scheduled Cleanup**: Database trigger cleans up old pending bookings (>7 days)
- **API Endpoints**: Multiple cleanup routes for different scenarios
- **Comprehensive Cleanup**: Removes all related data (participants, discount applications, payment events)

### 3. **User Experience**
- **Smart Confirmation**: Only shows dialog when a booking is actually in progress
- **Visual Indicators**: Warning message when booking is in progress
- **Seamless Navigation**: Allows normal navigation without unnecessary prompts
- **Clear Feedback**: Users know what happens when they leave during checkout

## Implementation

### Components
- `CheckoutGuard`: Wraps checkout forms to handle abandonment
- `BookingForm`: Integrated with checkout guard

### API Routes
- `POST /api/bookings/cleanup-pending`: Removes specific pending booking
- `GET /api/bookings/cancel-checkout`: Handles Stripe checkout cancellation
- `POST /api/cron/cleanup-pending-bookings`: Scheduled cleanup (requires cron setup)

### Database
- **Trigger**: Automatically cleans up old pending bookings
- **Function**: `cleanup_old_pending_bookings()` runs cleanup logic

### Stripe Integration
- **Cancel URL**: Redirects to cleanup API when user cancels checkout
- **Webhook**: Handles `checkout.session.expired` events with comprehensive data cleanup
- **Session Metadata**: Stores booking ID for cleanup reference
- **Expired Sessions**: Automatically removes all booking data when Stripe sessions expire

## Usage

### For Developers
```tsx
import CheckoutGuard from '@/components/checkout/checkout-guard'

<CheckoutGuard bookingId={bookingId}>
  {/* Your checkout form */}
</CheckoutGuard>
```

### For Cron Jobs
```bash
# Set up cron job to call cleanup endpoint
curl -X POST https://your-domain.com/api/cron/cleanup-pending-bookings \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

## Configuration

### Environment Variables
- `CRON_SECRET_KEY`: Secret key for cron job authentication

### Database Settings
- **Cleanup Interval**: 7 days (configurable in trigger function)
- **Trigger Frequency**: Runs on ~1% of booking insertions (to avoid performance impact)

## Benefits

1. **Prevents Orphaned Bookings**: No more pending bookings cluttering the database
2. **Improves User Experience**: Clear feedback when leaving checkout
3. **Automatic Maintenance**: Self-cleaning system requires minimal manual intervention
4. **Performance Optimized**: Trigger-based cleanup avoids constant polling

## Monitoring

Check the following for system health:
- Database logs for trigger execution
- API logs for cleanup endpoint calls
- Booking status distribution (should have minimal pending bookings) 