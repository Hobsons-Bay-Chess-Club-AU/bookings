import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient()
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get current year
        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear, 0, 1).toISOString()
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString()

        // Get all discount applications for the user's bookings in the current year
        const { data: discountApplications, error: discountError } = await supabase
            .from('discount_applications')
            .select(`
                applied_value,
                original_amount,
                final_amount,
                applied_at,
                booking:bookings!inner (
                    id,
                    user_id,
                    status,
                    booking_date
                )
            `)
            .eq('booking.user_id', user.id)
            .gte('applied_at', startOfYear)
            .lte('applied_at', endOfYear)
            .in('booking.status', ['confirmed', 'verified', 'pending', 'whitelisted'])

        if (discountError) {
            console.error('Error fetching discount applications:', discountError)
            return NextResponse.json(
                { error: 'Failed to fetch discount data' },
                { status: 500 }
            )
        }

        // Calculate total savings
        const totalSavings = discountApplications?.reduce((sum, app) => {
            return sum + (app.applied_value || 0)
        }, 0) || 0

        // Calculate total spent (original amounts)
        const totalSpent = discountApplications?.reduce((sum, app) => {
            return sum + (app.original_amount || 0)
        }, 0) || 0

        // Calculate total paid (final amounts)
        const totalPaid = discountApplications?.reduce((sum, app) => {
            return sum + (app.final_amount || 0)
        }, 0) || 0

        // Get discount applications count
        const discountCount = discountApplications?.length || 0

        return NextResponse.json({
            totalSavings,
            totalSpent,
            totalPaid,
            discountCount,
            year: currentYear,
            discountApplications: discountApplications?.map(app => ({
                appliedValue: app.applied_value,
                originalAmount: app.original_amount,
                finalAmount: app.final_amount,
                appliedAt: app.applied_at,
                bookingStatus: app.booking?.[0]?.status
            }))
        })
    } catch (error) {
        console.error('Error calculating discount savings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
