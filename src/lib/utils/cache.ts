import { NextResponse } from 'next/server'
import { getCacheSettings } from './cache-config'

export interface CacheConfig {
  maxAge?: number // Cache duration in seconds (default: 60)
  staleWhileRevalidate?: number // Stale-while-revalidate duration in seconds (default: 300)
  public?: boolean // Whether the response can be cached by public caches (default: true)
}

/**
 * Creates cache control string for Vercel deployment
 * @param config - Cache configuration options
 * @returns Cache control string
 */
export function createCacheControlString(config: CacheConfig = {}): string {
  const settings = getCacheSettings()
  
  const {
    maxAge = settings.defaultMaxAge,
    staleWhileRevalidate = settings.defaultStaleWhileRevalidate,
    public: isPublic = true
  } = config

  return [
    isPublic ? 'public' : 'private',
    `max-age=${maxAge}`,
    `s-maxage=${maxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`
  ].join(', ')
}

/**
 * Adds caching headers to a NextResponse for public API endpoints
 * @param response - The NextResponse to add cache headers to
 * @param config - Cache configuration options
 * @returns The response with cache headers added
 */
export function addCacheHeaders(response: NextResponse, config: CacheConfig = {}): NextResponse {
  const cacheControl = createCacheControlString(config)
  
  // Set standard cache headers
  response.headers.set('Cache-Control', cacheControl)
  
  // Set Vercel-specific cache headers for optimal CDN caching
  if (config.public !== false) {
    response.headers.set('CDN-Cache-Control', cacheControl)
    response.headers.set('Vercel-CDN-Cache-Control', cacheControl)
  }

  return response
}

/**
 * Creates a cached response with the given data and cache configuration
 * @param data - The data to return in the response
 * @param config - Cache configuration options
 * @returns A NextResponse with the data and cache headers
 */
export function createCachedResponse(data: unknown, config: CacheConfig = {}): NextResponse {
  const response = NextResponse.json(data)
  return addCacheHeaders(response, config)
}

/**
 * Creates cache headers object for direct Response objects (useful for OG images, etc.)
 * @param config - Cache configuration options
 * @returns Headers object with cache headers
 */
export function createCacheHeaders(config: CacheConfig = {}): Record<string, string> {
  const cacheControl = createCacheControlString(config)
  
  const headers: Record<string, string> = {
    'Cache-Control': cacheControl
  }
  
  // Set Vercel-specific cache headers for optimal CDN caching
  if (config.public !== false) {
    headers['CDN-Cache-Control'] = cacheControl
    headers['Vercel-CDN-Cache-Control'] = cacheControl
  }
  
  return headers
}

/**
 * Cache configuration presets for different types of public content
 */
export const CACHE_PRESETS = {
  // Static content that rarely changes (content pages, about pages, etc.)
  STATIC: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    public: true
  },
  
  // Event data that might change occasionally
  EVENT: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 1800, // 30 minutes
    public: true
  },
  
  // Dynamic data that changes frequently
  DYNAMIC: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
    public: true
  },
  
  // Short-lived cache for frequently changing data
  SHORT: {
    maxAge: 30, // 30 seconds
    staleWhileRevalidate: 120, // 2 minutes
    public: true
  }
} as const

/**
 * Get cache presets with environment variable overrides
 */
export function getCachePresets() {
  const settings = getCacheSettings()
  
  return {
    STATIC: {
      maxAge: settings.staticMaxAge,
      staleWhileRevalidate: settings.staticStaleWhileRevalidate,
      public: true
    },
    EVENT: {
      maxAge: settings.eventMaxAge,
      staleWhileRevalidate: settings.eventStaleWhileRevalidate,
      public: true
    },
    DYNAMIC: {
      maxAge: settings.dynamicMaxAge,
      staleWhileRevalidate: settings.dynamicStaleWhileRevalidate,
      public: true
    },
    SHORT: {
      maxAge: settings.shortMaxAge,
      staleWhileRevalidate: settings.shortStaleWhileRevalidate,
      public: true
    }
  } as const
}
