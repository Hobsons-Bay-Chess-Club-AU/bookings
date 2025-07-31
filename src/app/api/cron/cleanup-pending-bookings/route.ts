import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Delete pending bookings older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: deletedBookings, error } = await supabase
      .from('bookings')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo)
      .select('id')

    if (error) {
      console.error('Error cleaning up pending bookings:', error)
      return NextResponse.json({ error: 'Failed to cleanup bookings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${deletedBookings?.length || 0} pending bookings`,
      deletedCount: deletedBookings?.length || 0
    })
  } catch (error) {
    console.error('Error in cleanup-pending-bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 