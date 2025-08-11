import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitMiddleware } from './middleware'

// Type for API route handlers - Next.js 15 compatible
type ApiHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

// Wrapper function to apply rate limiting to API routes
export function rateLimitedApi(handler: ApiHandler): ApiHandler {
  return withRateLimit(handler) as ApiHandler
}

// Higher-order function for API routes with custom rate limit config
export function createRateLimitedApi(_rateLimitType: 'auth' | 'booking' | 'events' | 'admin' | 'content' | 'search' | 'webhooks' | 'general') {
  return function(handler: ApiHandler): ApiHandler {
    return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
      // Apply rate limiting
      const rateLimitResult = await rateLimitMiddleware(request)
      if (rateLimitResult) {
        return rateLimitResult
      }
      
      // Call the original handler with the correct signature
      if (context) {
        return handler(request, context)
      } else {
        return handler(request)
      }
    }
  }
}

// Pre-configured rate limit wrappers for common use cases
export const authApi = createRateLimitedApi('auth')
export const bookingApi = createRateLimitedApi('booking')
export const eventsApi = createRateLimitedApi('events')
export const adminApi = createRateLimitedApi('admin')
export const contentApi = createRateLimitedApi('content')
export const searchApi = createRateLimitedApi('search')
export const webhooksApi = createRateLimitedApi('webhooks')
export const generalApi = createRateLimitedApi('general')
