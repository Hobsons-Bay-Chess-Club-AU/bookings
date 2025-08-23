import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { code, baseAmount, quantity } = await request.json()

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Valid discount code is required' },
                { status: 400 }
            )
        }

        if (typeof baseAmount !== 'number' || baseAmount < 0) {
            return NextResponse.json(
                { error: 'Valid base amount is required' },
                { status: 400 }
            )
        }

        if (typeof quantity !== 'number' || quantity < 1) {
            return NextResponse.json(
                { error: 'Valid quantity is required' },
                { status: 400 }
            )
        }

        // Find the discount code
        const { data: discount, error: discountError } = await supabase
            .from('event_discounts')
            .select('*')
            .eq('event_id', id)
            .eq('code', code.toUpperCase().trim())
            .eq('discount_type', 'code')
            .eq('is_active', true)
            .single()

        if (discountError || !discount) {
            return NextResponse.json(
                { error: 'Invalid or expired discount code' },
                { status: 404 }
            )
        }

        // Check if discount is within date range
        const now = new Date()
        if (discount.start_date && new Date(discount.start_date) > now) {
            return NextResponse.json(
                { error: 'Discount code is not yet active' },
                { status: 400 }
            )
        }
        if (discount.end_date && new Date(discount.end_date) < now) {
            return NextResponse.json(
                { error: 'Discount code has expired' },
                { status: 400 }
            )
        }

        // Check quantity limits
        if (discount.min_quantity && quantity < discount.min_quantity) {
            return NextResponse.json(
                { error: `Minimum quantity of ${discount.min_quantity} required for this discount code` },
                { status: 400 }
            )
        }
        if (discount.max_quantity && quantity > discount.max_quantity) {
            return NextResponse.json(
                { error: `Maximum quantity of ${discount.max_quantity} allowed for this discount code` },
                { status: 400 }
            )
        }

        // Check usage limits
        if (discount.max_uses && discount.current_uses >= discount.max_uses) {
            return NextResponse.json(
                { error: 'Discount code usage limit has been reached' },
                { status: 400 }
            )
        }

        // Calculate discount amount
        let discountAmount = 0
        if (discount.value_type === 'percentage') {
            discountAmount = (baseAmount * discount.value) / 100
        } else {
            discountAmount = discount.value
        }

        // Ensure discount doesn't exceed base amount
        discountAmount = Math.min(discountAmount, baseAmount)
        const finalAmount = Math.max(0, baseAmount - discountAmount)

        return NextResponse.json({
            success: true,
            discount: {
                id: discount.id,
                name: discount.name,
                description: discount.description,
                value_type: discount.value_type,
                value: discount.value
            },
            discountAmount,
            finalAmount,
            message: `Discount applied: ${discount.name}`
        })

    } catch (error) {
        console.error('Error applying discount code:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
