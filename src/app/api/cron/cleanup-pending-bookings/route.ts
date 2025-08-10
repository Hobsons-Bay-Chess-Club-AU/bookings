import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanupBookingData } from '@/lib/utils/booking-cleanup'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Find pending bookings older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: oldBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, event_id')
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo)

    if (fetchError) {
      console.error('Error fetching old pending bookings:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch old bookings' }, { status: 500 })
    }

    if (!oldBookings || oldBookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending bookings older than 7 days found',
        deletedCount: 0
      })
    }

    console.log(`🗑️ CLEANING UP ${oldBookings.length} OLD PENDING BOOKINGS`)

    let deletedCount = 0
    const errors: string[] = []

    for (const booking of oldBookings) {
      try {
        console.log(`🗑️ Cleaning up booking: ${booking.id}`)

        // Use the comprehensive cleanup function
        const cleanupResult = await cleanupBookingData(supabase, booking.id, 'cron-cleanup')

        if (cleanupResult.success) {
          deletedCount++
          console.log(`✅ Successfully cleaned up booking: ${booking.id}`)
        } else {
          errors.push(`Failed to cleanup booking ${booking.id}: ${cleanupResult.errors.join(', ')}`)
        }
      } catch (error) {
        console.error(`❌ Error processing booking ${booking.id}:`, error)
        errors.push(`Error processing booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} pending bookings older than 7 days`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error in cleanup-pending-bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 