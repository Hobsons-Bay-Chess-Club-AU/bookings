import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitStatus } from '@/lib/rate-limit/test'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'

async function getRateLimitStatusHandler() {
  try {
    const status = getRateLimitStatus()
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting rate limit status:', error)
    return NextResponse.json(
      { error: 'Failed to get rate limit status' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }
  
  return getRateLimitStatusHandler()
}
