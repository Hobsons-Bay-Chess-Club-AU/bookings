import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params
        const { reason } = await request.json()
        
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // Get booking details with event
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events(
                    id,
                    title,
                    start_date,
                    timeline
                )
            `)
            .eq('id', bookingId)
            .eq('user_id', user.id)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // Check if booking can be refunded
        if (booking.status !== 'confirmed' && booking.status !== 'verified') {
            return NextResponse.json(
                { error: 'Only confirmed or verified bookings can be refunded' },
                { status: 400 }
            )
        }

        if (booking.refund_status !== 'none') {
            return NextResponse.json(
                { error: 'Refund already requested or processed' },
                { status: 400 }
            )
        }

        // Check if event has refund timeline
        const event = booking.event
        if (!event?.timeline?.refund) {
            return NextResponse.json(
                { error: 'This event does not allow refunds' },
                { status: 400 }
            )
        }

        // Calculate refund amount based on timeline
        const calculateRefund = () => {
            const now = new Date()
            const refundTimeline = event.timeline!.refund!
            
            for (const item of refundTimeline) {
                const fromTime = item.from_date ? new Date(item.from_date).getTime() : 0
                const toTime = item.to_date ? new Date(item.to_date).getTime() : new Date(event.start_date).getTime()
                const currentTime = now.getTime()
                
                if (currentTime >= fromTime && currentTime <= toTime) {
                    if (item.type === 'percentage') {
                        return {
                            amount: Math.round((booking.total_amount * item.value) / 100 * 100) / 100,
                            percentage: item.value
                        }
                    } else {
                        return {
                            amount: Math.min(item.value, booking.total_amount),
                            percentage: Math.round((item.value / booking.total_amount) * 100 * 100) / 100
                        }
                    }
                }
            }
            
            // Default to last timeline item
            const lastItem = refundTimeline[refundTimeline.length - 1]
            if (lastItem.type === 'percentage') {
                return {
                    amount: Math.round((booking.total_amount * lastItem.value) / 100 * 100) / 100,
                    percentage: lastItem.value
                }
            } else {
                return {
                    amount: Math.min(lastItem.value, booking.total_amount),
                    percentage: Math.round((lastItem.value / booking.total_amount) * 100 * 100) / 100
                }
            }
        }

        const refundCalculation = calculateRefund()
        
        if (refundCalculation.amount <= 0) {
            return NextResponse.json(
                { error: 'No refund available for this booking at this time' },
                { status: 400 }
            )
        }

        // Update booking with refund request
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                refund_status: 'requested',
                refund_amount: refundCalculation.amount,
                refund_percentage: refundCalculation.percentage,
                refund_requested_at: new Date().toISOString(),
                refund_reason: reason || 'User requested refund'
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('Error updating booking:', updateError)
            return NextResponse.json(
                { error: 'Failed to process refund request' },
                { status: 500 }
            )
        }

        // Process Stripe refund if booking has payment intent
        if (booking.stripe_payment_intent_id) {
            try {
                // Update booking status to processing
                await supabase
                    .from('bookings')
                    .update({ refund_status: 'processing' })
                    .eq('id', bookingId)

                // Create Stripe refund
                const refund = await stripe.refunds.create({
                    payment_intent: booking.stripe_payment_intent_id,
                    amount: Math.round(refundCalculation.amount * 100), // Convert to cents
                    reason: 'requested_by_customer',
                    metadata: {
                        booking_id: bookingId,
                        user_id: user.id,
                        event_id: event.id,
                        original_amount: booking.total_amount.toString(),
                        refund_percentage: refundCalculation.percentage.toString()
                    }
                })

                // Update booking with Stripe refund ID and cancel the booking
                await supabase
                    .from('bookings')
                    .update({ 
                        refund_status: 'completed',
                        refund_processed_at: new Date().toISOString(),
                        status: 'cancelled' // Cancel booking to release the seat
                    })
                    .eq('id', bookingId)

                return NextResponse.json({
                    success: true,
                    refund_amount: refundCalculation.amount,
                    refund_percentage: refundCalculation.percentage,
                    stripe_refund_id: refund.id,
                    message: 'Refund processed successfully'
                })

            } catch (stripeError: any) {
                console.error('Stripe refund error:', stripeError)
                
                // Update booking status to failed
                await supabase
                    .from('bookings')
                    .update({ refund_status: 'failed' })
                    .eq('id', bookingId)

                return NextResponse.json(
                    { error: 'Failed to process refund with payment provider' },
                    { status: 500 }
                )
            }
        } else {
            // For free events or bookings without payment
            await supabase
                .from('bookings')
                .update({ 
                    refund_status: 'completed',
                    refund_processed_at: new Date().toISOString(),
                    status: 'cancelled' // Cancel booking to release the seat
                })
                .eq('id', bookingId)

            return NextResponse.json({
                success: true,
                refund_amount: refundCalculation.amount,
                refund_percentage: refundCalculation.percentage,
                message: 'Refund processed successfully'
            })
        }

    } catch (error) {
        console.error('Refund API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
