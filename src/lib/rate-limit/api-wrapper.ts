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
export function createRateLimitedApi() {
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
export const authApi = createRateLimitedApi()
export const bookingApi = createRateLimitedApi()
export const eventsApi = createRateLimitedApi()
export const adminApi = createRateLimitedApi()
export const contentApi = createRateLimitedApi()
export const searchApi = createRateLimitedApi()
export const webhooksApi = createRateLimitedApi()
export const generalApi = createRateLimitedApi()
