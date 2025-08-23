# Ban List Middle Name Enhancement

This document describes the enhancement to the ban list system to include middle name support for more accurate participant identification and security checks.

## Overview

The ban list system has been updated to include middle name matching, providing better precision when identifying banned participants while maintaining backwards compatibility.

## Database Changes

### Migration: `20250107000005_update_ban_functions_for_middle_name.sql`

1. **Updated `is_participant_banned` function**:
   - Added optional `p_middle_name` parameter
   - Implements smart matching logic:
     - **Exact match**: When both ban entry and participant have middle names, they must match exactly
     - **Flexible match**: When one or both don't have middle names, matches by first + last + DOB only
   - Maintains backwards compatibility with existing ban entries

2. **Updated `add_participant_to_ban_list` function**:
   - Added optional `p_middle_name` parameter
   - Stores middle name when banning participants

3. **Updated database index**:
   - Modified `idx_ban_list_names` to include middle name for better performance

## API Changes

### Security Check API (`/api/security/check-ban`)
- **Input**: Now accepts optional `middle_name` parameter
- **Logic**: Passes middle name to updated database function
- **Backwards Compatibility**: Works with or without middle name

### Organizer Ban Participant API (`/api/organizer/ban-participant`)
- **Enhancement**: Includes participant's middle name when adding to ban list
- **Data Source**: Retrieves middle name from participant record

### Admin Ban List APIs
1. **GET `/api/admin/ban-list`**:
   - **Search Enhancement**: Now searches across first, middle, and last names
   - **Display**: Returns middle name in results

2. **POST `/api/admin/ban-list`**:
   - **Input**: Accepts optional `middle_name` field
   - **Storage**: Saves middle name to database

3. **PUT `/api/admin/ban-list/[id]`**:
   - **Update**: Allows updating middle name
   - **Validation**: Maintains existing validation rules

## Frontend Changes

### Booking Form Security Check
- **Location**: `src/components/events/booking-steps/step-3-participants.tsx`
- **Enhancement**: Includes participant's middle name in ban check request
- **User Experience**: No visible changes - security check remains transparent

### Admin Ban List Interface
- **Location**: `src/app/admin/ban-list/page-client.tsx`
- **Enhancements**:
  - Add/Edit forms include middle name field (optional)
  - Table display shows full names including middle names
  - Search functionality covers middle names
  - Delete confirmation shows complete name

## Matching Logic

The enhanced ban checking uses intelligent matching:

```sql
-- Exact middle name match (both have middle names and they match)
(middle_name IS NOT NULL AND p_middle_name IS NOT NULL AND LOWER(middle_name) = LOWER(p_middle_name))
OR
-- One or both don't have middle names - match by first + last + DOB only
(middle_name IS NULL OR p_middle_name IS NULL OR TRIM(middle_name) = '' OR TRIM(p_middle_name) = '')
```

### Scenarios:

1. **Both have middle names**: Must match exactly (John Michael Smith vs John Michael Smith) ✅
2. **Ban entry has middle name, participant doesn't**: Matches by first+last+DOB (John M. Smith matches John Smith) ✅
3. **Participant has middle name, ban entry doesn't**: Matches by first+last+DOB (John Smith matches John Michael Smith) ✅
4. **Neither has middle name**: Matches by first+last+DOB (traditional matching) ✅

## Benefits

1. **Improved Accuracy**: Reduces false positives when multiple people share first/last names
2. **Enhanced Security**: Better identification of banned individuals
3. **Backwards Compatibility**: Works with existing ban entries without middle names
4. **User Friendly**: Seamless integration with existing middle name support
5. **Admin Control**: Admins can add/edit middle names in ban entries

## Usage Examples

### Banning a Participant
```typescript
// When organizer bans participant "John Michael Smith"
await supabase.rpc('add_participant_to_ban_list', {
    p_first_name: 'John',
    p_middle_name: 'Michael',
    p_last_name: 'Smith',
    p_date_of_birth: '1990-01-01',
    p_created_by: organizerId,
    p_notes: 'Banned for violation of event rules'
})
```

### Checking Ban Status
```typescript
// During booking process
const response = await fetch('/api/security/check-ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        first_name: 'John',
        middle_name: 'Michael', // Optional but improves accuracy
        last_name: 'Smith',
        date_of_birth: '1990-01-01'
    })
})
```

## Testing Considerations

1. **Test with various name combinations**:
   - Participants with and without middle names
   - Ban entries with and without middle names
   - Exact matches and partial matches

2. **Verify backwards compatibility**:
   - Existing ban entries still work
   - New participants checked against old ban entries

3. **Admin interface testing**:
   - Add/edit/search functionality with middle names
   - Display formatting in tables and modals

## Security Notes

- Middle name matching is case-insensitive
- Empty/whitespace middle names are treated as null
- Date of birth remains required for all matches
- All ban operations require appropriate permissions (admin/organizer)

## Future Enhancements

Potential improvements for consideration:
- Phonetic matching for similar-sounding names
- Nickname/alias support
- Integration with external identity verification systems
- Enhanced audit logging for ban operations
