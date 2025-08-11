import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { validateRateLimitEnv } from './env'

// Initialize Redis client only if environment variables are available
let redis: Redis | null = null

if (validateRateLimitEnv()) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

// Create rate limit configurations only if Redis is available
export const rateLimitConfigs = redis ? {
  // General API endpoints - 100 requests per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:general',
  }),

  // Authentication endpoints - 5 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // Booking endpoints - 20 requests per minute
  booking: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
    prefix: 'ratelimit:booking',
  }),

  // Event creation/editing - 10 requests per minute
  events: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:events',
  }),

  // Admin endpoints - 50 requests per minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: true,
    prefix: 'ratelimit:admin',
  }),

  // Stripe webhooks - 100 requests per minute
  webhooks: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:webhooks',
  }),

  // Content management - 30 requests per minute
  content: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:content',
  }),

  // Search endpoints - 60 requests per minute
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:search',
  }),

  // Public pages - 200 requests per minute
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: true,
    prefix: 'ratelimit:public',
  }),
} : null

// Helper function to get rate limit config based on path
export function getRateLimitConfig(pathname: string): Ratelimit | null {
  if (!rateLimitConfigs) {
    return null
  }

  // Authentication routes
  if (pathname.startsWith('/api/auth/')) {
    return rateLimitConfigs.auth
  }

  // Booking routes
  if (pathname.startsWith('/api/bookings/') || pathname.startsWith('/api/create-checkout-session')) {
    return rateLimitConfigs.booking
  }

  // Event management routes
  if (pathname.startsWith('/api/events/')) {
    return rateLimitConfigs.events
  }

  // Admin routes
  if (pathname.startsWith('/api/admin/')) {
    return rateLimitConfigs.admin
  }

  // Webhook routes
  if (pathname.startsWith('/api/webhooks/')) {
    return rateLimitConfigs.webhooks
  }

  // Content management routes
  if (pathname.startsWith('/api/content/')) {
    return rateLimitConfigs.content
  }

  // Search routes
  if (pathname.startsWith('/api/players/') || pathname.includes('search')) {
    return rateLimitConfigs.search
  }

  // Public API routes
  if (pathname.startsWith('/api/')) {
    return rateLimitConfigs.general
  }

  // Public pages
  return rateLimitConfigs.public
}

// Helper function to get identifier for rate limiting
export function getRateLimitIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  
  // For authenticated users, use their user ID for more granular control
  // This will be handled in the middleware where we have access to user context
  return ip
}

// Rate limit error response
export function createRateLimitError(limit: number, reset: number) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${limit} requests per minute.`,
      retryAfter: Math.ceil((reset - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString(),
      },
    }
  )
}
