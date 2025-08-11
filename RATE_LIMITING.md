# Rate Limiting Implementation

This document describes the comprehensive rate limiting system implemented for the booking application using Upstash Redis.

## Overview

The rate limiting system provides protection against abuse, DDoS attacks, and ensures fair usage of the application's resources. It's implemented using Upstash Redis for distributed rate limiting across multiple server instances.

## Architecture

### Components

1. **Rate Limit Configuration** (`src/lib/rate-limit/config.ts`)
   - Defines different rate limits for various endpoints
   - Handles Redis connection and fallback scenarios

2. **Rate Limit Middleware** (`src/lib/rate-limit/middleware.ts`)
   - Core rate limiting logic
   - User-specific and IP-based rate limiting
   - Integration with Next.js middleware

3. **API Wrapper** (`src/lib/rate-limit/api-wrapper.ts`)
   - Higher-order functions for easy API route protection
   - Pre-configured wrappers for different endpoint types

4. **Environment Validation** (`src/lib/rate-limit/env.ts`)
   - Validates required environment variables
   - Graceful fallback when Redis is not configured

## Rate Limit Configuration

### Endpoint Categories

| Category | Rate Limit | Description |
|----------|------------|-------------|
| **Authentication** | 5 requests/minute | Login, logout, password reset |
| **Booking** | 20 requests/minute | Booking creation, checkout sessions |
| **Events** | 10 requests/minute | Event creation, editing, management |
| **Admin** | 50 requests/minute | Admin dashboard, content management |
| **Webhooks** | 100 requests/minute | Stripe webhooks, external integrations |
| **Content** | 30 requests/minute | CMS operations, content editing |
| **Search** | 60 requests/minute | Player search, event search |
| **General API** | 100 requests/minute | Other API endpoints |
| **Public Pages** | 200 requests/minute | Public website pages |

### Rate Limiting Strategy

- **Sliding Window**: Uses Upstash's sliding window algorithm for accurate rate limiting
- **Per-User**: Authenticated users are rate limited by user ID
- **Per-IP**: Unauthenticated requests are rate limited by IP address
- **Analytics**: Rate limiting data is tracked for monitoring

## Implementation Details

### Middleware Integration

The rate limiting is integrated into the main Next.js middleware (`src/middleware.ts`):

```typescript
// Apply rate limiting first
const rateLimitResult = await rateLimitWithUser(request)
if (rateLimitResult) {
    return rateLimitResult
}
```

### API Route Protection

API routes can be protected using the wrapper functions:

```typescript
import { authApi } from '@/lib/rate-limit/api-wrapper'

async function loginHandler(request: NextRequest) {
    // Your login logic here
}

export const POST = authApi(loginHandler)
```

### Response Headers

Rate-limited responses include helpful headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
- `Retry-After`: Seconds to wait before retrying

### Error Response

When rate limit is exceeded, a 429 response is returned:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 5 requests per minute.",
  "retryAfter": 45
}
```

## Environment Setup

### Required Environment Variables

```env
# Upstash Redis for Rate Limiting
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### Graceful Fallback

If environment variables are missing:
- Warning messages are logged
- Application continues to function normally
- No rate limiting is applied
- All requests are allowed

## Usage Examples

### Protecting API Routes

```typescript
// Authentication endpoints
import { authApi } from '@/lib/rate-limit/api-wrapper'

export const POST = authApi(async (request) => {
    // Login logic
})

// Booking endpoints
import { bookingApi } from '@/lib/rate-limit/api-wrapper'

export const POST = bookingApi(async (request) => {
    // Booking logic
})

// Admin endpoints
import { adminApi } from '@/lib/rate-limit/api-wrapper'

export const GET = adminApi(async (request) => {
    // Admin logic
})
```

### Custom Rate Limiting

For custom rate limiting needs:

```typescript
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'

export async function POST(request: NextRequest) {
    // Apply custom rate limiting
    const rateLimitResult = await rateLimitMiddleware(request)
    if (rateLimitResult) {
        return rateLimitResult
    }
    
    // Your API logic here
}
```

## Monitoring and Debugging

### Status Endpoint

Check rate limiting status at `/api/rate-limit/status`:

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "envValid": true,
    "configs": ["auth", "booking", "events", "admin", "webhooks", "content", "search", "general", "public"]
  }
}
```

### Logging

Rate limiting events are logged with:
- Rate limit violations
- Configuration issues
- Redis connection problems

### Upstash Dashboard

Monitor rate limiting analytics in your Upstash Redis dashboard:
- Request patterns
- Rate limit hits
- Performance metrics

## Security Considerations

### IP Address Handling

- Uses `x-forwarded-for` header for accurate IP detection
- Handles multiple proxy scenarios
- Falls back to 'unknown' if IP cannot be determined

### User Identification

- Authenticated users: Rate limited by user ID
- Unauthenticated users: Rate limited by IP address
- Prevents user ID spoofing through proper authentication checks

### Rate Limit Bypass Prevention

- Rate limiting applied at middleware level
- Consistent across all routes
- No client-side bypass possible

## Performance Impact

### Minimal Overhead

- Redis operations are fast and efficient
- Rate limiting checks happen early in request lifecycle
- Graceful degradation when Redis is unavailable

### Caching Strategy

- Upstash Redis provides built-in caching
- Rate limit data is automatically managed
- No additional caching layer required

## Troubleshooting

### Common Issues

1. **Rate limiting not working**
   - Check environment variables
   - Verify Upstash Redis connection
   - Check console logs for errors

2. **False positives**
   - Verify IP address detection
   - Check for proxy configurations
   - Review rate limit thresholds

3. **Performance issues**
   - Monitor Redis connection
   - Check rate limit analytics
   - Consider adjusting limits

### Debug Mode

Enable debug logging by checking console output for:
- Rate limit configuration status
- Redis connection status
- Rate limit violation logs

## Future Enhancements

### Planned Features

1. **Dynamic Rate Limiting**
   - Adjust limits based on user behavior
   - Implement adaptive rate limiting

2. **Advanced Analytics**
   - Detailed rate limiting reports
   - Anomaly detection

3. **Custom Rules**
   - Endpoint-specific rate limits
   - Time-based rate limiting

4. **Rate Limit Exemptions**
   - Whitelist for trusted users
   - API key-based exemptions

## Best Practices

1. **Start Conservative**: Begin with lower limits and adjust based on usage
2. **Monitor Regularly**: Check rate limiting analytics frequently
3. **User Communication**: Provide clear error messages for rate limit violations
4. **Graceful Degradation**: Ensure application works without rate limiting
5. **Documentation**: Keep rate limits documented for API consumers

## Support

For issues with rate limiting:
1. Check the troubleshooting section
2. Review Upstash Redis documentation
3. Monitor application logs
4. Test with the status endpoint
