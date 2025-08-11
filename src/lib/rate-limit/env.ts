// Environment variable validation for rate limiting
export function validateRateLimitEnv() {
  const requiredEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.warn('⚠️ Missing rate limiting environment variables:', missingVars)
    console.warn('Rate limiting will be disabled. Please set the following environment variables:')
    missingVars.forEach(varName => {
      console.warn(`  - ${varName}`)
    })
    return false
  }

  return true
}

// Check if rate limiting is enabled
export function isRateLimitEnabled(): boolean {
  return validateRateLimitEnv()
}
