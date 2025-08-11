import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'
import { successResponse } from '@/lib/security/api-utils'
import { getSecurityMetrics } from '@/lib/security/audit'
import { getEnvironmentSecurityHeaders } from '@/lib/security/headers'

async function getSecurityStatusHandler(_request: NextRequest) {
  try {
    const metrics = getSecurityMetrics()
    const securityHeaders = getEnvironmentSecurityHeaders()
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      security: {
        headers: {
          configured: Object.keys(securityHeaders).length > 0,
          count: Object.keys(securityHeaders).length,
          enabled: [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy',
            'Content-Security-Policy',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Cross-Origin-Embedder-Policy',
            'Cross-Origin-Opener-Policy',
            'Cross-Origin-Resource-Policy'
          ].filter(header => securityHeaders[header])
        },
        rateLimiting: {
          enabled: !!process.env.UPSTASH_REDIS_REST_URL,
          configured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isProduction: process.env.NODE_ENV === 'production',
          hasHttps: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') || false
        }
      },
      metrics: {
        ...metrics,
        successRate: metrics.totalRequests > 0 
          ? ((metrics.totalRequests - (metrics.rateLimitExceeded + metrics.suspiciousActivities + metrics.authFailures + metrics.authzFailures + metrics.inputValidationFailures + metrics.fileUploadFailures + metrics.apiErrors)) / metrics.totalRequests * 100).toFixed(2) + '%'
          : '100%'
      },
      recommendations: generateSecurityRecommendations(metrics, securityHeaders)
    }
    
    return successResponse(status)
  } catch (error) {
    console.error('Error getting security status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get security status' },
      { status: 500 }
    )
  }
}

function generateSecurityRecommendations(metrics: ReturnType<typeof getSecurityMetrics>, headers: Record<string, string>): string[] {
  const recommendations: string[] = []
  
  // Check for missing security headers
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Content-Security-Policy',
    'Strict-Transport-Security'
  ]
  
  const missingHeaders = requiredHeaders.filter(header => !headers[header])
  if (missingHeaders.length > 0) {
    recommendations.push(`Enable missing security headers: ${missingHeaders.join(', ')}`)
  }
  
  // Check rate limiting
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    recommendations.push('Enable rate limiting with Upstash Redis for production')
  }
  
  // Check for high failure rates
  if (metrics.totalRequests > 0) {
    const failureRate = (metrics.rateLimitExceeded + metrics.suspiciousActivities + metrics.authFailures + metrics.authzFailures + metrics.inputValidationFailures + metrics.fileUploadFailures + metrics.apiErrors) / metrics.totalRequests
    
    if (failureRate > 0.1) { // More than 10% failure rate
      recommendations.push('High failure rate detected - review security logs and consider adjusting rate limits')
    }
  }
  
  // Check for specific security issues
  if (metrics.suspiciousActivities > 0) {
    recommendations.push('Suspicious activities detected - review security logs and consider additional monitoring')
  }
  
  if (metrics.authFailures > 10) {
    recommendations.push('High authentication failure rate - consider implementing account lockout policies')
  }
  
  if (metrics.authzFailures > 5) {
    recommendations.push('Authorization failures detected - review access control policies')
  }
  
  // Environment recommendations
  if (process.env.NODE_ENV !== 'production') {
    recommendations.push('Security headers are relaxed in development mode')
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('https')) {
    recommendations.push('Use HTTPS in production for secure communication')
  }
  
  return recommendations.length > 0 ? recommendations : ['Security configuration looks good!']
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }
  
  return getSecurityStatusHandler(request)
}
