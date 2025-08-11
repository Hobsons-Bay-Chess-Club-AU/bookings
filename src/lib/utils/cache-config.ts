/**
 * Cache configuration for public API endpoints
 * These settings can be overridden via environment variables
 */

export interface CacheSettings {
  // Default cache duration in seconds
  defaultMaxAge: number
  defaultStaleWhileRevalidate: number
  
  // Static content (content pages, about pages, etc.)
  staticMaxAge: number
  staticStaleWhileRevalidate: number
  
  // Event data that might change occasionally
  eventMaxAge: number
  eventStaleWhileRevalidate: number
  
  // Dynamic data that changes frequently
  dynamicMaxAge: number
  dynamicStaleWhileRevalidate: number
  
  // Short-lived cache for frequently changing data
  shortMaxAge: number
  shortStaleWhileRevalidate: number
}

/**
 * Get cache settings from environment variables with sensible defaults
 */
export function getCacheSettings(): CacheSettings {
  return {
    // Default settings (1 minute cache, 5 minutes stale-while-revalidate)
    defaultMaxAge: parseInt(process.env.CACHE_DEFAULT_MAX_AGE || '60'),
    defaultStaleWhileRevalidate: parseInt(process.env.CACHE_DEFAULT_STALE_WHILE_REVALIDATE || '300'),
    
    // Static content (1 hour cache, 24 hours stale-while-revalidate)
    staticMaxAge: parseInt(process.env.CACHE_STATIC_MAX_AGE || '3600'),
    staticStaleWhileRevalidate: parseInt(process.env.CACHE_STATIC_STALE_WHILE_REVALIDATE || '86400'),
    
    // Event data (5 minutes cache, 30 minutes stale-while-revalidate)
    eventMaxAge: parseInt(process.env.CACHE_EVENT_MAX_AGE || '300'),
    eventStaleWhileRevalidate: parseInt(process.env.CACHE_EVENT_STALE_WHILE_REVALIDATE || '1800'),
    
    // Dynamic data (1 minute cache, 5 minutes stale-while-revalidate)
    dynamicMaxAge: parseInt(process.env.CACHE_DYNAMIC_MAX_AGE || '60'),
    dynamicStaleWhileRevalidate: parseInt(process.env.CACHE_DYNAMIC_STALE_WHILE_REVALIDATE || '300'),
    
    // Short-lived cache (30 seconds cache, 2 minutes stale-while-revalidate)
    shortMaxAge: parseInt(process.env.CACHE_SHORT_MAX_AGE || '30'),
    shortStaleWhileRevalidate: parseInt(process.env.CACHE_SHORT_STALE_WHILE_REVALIDATE || '120'),
  }
}

/**
 * Environment variable documentation
 */
export const CACHE_ENV_VARS = {
  CACHE_DEFAULT_MAX_AGE: 'Default cache duration in seconds (default: 60)',
  CACHE_DEFAULT_STALE_WHILE_REVALIDATE: 'Default stale-while-revalidate duration in seconds (default: 300)',
  CACHE_STATIC_MAX_AGE: 'Static content cache duration in seconds (default: 3600)',
  CACHE_STATIC_STALE_WHILE_REVALIDATE: 'Static content stale-while-revalidate duration in seconds (default: 86400)',
  CACHE_EVENT_MAX_AGE: 'Event data cache duration in seconds (default: 300)',
  CACHE_EVENT_STALE_WHILE_REVALIDATE: 'Event data stale-while-revalidate duration in seconds (default: 1800)',
  CACHE_DYNAMIC_MAX_AGE: 'Dynamic data cache duration in seconds (default: 60)',
  CACHE_DYNAMIC_STALE_WHILE_REVALIDATE: 'Dynamic data stale-while-revalidate duration in seconds (default: 300)',
  CACHE_SHORT_MAX_AGE: 'Short-lived cache duration in seconds (default: 30)',
  CACHE_SHORT_STALE_WHILE_REVALIDATE: 'Short-lived cache stale-while-revalidate duration in seconds (default: 120)',
} as const
