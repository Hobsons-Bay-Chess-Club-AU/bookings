# API Restructuring: Public APIs Moved to `/api/public/`

This document describes the restructuring of public API endpoints to improve maintainability and organization.

## Overview

All public API endpoints have been moved from their original locations to a dedicated `/api/public/` directory structure. This provides better organization, easier maintenance, and clearer separation between public and private APIs.

## New API Structure

### Public API Endpoints

All public APIs are now located under `/api/public/`:

```
src/app/api/public/
├── content/
│   └── [slug]/
│       └── route.ts                    # Content pages API
├── events/
│   └── [id]/
│       ├── route.ts                    # Event details API
│       ├── pricing/
│       │   └── route.ts                # Event pricing API
│       └── public-participants/
│           └── route.ts                # Public participants API
├── players/
│   ├── fide/
│   │   └── search/
│   │       └── route.ts                # FIDE player search API
│   └── acf/
│       └── search/
│           └── route.ts                # ACF player search API
└── og/
    ├── home/
    │   └── route.ts                    # Home OG image API
    ├── poster/
    │   └── route.tsx                   # Event poster OG image API
    └── qr/
        └── route.ts                    # QR code generation API
```

### Private API Endpoints

Private APIs remain in their original locations:

```
src/app/api/
├── admin/                              # Admin-only APIs
├── auth/                               # Authentication APIs
├── bookings/                           # Booking management APIs
├── events/                             # Private event management APIs
├── organizer/                          # Organizer-only APIs
├── stripe/                             # Stripe integration APIs
├── webhooks/                           # Webhook handlers
└── ...                                 # Other private APIs
```

## API Endpoint Changes

### Before (Old Structure)
- `/api/content/[slug]` → Content pages
- `/api/events/[id]` → Event details
- `/api/events/[id]/pricing` → Event pricing
- `/api/events/[id]/public-participants` → Public participants
- `/api/players/fide/search` → FIDE player search
- `/api/players/acf/search` → ACF player search
- `/api/og/*` → OG image generation

### After (New Structure)
- `/api/public/content/[slug]` → Content pages
- `/api/public/events/[id]` → Event details
- `/api/public/events/[id]/pricing` → Event pricing
- `/api/public/events/[id]/public-participants` → Public participants
- `/api/public/players/fide/search` → FIDE player search
- `/api/public/players/acf/search` → ACF player search
- `/api/public/og/*` → OG image generation

## Updated Components

The following components have been updated to use the new API endpoints:

### Frontend Components
1. **`src/app/events/[id]/page.tsx`** - Event details page
2. **`src/app/events/[id]/participants/page.tsx`** - Event participants page
3. **`src/components/events/EventCard.tsx`** - Event card component
4. **`src/components/events/booking-form.tsx`** - Booking form
5. **`src/components/forms/form-fields/fide-player-field.tsx`** - FIDE player field
6. **`src/components/forms/form-fields/acf-player-field.tsx`** - ACF player field
7. **`src/app/e/[alias]/layout.tsx`** - Event alias layout
8. **`src/app/page.tsx`** - Home page

### Configuration Files
1. **`src/lib/rate-limit/config.ts`** - Rate limiting configuration updated

## Benefits

### 1. **Better Organization**
- Clear separation between public and private APIs
- Easier to identify which endpoints are publicly accessible
- Logical grouping of related functionality

### 2. **Improved Maintainability**
- Easier to apply changes to all public APIs at once
- Clearer codebase structure for new developers
- Simplified navigation and discovery

### 3. **Enhanced Security**
- Clear distinction between public and private endpoints
- Easier to apply different security policies
- Better rate limiting configuration

### 4. **Future-Proofing**
- Easier to add new public APIs in the future
- Consistent structure for all public endpoints
- Simplified deployment and monitoring

## Migration Process

### 1. **File Movement**
- Created new directory structure under `/api/public/`
- Copied all public API files to new locations
- Updated internal references within moved files

### 2. **Frontend Updates**
- Updated all frontend components to use new API paths
- Maintained backward compatibility during transition
- Updated rate limiting configuration

### 3. **Cleanup**
- Removed old API files after successful migration
- Updated documentation to reflect new structure
- Verified all functionality works correctly

## Rate Limiting

The rate limiting configuration has been updated to handle both old and new API paths during the transition, ensuring no disruption to existing functionality.

## Caching

All public APIs maintain their caching configuration with Vercel-specific headers for optimal CDN performance:

- **STATIC**: Content pages and OG images (1 hour cache)
- **EVENT**: Event details (5 minutes cache)
- **DYNAMIC**: Participants and pricing (1 minute cache)
- **SHORT**: Search APIs (30 seconds cache)

## Verification

The restructuring has been verified through:

1. **Build Success**: All TypeScript compilation passes
2. **Linting**: No new linting errors introduced
3. **Functionality**: All API endpoints work correctly
4. **Caching**: Cache headers properly applied
5. **Rate Limiting**: Rate limiting works for new paths

## Future Considerations

### Adding New Public APIs
When adding new public APIs:

1. Place them under `/api/public/` with appropriate subdirectories
2. Apply appropriate caching configuration
3. Update rate limiting configuration if needed
4. Update documentation

### Monitoring
- Monitor API usage patterns for the new structure
- Track performance improvements from better organization
- Ensure rate limiting is working correctly for new paths

## Conclusion

The API restructuring provides a cleaner, more maintainable codebase structure while preserving all existing functionality. The new organization makes it easier to manage public APIs and provides a clear foundation for future development.
