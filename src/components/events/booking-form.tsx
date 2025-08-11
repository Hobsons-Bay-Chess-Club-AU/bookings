'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile, EventPricing, Participant, FormField } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'
import Step1Pricing from './booking-steps/step-1-pricing'
import Step2Contact from './booking-steps/step-2-contact'
import Step3Participants from './booking-steps/step-3-participants'
import Step4Review from './booking-steps/step-4-review'
import { useBookingJourney } from '@/contexts/BookingJourneyContext'
import { HiCheck } from 'react-icons/hi2'
import { useSearchParams } from 'next/navigation'

interface BookingFormProps {
    event: Event
    user?: Profile // Make user optional
    onStepChange?: (step: number) => void // Callback for when booking step changes
    initialStep?: string
    resumeBookingId?: string
}

// Function removed as it was unused
// function isBookable(event: Event) {
//     const now = new Date()
//     if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
//     return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
// }

export default function BookingForm({ event, user, onStepChange, initialStep, resumeBookingId }: BookingFormProps) {
    const searchParams = useSearchParams()
    const [step, setStep] = useState(1) // 1: Pricing & Quantity, 2: Contact Info, 3: Participant Info, 4: Review, 5: Checkout
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [availablePricing, setAvailablePricing] = useState<EventPricing[]>([])
    const [selectedPricing, setSelectedPricing] = useState<EventPricing | null>(null)
    const [pricingLoading, setPricingLoading] = useState(true)
    const [contactInfo, setContactInfo] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    })
    const [participants, setParticipants] = useState<Partial<Participant & { email?: string; phone?: string }>[]>([])
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
    const [isLegitimateResume, setIsLegitimateResume] = useState(false)
    const [wasCreatedAsWhitelisted, setWasCreatedAsWhitelisted] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [optInMarketing, setOptInMarketing] = useState(false)
    const [shouldRedirect, setShouldRedirect] = useState(false)
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [discountInfo, setDiscountInfo] = useState<{
        totalDiscount: number
        appliedDiscounts: Array<{
            discount: {
                id: string
                name: string
                rules?: Array<{
                    rule_type: string
                    [key: string]: unknown
                }>
            }
            amount: number
            eligibleParticipants?: number
            type: string
        }>
        finalAmount: number
    } | null>(null)
    const [discountLoading, setDiscountLoading] = useState(false)
    const [hasDiscounts, setHasDiscounts] = useState(false)

    const supabase = createClient()
    
    // Use booking journey context
    const { setIsInBookingJourney, setBookingStep } = useBookingJourney()

    const baseAmount = selectedPricing ? selectedPricing.price * quantity : (event.price * quantity)
    const totalAmount = discountInfo?.finalAmount ?? baseAmount
    // Processing fee estimation for display (final fee calculated server-side)
    const processingFee = totalAmount > 0 ? totalAmount * 0.017 + 0.30 : 0
    const isEventFull = event.max_attendees != null && event.current_attendees >= event.max_attendees
    const whitelistEnabled = Boolean(event.settings?.whitelist_enabled)
    // Treat any active resume context as bypass for whitelist/sold-out checks
    const isResumeFlowActive = isLegitimateResume || Boolean(currentBookingId) || Boolean(resumeBookingId)
    const shouldWhitelist = isEventFull && whitelistEnabled && !isResumeFlowActive
    const maxQuantity = event.max_attendees
        ? Math.min(10, Math.max(0, event.max_attendees - event.current_attendees))
        : 10

    // Fetch available pricing options and form fields
    useEffect(() => {
        const fetchData = async () => {
            try {
                setPricingLoading(true)

                // Fetch pricing options
                const membershipType = user?.membership_type || 'non_member'
                const pricingResponse = await fetch(`/api/public/events/${event.id}/pricing?membership_type=${membershipType}`)
                if (!pricingResponse.ok) {
                    throw new Error('Failed to fetch pricing')
                }
                const pricing = await pricingResponse.json()
                
                // If no pricing options are available, create a default option using event's base price
                if (pricing.length === 0) {
                    const defaultPricing: EventPricing = {
                        id: 'default', // This is a virtual ID for UI purposes only
                        event_id: event.id,
                        name: event.price === 0 ? 'Free Event' : 'General Admission',
                        description: event.price === 0 ? 'This is a free event' : 'Standard event pricing',
                        pricing_type: 'regular',
                        membership_type: 'all',
                        price: event.price, // Use the event's base price
                        start_date: new Date().toISOString(),
                        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
                        is_active: true,
                        max_tickets: event.max_attendees || undefined,
                        tickets_sold: 0,
                        available_tickets: event.max_attendees || 999,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                    setAvailablePricing([defaultPricing])
                    setSelectedPricing(defaultPricing)
                } else {
                    setAvailablePricing(pricing)
                    // Auto-select the first (cheapest) available pricing
                    setSelectedPricing(pricing[0])
                }

                // Set form fields from event
                setFormFields(event.custom_form_fields || [])

                // Check if event has discounts
                const { data: discounts } = await supabase
                    .from('event_discounts')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('is_active', true)
                
                setHasDiscounts(Boolean(discounts && discounts.length > 0))

            } catch (err: unknown) {
                console.error('Error fetching data:', err)
                setError((err as Error).message || 'Failed to load event data')
            } finally {
                setPricingLoading(false)
            }
        }

        fetchData()
    }, [event.id, user?.membership_type, event.custom_form_fields, event.max_attendees, event.price, supabase])

    // Notify parent component when step changes
    useEffect(() => {
        onStepChange?.(step)
    }, [step, onStepChange])

    // Update booking journey context when step changes
    useEffect(() => {
        setIsInBookingJourney(step > 1)
        setBookingStep(step)
    }, [step, setIsInBookingJourney, setBookingStep])

    // Auto-select pricing when available pricing changes
    useEffect(() => {
        if (availablePricing.length > 0 && !selectedPricing) {
            setSelectedPricing(availablePricing[0])
        }
    }, [availablePricing, selectedPricing, step])

    // Reset redirect state when step changes
    useEffect(() => {
        if (step !== 5) {
            setShouldRedirect(false)
        }
    }, [step])

    // Handle resuming from URL parameters or props
    useEffect(() => {
        const urlStep = searchParams?.get('step') || initialStep
        const urlResumeBookingId = searchParams?.get('resume') || resumeBookingId
        
        if (urlStep && urlResumeBookingId) {
            const stepNumber = parseInt(urlStep)
            if (stepNumber >= 1 && stepNumber <= 4) {
                setStep(stepNumber)
                
                // Notify parent component about step change
                if (onStepChange) {
                    onStepChange(stepNumber)
                }
                
                // Load existing booking data
                loadResumedBookingData(urlResumeBookingId)
            }
        }
    }, [searchParams, initialStep, resumeBookingId, onStepChange])

    const loadResumedBookingData = async (bookingId: string) => {
        try {
            const response = await fetch('/api/bookings/check-complete-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookingId })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.canResume) {
                    // Set the existing booking ID and mark as legitimate resume
                    setCurrentBookingId(bookingId)
                    setIsLegitimateResume(true)
                    
                    // Load participants data
                    if (data.booking.participants) {
                        // Map database fields to form fields
                        const mappedParticipants = data.booking.participants.map((p: { contact_email?: string; contact_phone?: string; [key: string]: unknown }) => ({
                            ...p,
                            email: p.contact_email,
                            phone: p.contact_phone
                        })) as Partial<Participant & { email?: string; phone?: string }>[]
                        setParticipants(mappedParticipants)
                        setQuantity(data.booking.quantity)
                    }
                    
                    // Set form fields
                    if (data.booking.formFields) {
                        setFormFields(data.booking.formFields)
                    }
                    
                    console.log('✅ Resumed booking data loaded:', data.booking)
                }
            }
        } catch (error) {
            console.error('Error loading resumed booking data:', error)
            setError('Failed to load booking data')
        }
    }

    // Handle redirect for free events
    useEffect(() => {
        console.log('🔍 Redirect useEffect triggered:', {
            step,
            currentBookingId,
            shouldRedirect,
            totalAmount,
            selectedPricingPrice: selectedPricing?.price,
            isFreeEvent: totalAmount === 0 || selectedPricing?.price === 0
        })

        if (shouldRedirect && currentBookingId && (totalAmount === 0 || selectedPricing?.price === 0)) {
            console.log('✅ Conditions met for redirect, setting timeout...')
            
            // Clear any existing timeout
            if (redirectTimeoutRef.current) {
                console.log('🔄 Clearing existing timeout')
                clearTimeout(redirectTimeoutRef.current)
            }
            
            // Set new redirect timeout
            redirectTimeoutRef.current = setTimeout(() => {
                console.log('🚀 Executing redirect to:', `/booking/success?booking_id=${currentBookingId}`)
                window.location.href = `/booking/success?booking_id=${currentBookingId}`
            }, 2000)
            
            console.log('⏰ Redirect timeout set for 2 seconds')
        } else {
            console.log('❌ Redirect conditions not met:', {
                shouldRedirect,
                hasBookingId: !!currentBookingId,
                isFreeEvent: totalAmount === 0 || selectedPricing?.price === 0
            })
        }

        // Cleanup timeout on unmount
        return () => {
            if (redirectTimeoutRef.current) {
                console.log('🧹 Cleaning up redirect timeout')
                clearTimeout(redirectTimeoutRef.current)
            }
        }
    }, [shouldRedirect, currentBookingId, totalAmount, selectedPricing, step])



    const handleContinueToContact = () => {
        setError('')

        if (!user) {
            if (typeof window !== 'undefined') {
                window.location.href = `/auth/login?redirectTo=${window.location.pathname}`
            }
            return
        }

        // If no pricing is selected but we have available pricing, auto-select the first one
        if (!selectedPricing && availablePricing.length > 0) {
            setSelectedPricing(availablePricing[0])
        }

        // If still no pricing selected, show error
        if (!selectedPricing) {
            setError('Please select a pricing option')
            return
        }

        // Pre-fill contact info with user data if available
        if (user) {
            const userFullName = user.full_name || ''
            const nameParts = userFullName.split(' ')
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''

            setContactInfo({
                first_name: firstName,
                last_name: lastName,
                email: user.email || '',
                phone: user.phone || ''
            })
        }

        setStep(2)
        if (onStepChange) {
            onStepChange(2)
        }
    }

    const handleContinueToParticipants = () => {
        setError('')

        if (!contactInfo.first_name.trim() || !contactInfo.last_name.trim() || !contactInfo.email.trim()) {
            setError('Please complete all required contact information')
            return
        }

        // Initialize participants array with contact info for the first participant
        const initialParticipants = Array.from({ length: quantity }, (_, index) => {
            if (index === 0) {
                // Pre-fill first participant with contact info

                return {
                    first_name: contactInfo.first_name,
                    last_name: contactInfo.last_name,
                    email: contactInfo.email,
                    phone: contactInfo.phone,
                    custom_data: {}
                }
            } else {
                // Empty data for additional participants
                return {
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    custom_data: {}
                }
            }
        })
        setParticipants(initialParticipants)
        setStep(3)
        if (onStepChange) {
            onStepChange(3)
        }
    }

    const calculateDiscounts = useCallback(async () => {
        if (participants.length === 0) {
            setDiscountInfo(null)
            return
        }

        try {
            setDiscountLoading(true)
            const response = await fetch(`/api/events/${event.id}/calculate-discounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participants,
                    baseAmount,
                    quantity
                })
            })

            if (response.ok) {
                const discountData = await response.json()
                setDiscountInfo(discountData)
            } else {
                console.error('Failed to calculate discounts')
                setDiscountInfo(null)
            }
        } catch (error) {
            console.error('Error calculating discounts:', error)
            setDiscountInfo(null)
        } finally {
            setDiscountLoading(false)
        }
    }, [participants, baseAmount, quantity, event.id])

    // Recalculate discounts when participants or quantity changes
    useEffect(() => {
        if (step >= 3 && participants.length > 0) {
            calculateDiscounts()
        }
    }, [participants, quantity, selectedPricing, step, calculateDiscounts])

    const handleContinueToReview = async () => {
        setError('')

        if (!validateParticipants()) {
            return
        }

        // Calculate discounts before showing review
        await calculateDiscounts()

        setStep(4)
        if (onStepChange) {
            onStepChange(4)
        }
    }

    // Function removed as it was unused
    // const areAllParticipantsValid = (): boolean => {
    //     if (participants.length !== quantity) {
    //         return false
    //     }

    //     for (let i = 0; i < participants.length; i++) {
    //         const participant = participants[i]

    //         // Check required fixed fields
    //         if (!participant.first_name?.trim() || !participant.last_name?.trim()) {
    //             return false
    //         }

    //         // Check required custom fields
    //         for (const field of formFields) {
    //             if (field.required) {
    //                 const value = participant.custom_data?.[field.name]
    //                 if (!value || value === '') {
    //                     return false
    //                 }
    //             }
    //         }
    //     }
    //     return true
    // }

    const validateParticipants = (): boolean => {
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i]

            // Check required fixed fields
            if (!participant.first_name?.trim() || !participant.last_name?.trim()) {
                setError(`Please complete all required fields for participant ${i + 1}`)
                return false
            }

            // Check required custom fields
            for (const field of formFields) {
                if (field.required) {
                    const value = participant.custom_data?.[field.name]
                    if (!value || value === '') {
                        setError(`Please complete all required fields for participant ${i + 1}`)
                        return false
                    }
                }
            }
        }
        return true
    }

    const handleCompleteBooking = async () => {
        console.log('🎯 handleCompleteBooking called')
        
        if (!user) {
            console.log('❌ No user found, redirecting to login')
            if (typeof window !== 'undefined') {
                window.location.href = `/auth/login?redirectTo=${window.location.pathname}`
            }
            return
        }

        if (!agreedToTerms) {
            console.log('❌ Terms not agreed to')
            setError('Please agree to the terms and conditions to continue')
            return
        }

        console.log('✅ Starting booking process')
        setLoading(true)
        setError('')

        try {
            if (!selectedPricing) {
                console.log('❌ No pricing selected')
                throw new Error('Please select a pricing option')
            }

            if (!validateParticipants()) {
                console.log('❌ Participants validation failed')
                setLoading(false)
                return
            }

            // Check if this is a free event
            const isFreeEvent = totalAmount === 0 || selectedPricing?.price === 0
            console.log('💰 Event pricing check:', {
                totalAmount,
                selectedPricingPrice: selectedPricing?.price,
                isFreeEvent
            })

            // If resuming a booking, always go to payment regardless of event status
            if (currentBookingId) {
                console.log('🔄 Resuming existing booking, proceeding to payment')
                
                // Update the existing booking with any changes
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({
                        quantity,
                        unit_price: selectedPricing.price,
                        total_amount: totalAmount,
                        pricing_id: selectedPricing.id && selectedPricing.id !== 'default' ? selectedPricing.id : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentBookingId)

                if (updateError) {
                    throw new Error(updateError.message)
                }

                // Update participants if needed
                // Delete existing participants and recreate them
                await supabase
                    .from('participants')
                    .delete()
                    .eq('booking_id', currentBookingId)

                for (let i = 0; i < participants.length; i++) {
                    const participant = participants[i]
                    if (participant.first_name && participant.last_name) {
                        const { error: participantError } = await supabase
                            .from('participants')
                            .insert({
                                booking_id: currentBookingId,
                                first_name: participant.first_name,
                                last_name: participant.last_name,
                                contact_email: participant.email,
                                contact_phone: participant.phone,
                                date_of_birth: participant.date_of_birth,
                                custom_data: participant.custom_data || {},
                                status: 'active'
                            })

                        if (participantError) {
                            console.error('Error updating participant:', participantError)
                        }
                    }
                }

                // Proceed to payment
                const checkoutResponse = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bookingId: currentBookingId,
                        eventId: event.id,
                        quantity: quantity,
                        amount: totalAmount,
                        eventTitle: event.title,
                        optInMarketing: optInMarketing
                    })
                })

                if (!checkoutResponse.ok) {
                    const errorData = await checkoutResponse.json()
                    throw new Error(errorData.error || 'Failed to create checkout session')
                }

                const { sessionId } = await checkoutResponse.json()

                // Redirect to Stripe checkout
                const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
                if (stripe) {
                    const { error } = await stripe.redirectToCheckout({ sessionId })
                    if (error) {
                        throw new Error(error.message)
                    }
                } else {
                    throw new Error('Failed to load Stripe')
                }

                return
            }

            // Determine whitelist flow: if event is full and whitelist enabled, create whitelisted booking
            const shouldWhitelist = isEventFull && whitelistEnabled && !isLegitimateResume

            // Create booking record with pricing information
            const bookingData: {
                event_id: string
                user_id: string
                quantity: number
                unit_price: number
                total_amount: number
                status: 'confirmed' | 'pending' | 'whitelisted'
                pricing_id?: string
            } = {
                event_id: event.id,
                user_id: user.id,
                quantity,
                unit_price: selectedPricing.price,
                total_amount: totalAmount,
                status: shouldWhitelist ? 'whitelisted' : (isFreeEvent ? 'confirmed' : 'pending')
            }
            
            // Only set pricing_id if it's not a free event and we have a valid UUID pricing ID
            if (!isFreeEvent && selectedPricing.id && selectedPricing.id !== 'default') {
                bookingData.pricing_id = selectedPricing.id
            }
            
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert(bookingData)
                .select()
                .single()

            if (bookingError) {
                throw new Error(bookingError.message)
            }

            // Create discount application records if discounts were applied
            if (discountInfo && discountInfo.appliedDiscounts && discountInfo.appliedDiscounts.length > 0) {
                for (const appliedDiscount of discountInfo.appliedDiscounts) {
                    try {
                        await supabase
                            .from('discount_applications')
                            .insert({
                                booking_id: booking.id,
                                discount_id: appliedDiscount.discount.id,
                                applied_value: appliedDiscount.amount,
                                original_amount: baseAmount,
                                final_amount: discountInfo.finalAmount
                            })
                    } catch (discountError) {
                        console.error('Error creating discount application record:', discountError)
                        // Don't fail the booking if discount tracking fails
                    }
                }
            }

            // Create participants records
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i]
                if (participant.first_name && participant.last_name) {
                    const { error: participantError } = await supabase
                        .from('participants')
                        .insert({
                            booking_id: booking.id,
                            first_name: participant.first_name,
                            last_name: participant.last_name,
                            contact_email: participant.email,
                            contact_phone: participant.phone,
                            date_of_birth: participant.date_of_birth,
                            custom_data: participant.custom_data || {},
                            status: shouldWhitelist ? 'whitelisted' : 'active'
                        })

                    if (participantError) {
                        console.error('Error creating participant:', participantError)
                    }
                }
            }

            // Handle mailing list opt-in for free events
            if (optInMarketing && user.email) {
                try {
                    const { data: existingSubscriber } = await supabase
                        .from('mailing_list')
                        .select('id')
                        .eq('email', user.email)
                        .single()

                    if (!existingSubscriber) {
                        await supabase
                            .from('mailing_list')
                            .insert({
                                email: user.email,
                                status: 'subscribed',
                                filter_event: ['all']
                            })
                    }
                } catch (error) {
                    console.error('Error handling mailing list opt-in:', error)
                }
            }

            if (shouldWhitelist) {
                // Whitelisted path: show success-like message without redirecting to payment
                setCurrentBookingId(booking.id)
                setWasCreatedAsWhitelisted(true)
                setStep(5)
                if (onStepChange) {
                    onStepChange(5)
                }
                setShouldRedirect(false)
            } else if (isFreeEvent) {
                console.log('🎉 Free event detected, setting up redirect')
                console.log('📝 Setting currentBookingId:', booking.id)
                console.log('📝 Setting step to 5')
                console.log('📝 Setting shouldRedirect to true')
                
                // For free events, redirect to success page directly
                setCurrentBookingId(booking.id)
                setStep(5)
                if (onStepChange) {
                    onStepChange(5)
                }
                setShouldRedirect(true)
                
                console.log('✅ Free event setup complete')
            } else {
                // For paid events, proceed with Stripe checkout
                const checkoutResponse = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bookingId: booking.id,
                        eventId: event.id,
                        quantity: quantity,
                        amount: totalAmount,
                        eventTitle: event.title,
                        optInMarketing: optInMarketing
                    })
                })

                if (!checkoutResponse.ok) {
                    const errorData = await checkoutResponse.json()
                    throw new Error(errorData.error || 'Failed to create checkout session')
                }

                const { sessionId } = await checkoutResponse.json()

                // Redirect to Stripe checkout
                const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
                if (stripe) {
                    const { error } = await stripe.redirectToCheckout({ sessionId })
                    if (error) {
                        throw new Error(error.message)
                    }
                } else {
                    throw new Error('Failed to load Stripe')
                }
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to complete booking')
        } finally {
            setLoading(false)
        }
    }

    // Skip entry close date check when resuming a booking
    if (!isResumeFlowActive && event.entry_close_date && new Date(event.entry_close_date) < new Date()) {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">Entries for this event are now closed (entry close date has passed).</p>
            </div>
        )
    }
    // Skip sold out check when resuming a booking
    if (!isResumeFlowActive && event.max_attendees != null && event.current_attendees >= event.max_attendees) {
        if (!whitelistEnabled) {
            return (
                <div className="text-center py-12">
                    <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">This event is sold out.</p>
                </div>
            )
        }
        // If whitelist enabled, allow booking UI to proceed as whitelist
    }
    // Skip event status check when resuming a booking
    if (!isResumeFlowActive && event.status !== 'published') {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">This event is not open for booking.</p>
            </div>
        )
    }

    // Skip quantity check when resuming a booking
    if (!isResumeFlowActive && maxQuantity <= 0 && !whitelistEnabled) {
        return (
            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">This event is sold out.</p>
            </div>
        )
    }

    if (pricingLoading) {
        return (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading pricing options...</p>
            </div>
        )
    }

    // Note: We no longer need this check since we create a free pricing option when none exist
    // if (availablePricing.length === 0) {
    //     return (
    //         <div className="text-center">
    //             <p className="text-gray-600">No pricing options available at this time.</p>
    //         </div>
    //     )
    // }

    const content = (
        <div className="space-y-6 text-gray-900 dark:text-gray-100">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 1 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        1
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Book</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 2 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        2
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Contact</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 3 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        3
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Participants</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 4 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 4 ? (shouldWhitelist && !isLegitimateResume ? 'border-amber-600 bg-amber-600 text-white' : 'border-indigo-600 bg-indigo-600 text-white') : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        4
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {shouldWhitelist && !isLegitimateResume ? 'Whitelisted' : (totalAmount === 0 || selectedPricing?.price === 0) ? 'Review' : 'Payment'}
                    </span>
                </div>

            </div>

            {/* Booking in Progress Warning */}
            {step === 5 && currentBookingId && currentBookingId.trim() !== '' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-blue-400">⚠️</span>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                                Booking in Progress
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>
                                    Your booking is being processed. Please don&apos;t close this page or navigate away.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 1: Pricing & Quantity */}
            {step === 1 && (
                <Step1Pricing
                    availablePricing={availablePricing}
                    selectedPricing={selectedPricing}
                    setSelectedPricing={setSelectedPricing}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    maxQuantity={maxQuantity}
                    totalAmount={totalAmount}
                    onContinue={handleContinueToContact}
                    loading={loading}
                    error={error}
                    hasDiscounts={hasDiscounts}
                />
            )}

            {/* Step 2: Contact Information */}
            {step === 2 && (
                <Step2Contact
                    contactInfo={contactInfo}
                    setContactInfo={setContactInfo}
                    onContinue={handleContinueToParticipants}
                    onBack={() => {
                        setStep(1)
                        if (onStepChange) {
                            onStepChange(1)
                        }
                    }}
                    loading={loading}
                    error={error}
                />
            )}

            {/* Step 3: Participant Information */}
            {step === 3 && (
                <Step3Participants
                    quantity={quantity}
                    participants={participants}
                    setParticipants={setParticipants}
                    formFields={formFields}
                    onComplete={handleContinueToReview}
                    onBack={() => {
                        setStep(2)
                        if (onStepChange) {
                            onStepChange(2)
                        }
                    }}
                    loading={loading}
                    error={error}
                    userId={user?.id}
                />
            )}

            {/* Step 4: Review & Terms */}
            {step === 4 && (
                <Step4Review
                    event={event}
                    selectedPricing={selectedPricing}
                    quantity={quantity}
                    totalAmount={totalAmount}
                    baseAmount={baseAmount}
                    processingFee={processingFee}
                    discountInfo={discountInfo}
                    discountLoading={discountLoading}
                    contactInfo={contactInfo}
                    participants={participants}
                    formFields={formFields}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    optInMarketing={optInMarketing}
                    setOptInMarketing={setOptInMarketing}
                    onComplete={handleCompleteBooking}
                    onBack={() => {
                        setStep(3)
                        if (onStepChange) {
                            onStepChange(3)
                        }
                    }}
                    loading={loading}
                    error={error}
                    isResuming={isLegitimateResume}
                />
            )}

            {/* Step 5: Processing Payment or Success */}
            {step === 5 && (
                <div className="space-y-6">
                    {wasCreatedAsWhitelisted ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <div className="h-6 w-6 rounded-full bg-amber-600" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-amber-800">
                                        Whitelisted Registration Submitted
                                    </h3>
                                    <div className="mt-2 text-sm text-amber-700">
                                        <p>Your details have been captured on the whitelist. The organizer will release your spot when available. You will receive an email and can complete payment from your dashboard at that time.</p>
                                        <p className="mt-2">Booking ID: {currentBookingId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (totalAmount === 0 || selectedPricing?.price === 0) ? (
                        // Free event success
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <HiCheck className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">
                                        Booking Confirmed!
                                    </h3>
                                    <div className="mt-2 text-sm text-green-700">
                                        <p>Your free event booking has been successfully confirmed. You will receive a confirmation email shortly.</p>
                                        <p className="mt-2">Booking ID: {currentBookingId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Paid event processing
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        Processing Payment
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <p>Your booking has been created. Redirecting you to the payment page...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    return content
}