import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

interface DiscountRule {
    id: string
    rule_type: string
    field_name?: string
    field_value?: string
    operator?: string
    related_event_id?: string
}

interface SeatDiscountRule {
    id: string
    min_seats: number
    max_seats?: number
    discount_amount: number
    discount_percentage?: number
}

interface EventDiscount {
    id: string
    name: string
    discount_type: string
    value_type: string
    value: number
    start_date?: string
    end_date?: string
    min_quantity?: number
    max_quantity?: number
    max_uses?: number
    current_uses: number
    rules?: DiscountRule[]
    seat_rules?: SeatDiscountRule[]
}

interface Participant {
    first_name?: string
    last_name?: string
    email?: string
    date_of_birth?: string
    custom_data?: Record<string, unknown>
    [key: string]: unknown
}

interface AppliedDiscount {
    discount: EventDiscount
    amount: number
    eligibleParticipants?: number
    quantity?: number
    type: string
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { participants, baseAmount, quantity } = await request.json()

        if (!participants || !Array.isArray(participants)) {
            return NextResponse.json(
                { error: 'Participants array is required' },
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

        // Get all active discounts for the event
        console.log('Fetching discounts for event:', id)
        
        let discounts: EventDiscount[] = []
        let discountsError: Error | null = null
        
        try {
            const result = await supabase
                .from('event_discounts')
                .select(`
                    *,
                    rules:participant_discount_rules(*),
                    seat_rules:seat_discount_rules(*)
                `)
                .eq('event_id', id)
                .eq('is_active', true)
            
            discounts = result.data || []
            discountsError = result.error

            console.log('Discounts query result:', { discounts, discountsError })

            if (discountsError) {
                console.error('Error fetching discounts:', discountsError)
                return NextResponse.json(
                    { error: 'Failed to fetch discounts', details: discountsError },
                    { status: 500 }
                )
            }
        } catch (error) {
            console.error('Exception during discounts query:', error)
            return NextResponse.json(
                { error: 'Exception during discounts query', details: error },
                { status: 500 }
            )
        }

        if (!discounts || discounts.length === 0) {
            return NextResponse.json({
                totalDiscount: 0,
                appliedDiscounts: [],
                finalAmount: baseAmount
            })
        }

        let totalDiscount = 0
        const appliedDiscounts: AppliedDiscount[] = []

        // Check each discount
        for (const discount of discounts) {
            // Check if discount is within date range
            const now = new Date()
            if (discount.start_date && new Date(discount.start_date) > now) {
                continue
            }
            if (discount.end_date && new Date(discount.end_date) < now) {
                continue
            }

            // Check quantity limits
            if (discount.min_quantity && quantity < discount.min_quantity) {
                continue
            }
            if (discount.max_quantity && quantity > discount.max_quantity) {
                continue
            }

            // Check usage limits
            if (discount.max_uses && discount.current_uses >= discount.max_uses) {
                continue
            }

            // For participant-based discounts, check if any participant qualifies
            if (discount.discount_type === 'participant_based') {
                let eligibleParticipants = 0

                for (const participant of participants) {
                    const isEligible = await checkParticipantEligibility(
                        supabase,
                        discount.id,
                        participant,
                        participants
                    )
                    if (isEligible) {
                        eligibleParticipants++
                    }
                }

                if (eligibleParticipants > 0) {
                    // Calculate discount for eligible participants
                    const discountAmount = calculateDiscountAmount(
                        discount,
                        baseAmount,
                        eligibleParticipants
                    )

                    if (discountAmount > 0) {
                        totalDiscount += discountAmount
                        appliedDiscounts.push({
                            discount,
                            amount: discountAmount,
                            eligibleParticipants,
                            type: 'participant_based'
                        })
                    }
                }
            }

            // For seat-based discounts, calculate based on quantity
            if (discount.discount_type === 'seat_based') {
                const discountAmount = calculateDiscountAmount(
                    discount,
                    baseAmount,
                    quantity
                )

                if (discountAmount > 0) {
                    totalDiscount += discountAmount
                    appliedDiscounts.push({
                        discount,
                        amount: discountAmount,
                        quantity,
                        type: 'seat_based'
                    })
                }
            }
        }

        const finalAmount = Math.max(0, baseAmount - totalDiscount)

        return NextResponse.json({
            totalDiscount,
            appliedDiscounts,
            finalAmount
        })

    } catch (error) {
        console.error('Error calculating discounts:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function checkParticipantEligibility(
    supabase: SupabaseClient,
    discountId: string,
    participant: Participant,
    allParticipants: Participant[]
): Promise<boolean> {
    try {
        // Get discount rules
        const { data: rules, error: rulesError } = await supabase
            .from('participant_discount_rules')
            .select('*')
            .eq('discount_id', discountId)

        if (rulesError || !rules || rules.length === 0) {
            return false
        }

        // Check each rule
        for (const rule of rules) {
            let matches = false

            switch (rule.rule_type) {
                case 'name_match':
                    if (rule.field_name === 'first_name') {
                        matches = participant.first_name === rule.field_value
                    } else if (rule.field_name === 'last_name') {
                        matches = participant.last_name === rule.field_value
                    }
                    break

                case 'dob_match':
                    if (participant.date_of_birth) {
                        const dob = new Date(participant.date_of_birth).toISOString().split('T')[0]
                        matches = dob === rule.field_value
                    }
                    break

                case 'custom':
                    if (participant.custom_data && rule.field_name) {
                        const customValue = participant.custom_data[rule.field_name]
                        if (customValue !== undefined) {
                            switch (rule.operator) {
                                case 'equals':
                                    matches = String(customValue) === rule.field_value
                                    break
                                case 'contains':
                                    matches = String(customValue).includes(rule.field_value || '')
                                    break
                                case 'starts_with':
                                    matches = String(customValue).startsWith(rule.field_value || '')
                                    break
                                case 'ends_with':
                                    matches = String(customValue).endsWith(rule.field_value || '')
                                    break
                            }
                        }
                    }
                    break

                case 'previous_event':
                    // Check if participant has attended a related event
                    if (rule.related_event_id) {
                        const participationStatus = rule.field_value || 'any'
                        const matchFields = rule.field_name?.split(',').filter((f: string) => f.trim() !== '') || ['first_name', 'last_name']
                        
                        // Query bookings for the related event
                        const { data: previousBookings, error: bookingError } = await supabase
                            .from('bookings')
                            .select('id, status, participants(*)')
                            .eq('event_id', rule.related_event_id)
                        
                        if (!bookingError && previousBookings) {
                            // Check if any participant in the current booking matches participants from previous event
                            for (const previousBooking of previousBookings) {
                                // Check booking status based on participation status requirement
                                let statusMatches = false
                                switch (participationStatus) {
                                    case 'any':
                                        statusMatches = ['pending', 'confirmed', 'verified'].includes(previousBooking.status)
                                        break
                                    case 'confirmed':
                                        statusMatches = ['confirmed', 'verified'].includes(previousBooking.status)
                                        break
                                    case 'verified':
                                        statusMatches = previousBooking.status === 'verified'
                                        break
                                    default:
                                        statusMatches = ['pending', 'confirmed', 'verified'].includes(previousBooking.status)
                                }
                                
                                if (statusMatches && previousBooking.participants) {
                                    // Check if any participant from current booking matches previous event participants
                                    for (const currentParticipant of allParticipants) {
                                        for (const previousParticipant of previousBooking.participants) {
                                            // Dynamic field matching based on selected fields
                                            let allFieldsMatch = true
                                            
                                            for (const field of matchFields) {
                                                const currentValue = currentParticipant[field]
                                                const previousValue = previousParticipant[field]
                                                
                                                // Handle date of birth comparison
                                                if (field === 'date_of_birth') {
                                                    const currentDob = currentValue && typeof currentValue === 'string' ? new Date(currentValue).toISOString().split('T')[0] : null
                                                    const previousDob = previousValue && typeof previousValue === 'string' ? new Date(previousValue).toISOString().split('T')[0] : null
                                                    if (currentDob !== previousDob) {
                                                        allFieldsMatch = false
                                                        break
                                                    }
                                                } else {
                                                    // String comparison for other fields
                                                    if (currentValue !== previousValue) {
                                                        allFieldsMatch = false
                                                        break
                                                    }
                                                }
                                            }
                                            
                                            if (allFieldsMatch) {
                                                matches = true
                                                break
                                            }
                                        }
                                        if (matches) break
                                    }
                                }
                                if (matches) break
                            }
                        }
                    }
                    break
            }

            // If any rule doesn't match, the participant is not eligible
            if (!matches) {
                return false
            }
        }

        return true
    } catch (error) {
        console.error('Error checking participant eligibility:', error)
        return false
    }
}

function calculateDiscountAmount(
    discount: EventDiscount,
    baseAmount: number,
    eligibleQuantity: number
): number {
    let discountAmount = 0

    if (discount.value_type === 'percentage') {
        // Calculate percentage discount
        discountAmount = (baseAmount * discount.value) / 100
    } else {
        // Fixed amount discount per eligible participant
        discountAmount = discount.value * eligibleQuantity
    }

    // Ensure discount doesn't exceed base amount
    return Math.min(discountAmount, baseAmount)
} 