# Timezone Implementation for Events

This document describes the comprehensive timezone support implemented for events in the booking system.

## Overview

The system now supports timezone-aware event scheduling with Australia/Melbourne as the default timezone. All event times are displayed, stored, and processed according to the specified timezone.

## Database Changes

### Migration: `20250109000001_add_event_timezone.sql`

```sql
-- Add timezone column to events table
ALTER TABLE events 
ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Australia/Melbourne';

-- Add comment for documentation
COMMENT ON COLUMN events.timezone IS 'Timezone for the event (IANA timezone identifier)';

-- Create index for timezone queries
CREATE INDEX idx_events_timezone ON events(timezone);

-- Update existing events to use Australia/Melbourne timezone
UPDATE events 
SET timezone = 'Australia/Melbourne' 
WHERE timezone IS NULL;
```

### TypeScript Types

Updated `Event` interface in `src/lib/types/database.ts`:

```typescript
export interface Event {
  // ... existing fields
  timezone: string
  // ... other fields
}
```

## Timezone Utility Functions

### `src/lib/utils/timezone.ts`

Comprehensive timezone utilities for handling timezone conversions and formatting:

#### Available Timezones
```typescript
export const TIMEZONE_OPTIONS = [
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
  { value: 'Australia/ACT', label: 'Canberra (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
]
```

#### Key Functions

- `formatInTimezone()` - Format dates in specific timezone
- `formatDateRangeInTimezone()` - Format date ranges with timezone
- `formatWithTimezone()` - Format with timezone abbreviation
- `getTimezoneAbbreviation()` - Get timezone abbreviation (e.g., AEST, AEDT)
- `isValidTimezone()` - Validate timezone strings
- `getTimezoneDisplayName()` - Get human-readable timezone name

## Form Updates

### Event Creation Form (`src/app/organizer/events/new/page.tsx`)

Added timezone selection field:
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  timezone: DEFAULT_TIMEZONE, // 'Australia/Melbourne'
  // ... other fields
})
```

### Event Edit Form (`src/app/organizer/events/[id]/edit/page.tsx`)

Updated to include timezone field in form data and database operations.

## Display Components

### EventCard Component (`src/components/events/EventCard.tsx`)

Updated to show dates in event timezone:
```typescript
// Before
{new Date(event.start_date).toLocaleDateString()}
{new Date(event.start_date).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})}

// After
{formatInTimezone(event.start_date, event.timezone, 'PPP')}
{formatInTimezone(event.start_date, event.timezone, 'p')}
```

### Event Detail Page (`src/app/events/[id]/page.tsx`)

Updated to show comprehensive timezone information:
```typescript
// Date and time with timezone abbreviation
{formatInTimezone(event.start_date, event.timezone, 'EEEE, MMMM d, yyyy')}
{formatInTimezone(event.start_date, event.timezone, 'h:mm a')} - {formatInTimezone(event.end_date, event.timezone, 'h:mm a')} ({formatInTimezone(event.start_date, event.timezone, 'zzz')})
```

## Calendar Integration

### Updated Calendar Utilities (`src/lib/utils/calendar.ts`)

Enhanced calendar integration to handle timezone-aware events:

#### CalendarEvent Interface
```typescript
export interface CalendarEvent {
  // ... existing fields
  timezone?: string
  // ... other fields
}
```

#### Timezone-Aware Functions
- `formatDateForCalendar()` - Convert dates to UTC for calendar services
- `generateGoogleCalendarUrl()` - Include timezone in Google Calendar URLs
- `generateOutlookCalendarUrl()` - Include timezone in Outlook Calendar URLs
- `generateIcsFile()` - Include timezone information in ICS files

## Email Templates

### Booking Confirmation Email (`src/lib/email/templates/booking-confirmation.tsx`)

Updated to include timezone information:
```typescript
interface BookingConfirmationEmailData {
  // ... existing fields
  eventTimezone?: string
  // ... other fields
}
```

Display format:
```typescript
<strong>Starts:</strong> {formattedStart.toLocaleDateString('en-AU', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
})}
{eventTimezone && ` (${eventTimezone})`}
```

## Dependencies

### Required Packages
```json
{
  "date-fns": "^2.x.x",
  "date-fns-tz": "^3.2.0"
}
```

## Usage Examples

### Creating an Event with Timezone
```typescript
const eventData = {
  title: 'Chess Tournament',
  start_date: '2024-01-15T10:00:00',
  end_date: '2024-01-15T18:00:00',
  timezone: 'Australia/Melbourne',
  // ... other fields
}
```

### Displaying Event Times
```typescript
import { formatInTimezone } from '@/lib/utils/timezone'

// Format start date
const startDate = formatInTimezone(event.start_date, event.timezone, 'PPP')
// Output: "Monday, January 15, 2024"

// Format time range with timezone
const timeRange = `${formatInTimezone(event.start_date, event.timezone, 'h:mm a')} - ${formatInTimezone(event.end_date, event.timezone, 'h:mm a')} (${formatInTimezone(event.start_date, event.timezone, 'zzz')})`
// Output: "10:00 AM - 6:00 PM (AEDT)"
```

### Calendar Integration
```typescript
import { generateGoogleCalendarUrl } from '@/lib/utils/calendar'

const calendarEvent = {
  title: event.title,
  startDate: new Date(event.start_date),
  endDate: new Date(event.end_date),
  timezone: event.timezone,
  // ... other fields
}

const googleCalendarUrl = generateGoogleCalendarUrl(calendarEvent)
```

## Benefits

### 1. **Accurate Time Display**
- All event times are displayed in the correct timezone
- Timezone abbreviations are shown (AEST, AEDT, etc.)
- No confusion about event timing

### 2. **Calendar Integration**
- Calendar invites include correct timezone information
- ICS files contain timezone data
- Google/Outlook calendar links work correctly

### 3. **Email Communication**
- Booking confirmations show timezone information
- Participants know exactly when events occur
- Reduced confusion about event timing

### 4. **International Support**
- Support for multiple timezones
- Easy to add new timezone options
- Consistent timezone handling across the application

### 5. **Database Consistency**
- All events have a timezone field
- Default timezone ensures backward compatibility
- Indexed for efficient queries

## Migration Notes

### Existing Events
- All existing events are automatically assigned 'Australia/Melbourne' timezone
- No data loss or disruption to existing functionality
- Organizers can update timezone if needed

### Backward Compatibility
- All existing code continues to work
- Timezone field has a default value
- Graceful fallback to local timezone if needed

## Future Enhancements

### Potential Improvements
1. **User Timezone Detection** - Auto-detect user's timezone
2. **Timezone Conversion** - Show times in user's local timezone
3. **Daylight Saving Time** - Better handling of DST transitions
4. **Timezone Validation** - Validate timezone strings on input
5. **Timezone Preferences** - User preference for timezone display

### Advanced Features
1. **Multi-timezone Events** - Events spanning multiple timezones
2. **Timezone-aware Notifications** - Send reminders in user's timezone
3. **Timezone Analytics** - Track which timezones are most popular
4. **Automatic Timezone Updates** - Update timezone when DST changes

## Testing

### Test Cases
1. **Event Creation** - Verify timezone is saved correctly
2. **Event Display** - Verify times show in correct timezone
3. **Calendar Integration** - Verify calendar invites have correct times
4. **Email Templates** - Verify timezone information in emails
5. **Timezone Conversion** - Verify UTC conversion works correctly

### Edge Cases
1. **Invalid Timezones** - Handle invalid timezone strings
2. **DST Transitions** - Handle daylight saving time changes
3. **International Events** - Test with various timezones
4. **Browser Compatibility** - Test across different browsers

## Conclusion

The timezone implementation provides comprehensive support for timezone-aware event scheduling. With Australia/Melbourne as the default and support for multiple timezones, the system ensures accurate time display and calendar integration for all events.

The implementation is backward-compatible, well-documented, and provides a solid foundation for future timezone-related enhancements.
