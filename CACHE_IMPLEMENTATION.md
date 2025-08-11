# Public API Caching Implementation

This document describes the caching implementation for public API endpoints to improve performance.

## Overview

All public API endpoints now include appropriate cache headers to improve performance and reduce server load. The caching system is configurable through environment variables and provides different cache presets for different types of content.

## Cache Configuration

### Environment Variables

The following environment variables can be used to customize cache settings:

```bash
# Default cache settings
CACHE_DEFAULT_MAX_AGE=60                    # Default cache duration in seconds
CACHE_DEFAULT_STALE_WHILE_REVALIDATE=300    # Default stale-while-revalidate duration

# Static content (content pages, about pages, etc.)
CACHE_STATIC_MAX_AGE=3600                   # 1 hour cache
CACHE_STATIC_STALE_WHILE_REVALIDATE=86400   # 24 hours stale-while-revalidate

# Event data that might change occasionally
CACHE_EVENT_MAX_AGE=300                     # 5 minutes cache
CACHE_EVENT_STALE_WHILE_REVALIDATE=1800     # 30 minutes stale-while-revalidate

# Dynamic data that changes frequently
CACHE_DYNAMIC_MAX_AGE=60                    # 1 minute cache
CACHE_DYNAMIC_STALE_WHILE_REVALIDATE=300    # 5 minutes stale-while-revalidate

# Short-lived cache for frequently changing data
CACHE_SHORT_MAX_AGE=30                      # 30 seconds cache
CACHE_SHORT_STALE_WHILE_REVALIDATE=120      # 2 minutes stale-while-revalidate
```

### Default Values

If no environment variables are set, the following defaults are used:

- **Default**: 1 minute cache, 5 minutes stale-while-revalidate
- **Static**: 1 hour cache, 24 hours stale-while-revalidate
- **Event**: 5 minutes cache, 30 minutes stale-while-revalidate
- **Dynamic**: 1 minute cache, 5 minutes stale-while-revalidate
- **Short**: 30 seconds cache, 2 minutes stale-while-revalidate

## Cache Presets

The system provides four cache presets for different types of content:

### 1. STATIC
- **Use case**: Content pages, about pages, terms of service, etc.
- **Cache duration**: 1 hour
- **Stale-while-revalidate**: 24 hours
- **Endpoints**: `/api/public/content/[slug]`, `/api/public/og/*`

### 2. EVENT
- **Use case**: Event details, event information
- **Cache duration**: 5 minutes
- **Stale-while-revalidate**: 30 minutes
- **Endpoints**: `/api/public/events/[id]`

### 3. DYNAMIC
- **Use case**: Data that changes frequently but not constantly
- **Cache duration**: 1 minute
- **Stale-while-revalidate**: 5 minutes
- **Endpoints**: `/api/public/events/[id]/public-participants`, `/api/public/events/[id]/pricing`

### 4. SHORT
- **Use case**: External API calls, search results
- **Cache duration**: 30 seconds
- **Stale-while-revalidate**: 2 minutes
- **Endpoints**: `/api/public/players/fide/search`, `/api/public/players/acf/search`

## Implementation Details

### Cache Headers

The system sets the following cache headers for optimal Vercel deployment:

```
Cache-Control: public, max-age=<duration>, s-maxage=<duration>, stale-while-revalidate=<duration>
CDN-Cache-Control: public, max-age=<duration>, s-maxage=<duration>, stale-while-revalidate=<duration>
Vercel-CDN-Cache-Control: public, max-age=<duration>, s-maxage=<duration>, stale-while-revalidate=<duration>
```

- `Cache-Control`: Standard cache control header for browsers and CDNs
- `CDN-Cache-Control`: Specific header for CDN caching
- `Vercel-CDN-Cache-Control`: Vercel-specific header for optimal CDN caching
- `public`: Allows caching by public caches (CDNs, browsers)
- `max-age`: How long the response can be cached
- `s-maxage`: How long shared caches (CDNs) can cache the response
- `stale-while-revalidate`: How long stale responses can be served while revalidating

### Files Modified

1. **`src/lib/utils/cache.ts`** - Main cache utility functions with Vercel-specific headers
2. **`src/lib/utils/cache-config.ts`** - Cache configuration and environment variables
3. **`src/app/api/public/content/[slug]/route.ts`** - Content API with STATIC caching
4. **`src/app/api/public/events/[id]/route.ts`** - Event API with EVENT caching
5. **`src/app/api/public/events/[id]/public-participants/route.ts`** - Participants API with DYNAMIC caching
6. **`src/app/api/public/events/[id]/pricing/route.ts`** - Pricing API with DYNAMIC caching
7. **`src/app/api/public/players/fide/search/route.ts`** - FIDE search with SHORT caching
8. **`src/app/api/public/players/acf/search/route.ts`** - ACF search with SHORT caching
9. **`src/app/api/public/og/qr/route.ts`** - QR code generation with STATIC caching
10. **`src/app/api/public/og/home/route.ts`** - Home OG image with STATIC caching
11. **`src/app/api/public/og/poster/route.tsx`** - OG poster generation with STATIC caching

## Usage

### Adding Cache to New Endpoints

To add caching to a new public API endpoint:

```typescript
import { createCachedResponse, getCachePresets } from '@/lib/utils/cache'

export async function GET(request: NextRequest) {
  // ... your API logic ...
  
  const data = { /* your data */ }
  
  // Choose appropriate cache preset
  return createCachedResponse(data, getCachePresets().STATIC)
}
```

### Custom Cache Configuration

For custom cache settings:

```typescript
import { createCachedResponse } from '@/lib/utils/cache'

export async function GET(request: NextRequest) {
  // ... your API logic ...
  
  return createCachedResponse(data, {
    maxAge: 120, // 2 minutes
    staleWhileRevalidate: 600, // 10 minutes
    public: true
  })
}
```

### Direct Response Objects (OG Images, etc.)

For routes that return direct Response objects:

```typescript
import { createCacheHeaders, getCachePresets } from '@/lib/utils/cache'

export async function GET(request: Request) {
  // ... your logic ...
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      ...createCacheHeaders(getCachePresets().STATIC)
    },
  })
}
```

## Benefits

1. **Improved Performance**: Faster response times for cached content
2. **Reduced Server Load**: Fewer database queries and API calls
3. **Better User Experience**: Faster page loads and interactions
4. **CDN Optimization**: Better caching at the CDN level with Vercel-specific headers
5. **Configurable**: Easy to adjust cache settings per environment
6. **Vercel Optimized**: Specific headers for optimal Vercel CDN caching

## Monitoring

Monitor cache effectiveness by checking:

1. **Cache hit rates** in your CDN/edge provider
2. **Response times** for cached vs non-cached endpoints
3. **Server load** reduction
4. **Database query frequency** reduction

## Considerations

1. **Cache Invalidation**: Consider implementing cache invalidation for content updates
2. **User-Specific Data**: Don't cache user-specific or sensitive data
3. **Real-time Data**: Avoid caching data that needs to be real-time
4. **Cache Warming**: Consider implementing cache warming for frequently accessed content

## Future Enhancements

1. **Cache Invalidation**: Implement automatic cache invalidation on content updates
2. **Conditional Caching**: Cache based on user roles or other conditions
3. **Cache Analytics**: Add cache hit/miss analytics
4. **Dynamic Cache TTL**: Adjust cache duration based on content update frequency
