# Rate Limiting Setup Guide

This guide will help you set up rate limiting for your booking application using Upstash Redis.

## Prerequisites

1. An Upstash Redis database
2. Environment variables configured

## Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Note down the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Upstash Redis for Rate Limiting
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

For production (Vercel), add these to your Vercel environment variables.

## Step 3: Rate Limit Configuration

The application includes pre-configured rate limits for different endpoints:

- **Authentication**: 5 requests per minute
- **Booking**: 20 requests per minute
- **Events**: 10 requests per minute
- **Admin**: 50 requests per minute
- **Webhooks**: 100 requests per minute
- **Content**: 30 requests per minute
- **Search**: 60 requests per minute
- **General API**: 100 requests per minute
- **Public Pages**: 200 requests per minute

## Step 4: Testing Rate Limiting

1. Start your development server
2. Make multiple requests to a rate-limited endpoint
3. You should see a 429 status code when the limit is exceeded

## Step 5: Monitoring

Rate limiting analytics are available in your Upstash Redis dashboard.

## Troubleshooting

### Rate Limiting Not Working

1. Check that environment variables are set correctly
2. Verify Upstash Redis connection
3. Check console logs for any errors

### Environment Variables Missing

If rate limiting environment variables are missing, the application will:
- Log a warning message
- Continue to function without rate limiting
- Allow all requests to proceed normally

## Customization

You can modify rate limits in `src/lib/rate-limit/config.ts`:

```typescript
// Example: Increase auth rate limit to 10 requests per minute
auth: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // Changed from 5 to 10
  analytics: true,
  prefix: 'ratelimit:auth',
}),
```

## Security Notes

- Rate limiting is applied per IP address by default
- For authenticated users, rate limiting is applied per user ID
- Rate limit headers are included in responses for transparency
- Failed rate limit requests return a 429 status code with retry information
