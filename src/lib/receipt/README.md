# Receipt Generator

This module provides functionality to generate professional PDF receipts for booking confirmations.

## Features

- **Professional Design**: Clean, formal receipt layout with company branding
- **Multi-section Support**: Handles both single and multi-section events
- **Itemized Billing**: Shows individual line items with quantities and prices
- **Currency Formatting**: Properly formatted Australian dollar amounts
- **Error Handling**: Graceful fallback with error receipt generation
- **Terms & Conditions**: Includes event terms if available

## Usage

### Basic Receipt Generation

```typescript
import { ReceiptGenerator } from '@/lib/receipt/receipt-generator'

const receiptBuffer = await ReceiptGenerator.generateReceiptPDF(
    event,
    booking,
    participants,
    'Credit Card'
)
```

### Error Receipt Generation

```typescript
const errorBuffer = await ReceiptGenerator.generateErrorReceiptPDF(
    'Error Title',
    'Error message details',
    'booking-id'
)
```

## Receipt Content

The generated receipt includes:

- **Header**: Company name and "Payment Receipt" title
- **Receipt Details**: Receipt number, date, customer information
- **Event Information**: Event name, date, location, booking ID
- **Payment Information**: Payment method and status
- **Itemized List**: Description, quantity, unit price, and total for each item
- **Total Amount**: Final payment amount
- **Payment Status**: Confirmed payment status
- **Terms & Conditions**: Event terms (if available)
- **Footer**: Contact information and system attribution

## Multi-section Events

For multi-section events, the receipt automatically groups participants by section and creates separate line items for each section with appropriate pricing.

## File Naming

Receipt files are named using the pattern:
```
receipt_{booking_id}_{event_date}.pdf
```

## Integration with Email Service

The receipt generator is integrated with the booking confirmation email service (`src/lib/email/service.ts`). When a booking is confirmed, the system automatically:

1. Generates the receipt PDF
2. Attaches it to the confirmation email
3. Sends both the calendar invitation (.ics) and receipt (.pdf) attachments

## Error Handling

If receipt generation fails, the system:
1. Logs the error for debugging
2. Continues with email sending (without receipt attachment)
3. Does not block the booking confirmation process

## Dependencies

- `jspdf`: PDF generation library
- Database types from `@/lib/types/database`

## Testing

Tests are available in `src/lib/receipt/__tests__/receipt-generator.test.ts` to verify:
- Basic receipt generation
- Error receipt generation
- Multi-section event handling
