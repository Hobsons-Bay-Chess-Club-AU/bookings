export function validateRateLimitEnv() {
  // Check for either KV or UPSTASH environment variables
  const hasRedisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const hasRedisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!hasRedisUrl || !hasRedisToken) {
    console.warn('Missing rate limiting environment variables')
    return false
  }

  return true
}

export function isRateLimitEnabled(): boolean {
  // Allow disabling rate limiting entirely via environment variable
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    console.log('Rate limiting disabled via DISABLE_RATE_LIMITING environment variable')
    return false
  }

  return validateRateLimitEnv()
}
