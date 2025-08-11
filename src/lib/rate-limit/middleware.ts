import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitConfig, getRateLimitIdentifier } from './config'

export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const pathname = request.nextUrl.pathname
    const rateLimit = getRateLimitConfig(pathname)
    
    // If rate limiting is not configured, allow the request
    if (!rateLimit) {
      return null
    }
    
    const identifier = getRateLimitIdentifier(request)

    // Apply rate limiting
    const { success, limit, reset, remaining } = await rateLimit.limit(identifier)

    if (!success) {
      console.warn(`Rate limit exceeded for ${identifier} on ${pathname}`)
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${limit} requests per minute.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
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

    // Add rate limit headers to the response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    return null // Continue with the request
  } catch (error) {
    console.error('Rate limiting error:', error)
    // If rate limiting fails, allow the request to continue
    return null
  }
}

// Higher-order function to wrap API route handlers with rate limiting
export function withRateLimit<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest
    
    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Continue with the original handler
    return handler(...args)
  }
}

// Rate limiting for authenticated users with user-specific limits
export async function rateLimitWithUser(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  try {
    const pathname = request.nextUrl.pathname
    const rateLimit = getRateLimitConfig(pathname)
    
    // If rate limiting is not configured, allow the request
    if (!rateLimit) {
      return null
    }
    
    // Use user ID if available, otherwise fall back to IP
    const identifier = userId ? `user:${userId}` : getRateLimitIdentifier(request)

    const { success, limit, reset, remaining } = await rateLimit.limit(identifier)

    if (!success) {
      console.warn(`Rate limit exceeded for ${identifier} on ${pathname}`)
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${limit} requests per minute.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
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

    // Add rate limit headers to the response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    return null
  } catch (error) {
    console.error('Rate limiting error:', error)
    return null
  }
}
