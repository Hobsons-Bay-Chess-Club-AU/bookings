# Discount Code Feature Implementation

## Overview

This feature adds support for discount codes in the booking system. Users can now enter discount codes during the booking process to receive discounts on their purchases.

## Features

### Frontend Components

1. **DiscountCodeInput Component** (`src/components/events/discount-code-input.tsx`)
   - Input field for entering discount codes
   - Real-time validation and application
   - Visual feedback for applied discounts
   - Ability to remove applied discount codes

2. **Integration with Booking Flow**
   - Added to Step 1 (Pricing) of the booking process
   - Only shows when the event has discount codes available
   - Updates total amount in real-time when discount is applied

### Backend API Endpoints

1. **Apply Discount Code** (`/api/events/[id]/apply-discount-code`)
   - Validates discount codes
   - Checks eligibility (date range, quantity limits, usage limits)
   - Returns discount information and calculated amounts

2. **Enhanced Calculate Discounts** (`/api/events/[id]/calculate-discounts`)
   - Now supports discount codes in addition to participant-based discounts
   - Combines both types of discounts in calculations

### Database Integration

- Uses existing `event_discounts` table with `discount_type = 'code'`
- Creates `discount_applications` records for tracking
- Integrates with existing booking and payment flow

## Usage

### For Event Organizers

1. Create discount codes in the admin panel:
   - Set discount type to "code"
   - Provide a unique code (e.g., "SAVE20", "EARLYBIRD")
   - Configure discount value (percentage or fixed amount)
   - Set date ranges, quantity limits, and usage limits

### For Users

1. During booking process (Step 1 - Pricing):
   - If the event has discount codes available, a discount code input will appear
   - Enter the discount code and click "Apply"
   - The discount will be applied immediately and the total updated
   - Users can remove the discount code if needed

## Technical Implementation

### State Management

The booking form now tracks:
- `hasDiscountCodes`: Whether the event has discount codes available
- `appliedDiscountCode`: Currently applied discount code information
- `handleDiscountCodeApplied`: Callback for when a discount code is applied
- `handleDiscountCodeRemoved`: Callback for when a discount code is removed

### Validation Rules

Discount codes are validated for:
- Code existence and validity
- Date range (start_date and end_date)
- Quantity limits (min_quantity and max_quantity)
- Usage limits (max_uses vs current_uses)
- Event association

### Integration Points

1. **Booking Creation**: Discount codes are recorded in `discount_applications` table
2. **Payment Processing**: Discounted amounts are used in Stripe checkout
3. **Review Step**: Applied discounts are displayed in the final review
4. **Receipts**: Discount information is included in booking records

## Error Handling

- Invalid codes show appropriate error messages
- Expired or inactive codes are handled gracefully
- Network errors are caught and displayed to users
- Failed discount applications don't prevent booking completion
- Free events (including those made free by discount codes) bypass payment flow and are confirmed directly

## Security Considerations

- Server-side validation of all discount codes
- Rate limiting on discount code API endpoints
- Proper error handling to prevent information leakage
- Integration with existing authentication and authorization

## Future Enhancements

Potential improvements could include:
- Bulk discount code generation
- Analytics for discount code usage
- Integration with email marketing campaigns
- Advanced discount rules (e.g., first-time customers only)
- Discount code sharing and referral systems
