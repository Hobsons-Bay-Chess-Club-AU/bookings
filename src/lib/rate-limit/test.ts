import { rateLimitConfigs } from './config'
import { validateRateLimitEnv } from './env'

// Test function to verify rate limiting setup
export async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting Setup...')
  
  // Check environment variables
  const envValid = validateRateLimitEnv()
  console.log(`✅ Environment variables: ${envValid ? 'Valid' : 'Missing'}`)
  
  // Check Redis connection
  if (rateLimitConfigs) {
    console.log('✅ Rate limiting configurations: Available')
    
    // Test a simple rate limit
    try {
      const testLimit = rateLimitConfigs.auth
      const result = await testLimit.limit('test-user')
      console.log('✅ Rate limiting test successful:', {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining
      })
    } catch (error) {
      console.error('❌ Rate limiting test failed:', error)
    }
  } else {
    console.log('⚠️ Rate limiting configurations: Not available (Redis not configured)')
  }
  
  console.log('🧪 Rate Limiting Test Complete')
}

// Function to get rate limit status
export function getRateLimitStatus() {
  return {
    enabled: !!rateLimitConfigs,
    envValid: validateRateLimitEnv(),
    configs: rateLimitConfigs ? Object.keys(rateLimitConfigs) : []
  }
}
