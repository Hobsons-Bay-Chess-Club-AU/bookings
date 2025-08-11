import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitStatus } from '@/lib/rate-limit/test'
import { adminApi } from '@/lib/rate-limit/api-wrapper'

async function getRateLimitStatusHandler(_request: NextRequest) {
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

export const GET = adminApi(getRateLimitStatusHandler)
