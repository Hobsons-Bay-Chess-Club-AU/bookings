import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { validateRateLimitEnv } from './env'

// Initialize Redis client only if environment variables are available
let redis: Redis | null = null

if (validateRateLimitEnv()) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

// Create rate limit configurations only if Redis is available
export const rateLimitConfigs = redis ? {
  // General API endpoints - 100 requests per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:general',
  }),

  // Authentication endpoints - 5 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:auth',
  }),

  // Booking endpoints - 20 requests per minute
  booking: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:booking',
  }),

  // Event creation/editing - 10 requests per minute
  events: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:events',
  }),

  // Admin endpoints - 50 requests per minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:admin',
  }),

  // Stripe webhooks - 100 requests per minute
  webhooks: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:webhooks',
  }),

  // Content management - 30 requests per minute
  content: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:content',
  }),

  // Search endpoints - 60 requests per minute
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:search',
  }),

  // Public pages - 200 requests per minute
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: false, // Disable analytics to reduce Redis commands
    prefix: 'ratelimit:public',
  }),
} : null

// Cache for rate limit configs to avoid repeated lookups
const rateLimitCache = new Map<string, Ratelimit | null>()

// Helper function to get rate limit config based on path
export function getRateLimitConfig(pathname: string): Ratelimit | null {
  if (!rateLimitConfigs) {
    return null
  }

  // Check cache first
  if (rateLimitCache.has(pathname)) {
    return rateLimitCache.get(pathname)!
  }

  let config: Ratelimit | null = null

  // Authentication routes
  if (pathname.startsWith('/api/auth/')) {
    config = rateLimitConfigs.auth
  }
  // Booking routes
  else if (pathname.startsWith('/api/bookings/') || pathname.startsWith('/api/create-checkout-session')) {
    config = rateLimitConfigs.booking
  }
  // Event management routes
  else if (pathname.startsWith('/api/events/') || pathname.startsWith('/api/public/events/')) {
    config = rateLimitConfigs.events
  }
  // Admin routes
  else if (pathname.startsWith('/api/admin/')) {
    config = rateLimitConfigs.admin
  }
  // Webhook routes
  else if (pathname.startsWith('/api/webhooks/')) {
    config = rateLimitConfigs.webhooks
  }
  // Content management routes
  else if (pathname.startsWith('/api/public/content/')) {
    config = rateLimitConfigs.content
  }
  // Search routes
  else if (pathname.startsWith('/api/public/players/') || pathname.includes('search')) {
    config = rateLimitConfigs.search
  }
  // Public API routes
  else if (pathname.startsWith('/api/')) {
    config = rateLimitConfigs.general
  }
  // Public pages - only apply to specific high-traffic pages
  else if (shouldRateLimitPublicPage(pathname)) {
    config = rateLimitConfigs.public
  }

  // Cache the result
  rateLimitCache.set(pathname, config)
  return config
}

// Helper function to determine if a public page should be rate limited
function shouldRateLimitPublicPage(pathname: string): boolean {
  // Only rate limit specific high-traffic pages, not all public pages
  const highTrafficPages = [
    '/', // Home page
    '/events', // Events listing
    '/search', // Search page
    '/past', // Past events
  ]
  
  return highTrafficPages.includes(pathname)
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
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${limit} requests per minute.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString(),
        // Security headers
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '1; mode=block',
      },
    }
  )
}
