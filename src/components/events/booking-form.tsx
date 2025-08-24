'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile, EventPricing, Participant, FormField, EventSection, SectionPricing } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'
import Step0Sections from './booking-steps/step-0-sections'
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
    onUserInteraction?: () => void // Callback for when user starts interacting with the form
    initialStep?: string
    resumeBookingId?: string
    hasUserInteracted?: boolean // Receive context's hasUserInteracted state
}

// Function removed as it was unused
// function isBookable(event: Event) {
//     const now = new Date()
//     if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
//     return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
// }

export default function BookingForm({ event, user, onStepChange, onUserInteraction, initialStep, resumeBookingId, hasUserInteracted: contextHasUserInteracted }: BookingFormProps) {
    const searchParams = useSearchParams()
    const [step, setStep] = useState(0) // 0: Start Booking (single events) or Section Selection (multi-section), 1: Pricing & Quantity, 2: Contact Info, 3: Participant Info, 4: Review, 5: Checkout
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [availablePricing, setAvailablePricing] = useState<EventPricing[]>([])
    const [selectedPricing, setSelectedPricing] = useState<EventPricing | null>(null)
    const [pricingLoading, setPricingLoading] = useState(true)
    const [contactInfo, setContactInfo] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: ''
    })
    const [participants, setParticipants] = useState<Partial<Participant & { email?: string; phone?: string }>[]>([])
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
    const [isLegitimateResume, setIsLegitimateResume] = useState(false)
    const [originalBookingAmount, setOriginalBookingAmount] = useState<number | null>(null)
    const [wasCreatedAsWhitelisted, setWasCreatedAsWhitelisted] = useState(false)
    const [wasCreatedAsConditionalFree, setWasCreatedAsConditionalFree] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [optInMarketing, setOptInMarketing] = useState(false)
    const [shouldRedirect, setShouldRedirect] = useState(false)
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Multi-section booking state
    const [selectedSections, setSelectedSections] = useState<Array<{
        sectionId: string
        section: EventSection
        pricingId: string
        pricing: SectionPricing
        quantity: number
    }>>([])



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
    const [hasDiscountCodes, setHasDiscountCodes] = useState(false)
    const [appliedDiscountCode, setAppliedDiscountCode] = useState<{
        discount: {
            id: string
            name: string
            description?: string
            value_type: string
            value: number
        }
        discountAmount: number
        finalAmount: number
    } | null>(null)
    const [localHasUserInteracted, setLocalHasUserInteracted] = useState(false)
    
    // Use context's hasUserInteracted if provided, otherwise use local state
    const hasUserInteracted = contextHasUserInteracted ?? localHasUserInteracted
    


    const supabase = createClient()
    
    // Use booking journey context
    const { setIsInBookingJourney, setBookingStep } = useBookingJourney()

    // Handle user interaction
    const handleUserInteraction = useCallback(() => {
        if (!hasUserInteracted) {
            setLocalHasUserInteracted(true)
            onUserInteraction?.()
        }
    }, [hasUserInteracted, onUserInteraction])

    // Wrapper functions to track user interaction
    const handlePricingSelection = useCallback((pricing: EventPricing | null) => {
        handleUserInteraction()
        setSelectedPricing(pricing)
    }, [handleUserInteraction])

    const handleSectionSelection = useCallback((sections: Array<{
        sectionId: string
        section: EventSection
        pricingId: string
        pricing: SectionPricing
        quantity: number
    }>) => {
        handleUserInteraction()
        setSelectedSections(sections)
    }, [handleUserInteraction])

    const handleQuantityChange = useCallback((newQuantity: number) => {
        handleUserInteraction()
        setQuantity(newQuantity)
    }, [handleUserInteraction])

    const handleContactInfoChange = useCallback((newContactInfo: typeof contactInfo) => {
        handleUserInteraction()
        setContactInfo(newContactInfo)
    }, [handleUserInteraction])

    // Determine if this is a multi-section event
    const isMultiSectionEvent = event.has_sections && event.sections && event.sections.length > 0
    

    
    // Calculate total amount based on event type
    const baseAmount = isMultiSectionEvent 
        ? selectedSections.reduce((sum, selection) => sum + (selection.pricing.price * selection.quantity), 0)
        : (selectedPricing ? selectedPricing.price * quantity : 0)
    
    // If we're resuming a booking that can't be resumed but has pricing info, use that for display
    const displayAmount = originalBookingAmount !== null && baseAmount === 0 
        ? originalBookingAmount 
        : baseAmount
    
    const totalAmount = appliedDiscountCode?.finalAmount ?? discountInfo?.finalAmount ?? displayAmount
    

    
    // For multi-section events, check if selected sections have pricing
    const isFreeEvent = isMultiSectionEvent 
        ? (selectedSections.length === 0 || selectedSections.every(selection => selection.pricing.price === 0))
        : (displayAmount === 0 || selectedPricing?.price === 0)
    
    // Check if this is a conditional free entry (requires approval)
    const isConditionalFreeEntry = isMultiSectionEvent
        ? selectedSections.some(selection => selection.pricing.pricing_type === 'conditional_free')
        : (selectedPricing?.pricing_type === 'conditional_free')
    
    // Processing fee estimation for display (final fee calculated server-side)
    const processingFee = totalAmount > 0 ? totalAmount * 0.017 + 0.30 : 0
    
    // For multi-section events, check availability and whitelist status
    const getSectionStatus = (section: EventSection) => {
        const availableSeats = section.available_seats ?? 0
        const isFull = availableSeats <= 0  // Use same logic as Step 0
        const whitelistEnabled = section.whitelist_enabled || false
        const shouldWhitelist = isFull && whitelistEnabled
        return { isFull, whitelistEnabled, shouldWhitelist, availableSeats }
    }

    const isEventFull = isMultiSectionEvent
        ? (() => {
            // If sections are selected, check if those specific sections are full
            if (selectedSections.length > 0) {
                return selectedSections.every(selection => {
                    const section = event.sections?.find(s => s.id === selection.sectionId)
                    return section && (section.available_seats ?? 0) <= 0
                })
            }
            // If no sections selected yet, check if ALL sections are full
            return event.sections?.every(section => (section.available_seats ?? 0) <= 0) ?? false
        })()
        : (event.max_attendees != null && event.current_attendees >= event.max_attendees)
    
    const whitelistEnabled = Boolean(event.settings?.whitelist_enabled)
    // Treat any active resume context as bypass for whitelist/sold-out checks
    const isResumeFlowActive = isLegitimateResume || Boolean(currentBookingId) || Boolean(resumeBookingId)
    
    // Determine if booking should be whitelisted based on section-level or event-level logic
    const shouldWhitelist = (() => {
        if (isResumeFlowActive) {
            return false // Don't whitelist if resuming a booking
        }
        
        if (isMultiSectionEvent) {
            // For multi-section events, check if any selected section requires whitelist
            if (selectedSections.length > 0) {
                const result = selectedSections.some(selection => {
                    const section = event.sections?.find(s => s.id === selection.sectionId)
                    const sectionStatus = section ? getSectionStatus(section) : null

                    return section && sectionStatus?.shouldWhitelist
                })

                return result
            }
            // If no sections selected yet, check if all sections are full and any have whitelist enabled
            const allSectionsFull = event.sections?.every(section => (section.available_seats ?? 0) <= 0) ?? false
            const hasWhitelistSections = event.sections?.some(section => {
                const availableSeats = section.available_seats ?? 0
                const isFull = availableSeats <= 0
                const whitelistEnabled = section.whitelist_enabled || false
                return isFull && whitelistEnabled
            }) ?? false
            return allSectionsFull && hasWhitelistSections
        } else {
            // For single events, use the existing logic
            return isEventFull && whitelistEnabled
        }
    })()

    // Note: Mixed bookings are not allowed - users must select either all whitelist sections or all available sections
    // This is enforced in the UI by disabling incompatible sections in the section selection component
    
    // For multi-section events, calculate max quantity based on selected sections' availability
    const maxQuantity = isMultiSectionEvent
        ? (() => {
            if (selectedSections.length === 0) {
                // If no sections selected, return 0 to prevent booking
                return 0
            }
            // Calculate total available seats across all selected sections
            const totalAvailableSeats = selectedSections.reduce((sum, selection) => {
                const section = event.sections?.find(s => s.id === selection.sectionId)
                return sum + (section?.available_seats ?? 0)
            }, 0)
            return Math.min(10, Math.max(0, totalAvailableSeats))
        })()
        : (event.max_attendees
            ? Math.min(10, Math.max(0, event.max_attendees - event.current_attendees))
            : 10)

    // Fetch available pricing options and form fields
    useEffect(() => {

        const fetchData = async () => {
            try {

                setPricingLoading(true)

                // Fetch pricing options with timeout
                const membershipType = user?.membership_type || 'non_member'

                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const pricingResponse = await fetch(`/api/public/events/${event.id}/pricing?membership_type=${membershipType}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                
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
                    // Don't auto-select even default pricing - let user choose explicitly
                    setSelectedPricing(null)
                } else {
                    setAvailablePricing(pricing)
                    // Don't auto-select pricing - let user choose explicitly
                    setSelectedPricing(null)
                }

                // Set form fields from event
                setFormFields(event.custom_form_fields || [])

                // Check if event has discounts
                const { data: discounts } = await supabase
                    .from('event_discounts')
                    .select('id, discount_type')
                    .eq('event_id', event.id)
                    .eq('is_active', true)
                
                const hasAnyDiscounts = Boolean(discounts && discounts.length > 0)
                const hasCodeDiscounts = Boolean(discounts && discounts.some(d => d.discount_type === 'code'))
                const hasOtherDiscounts = Boolean(discounts && discounts.some(d => d.discount_type !== 'code'))
                
                setHasDiscounts(hasOtherDiscounts)
                setHasDiscountCodes(hasCodeDiscounts)

            } catch (err: unknown) {
                console.error('Error fetching data:', err)
                if (err instanceof Error && err.name === 'AbortError') {
                    setError('Pricing fetch timed out. Please refresh the page.')
                } else {
                    setError((err as Error).message || 'Failed to load event data')
                }
            } finally {
                setPricingLoading(false)
            }
        }

        fetchData()
    }, [event.id, user?.membership_type, event.custom_form_fields, event.max_attendees, event.price, supabase])

    // Notify parent component when step changes
    useEffect(() => {
        // Don't call onStepChange when step is 0 and user has interacted
        // This prevents overriding the context state when user clicks "Start Booking"
        if (step > 0 || !hasUserInteracted) {
            onStepChange?.(step)
        }
    }, [step, onStepChange, hasUserInteracted])

    // Update booking journey context when step changes
    useEffect(() => {
        setIsInBookingJourney(step > 1)
        // Don't override the context bookingStep - let the context manage the layout state
        // The BookingForm should only manage its internal step state
    }, [step, setIsInBookingJourney])

    // Sync BookingForm step with context bookingStep when user has interacted
    useEffect(() => {
        if (hasUserInteracted && step === 0 && !isMultiSectionEvent) {
            setStep(1)
        }
    }, [hasUserInteracted, step, isMultiSectionEvent])

    // Don't auto-select pricing - let user choose explicitly
    // useEffect(() => {
    //     if (availablePricing.length > 0 && !selectedPricing) {
    //         setSelectedPricing(availablePricing[0])
    //     }
    // }, [availablePricing, selectedPricing, step])

    // Auto-advance to step 1 for single events when pricing loads
    useEffect(() => {
        if (!pricingLoading && !isMultiSectionEvent && step === 0 && hasUserInteracted) {
            setStep(1)
        }
    }, [pricingLoading, isMultiSectionEvent, step, hasUserInteracted])

    // Reset redirect state when step changes
    useEffect(() => {
        if (step !== 5) {
            setShouldRedirect(false)
        }
    }, [step])

    // Set initial step based on event type (only on mount)
    useEffect(() => {
        if (isMultiSectionEvent && step === 1 && !initialStep && !resumeBookingId) {
            setStep(0) // Start with section selection for multi-section events
        }
    }, [isMultiSectionEvent]) // Remove step from dependencies to prevent infinite loop

    // Handle resuming from URL parameters or props
    useEffect(() => {
        const urlStep = searchParams?.get('step') || initialStep
        const urlResumeBookingId = searchParams?.get('resume') || resumeBookingId
        

        
        // Only proceed if we have both step and resume booking ID
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
                
                
                // Always load section data if available, regardless of canResume status
                if (data.booking.section_bookings && data.booking.section_bookings.length > 0) {
                    const sectionSelections = data.booking.section_bookings.map((sb: {
                        section_id: string
                        section: EventSection
                        pricing_id: string
                        pricing: SectionPricing
                        quantity: number
                    }) => ({
                        sectionId: sb.section_id,
                        section: sb.section,
                        pricingId: sb.pricing_id,
                        pricing: sb.pricing,
                        quantity: sb.quantity
                    }))
                    setSelectedSections(sectionSelections)
                }
                
                // Always load participant data if available, regardless of canResume status
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
                
                if (data.canResume) {
                    // Set the existing booking ID and mark as legitimate resume
                    setCurrentBookingId(bookingId)
                    setIsLegitimateResume(true)
                    
                    // Set form fields
                    if (data.booking.formFields) {
                        setFormFields(data.booking.formFields)
                    }
                    
                    console.log('✅ Resumed booking data loaded:', data.booking)
                } else {
                    console.log('❌ Cannot resume booking:', data)
                    
                    // For display purposes, load the total amount from the booking
                    // This helps show the correct pricing even when the booking can't be resumed
                    if (data.booking.totalAmount && data.booking.totalAmount > 0) {
    
                        setOriginalBookingAmount(data.booking.totalAmount)
                        // Set resume flag for display purposes even if booking can't be resumed
                        setIsLegitimateResume(true)
                    }
                }
            } else {
                console.log('❌ API response not ok:', response.status)
            }
        } catch (error) {
            console.error('Error loading resumed booking data:', error)
            setError('Failed to load booking data')
        }
    }

    // Handle redirect for free events
    useEffect(() => {
        // For multi-section events, check if selected sections have pricing
        const isFreeEvent = isMultiSectionEvent 
            ? (selectedSections.length === 0 || selectedSections.every(selection => selection.pricing.price === 0))
            : (totalAmount === 0 || selectedPricing?.price === 0)



        if (shouldRedirect && currentBookingId && isFreeEvent) {
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
                isFreeEvent
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

        // Require user to explicitly select a pricing option
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
                middle_name: '',
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
                    middle_name: contactInfo.middle_name,
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
                    quantity,
                    discountCode: appliedDiscountCode?.discount?.id ? null : null // We'll handle discount codes separately for now
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
    }, [participants, baseAmount, quantity, event.id, appliedDiscountCode])

    // Handle discount code application
    const handleDiscountCodeApplied = (discountInfo: {
        discount: {
            id: string
            name: string
            description?: string
            value_type: string
            value: number
        }
        discountAmount: number
        finalAmount: number
    } | null) => {
        setAppliedDiscountCode(discountInfo)
    }

    // Handle discount code removal
    const handleDiscountCodeRemoved = () => {
        setAppliedDiscountCode(null)
    }

    // Recalculate discounts when participants or quantity changes
    useEffect(() => {
        if (step >= 3 && participants.length > 0) {
            calculateDiscounts()
        }
    }, [participants, quantity, selectedPricing, step, calculateDiscounts])

    const handleContinueToReview = async () => {
        setError('')

        if (!(await validateParticipants())) {
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

    const validateParticipants = async (): Promise<boolean> => {
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

        // Validate all participants (ban check + duplicate check)
        try {
            const response = await fetch('/api/bookings/validate-participants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId: event.id,
                    participants: participants
                })
            })

            if (response.ok) {
                const { valid, errors } = await response.json()
                if (!valid && errors && errors.length > 0) {
                    // Show the first error found
                    setError(errors[0].error)
                    return false
                }
            }
        } catch (error) {
            console.error('Error validating participants:', error)
            // Continue with booking if validation check fails
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

            if (!(await validateParticipants())) {
                console.log('❌ Participants validation failed')
                setLoading(false)
                return
            }

            // Check if this is a free event
        
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

                // Calculate quantity for multi-section events
                const checkoutQuantity = isMultiSectionEvent 
                    ? (selectedSections.length > 0 
                        ? selectedSections.reduce((sum, selection) => sum + selection.quantity, 0) 
                        : 0) // If no sections selected, quantity should be 0
                    : quantity
                
                // Validate that we have selected sections for multi-section events
                if (isMultiSectionEvent && selectedSections.length === 0) {
                    throw new Error('No sections selected for multi-section event')
                }

                // Check if this is now a free event (due to discount codes)
                if (totalAmount === 0) {
                    console.log('🎉 Free event (possibly due to discount code), confirming booking directly')
                    
                    // Update booking status to confirmed for free events
                    const { error: confirmError } = await supabase
                        .from('bookings')
                        .update({ 
                            status: 'confirmed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', currentBookingId)

                    if (confirmError) {
                        throw new Error(confirmError.message)
                    }

                    // Set current booking ID and proceed to success
                    setCurrentBookingId(currentBookingId)
                    setStep(5)
                    if (onStepChange) {
                        onStepChange(5)
                    }
                    return
                }

                // Prepare request body
                const requestBody = {
                    bookingId: currentBookingId,
                    eventId: event.id,
                    quantity: checkoutQuantity,
                    amount: totalAmount,
                    eventTitle: isMultiSectionEvent 
                        ? `${event.title} - ${selectedSections.map(selection => `${selection.section.title} (${selection.quantity})`).join(', ')}`
                        : event.title,
                    optInMarketing: optInMarketing,
                    isMultiSectionEvent: isMultiSectionEvent
                }
                

                
                // Proceed to payment
                const checkoutResponse = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
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

            // Use the existing shouldWhitelist logic that's already calculated above

            // Create booking record
            const bookingData: {
                event_id: string
                user_id: string
                quantity: number
                unit_price: number
                total_amount: number
                status: 'confirmed' | 'pending' | 'whitelisted' | 'pending_approval'
                pricing_id?: string
                is_multi_section?: boolean
            } = {
                event_id: event.id,
                user_id: user.id,
                quantity: isMultiSectionEvent ? selectedSections.reduce((sum, selection) => sum + selection.quantity, 0) : quantity,
                unit_price: isMultiSectionEvent ? 0 : selectedPricing.price, // Will be calculated from sections
                total_amount: totalAmount,
                status: shouldWhitelist ? 'whitelisted' : (isConditionalFreeEntry ? 'pending_approval' : (isFreeEvent ? 'confirmed' : 'pending')),
                is_multi_section: isMultiSectionEvent
            }
            
            // Only set pricing_id for single events if it's not a free event and we have a valid UUID pricing ID
            if (!isMultiSectionEvent && !isFreeEvent && selectedPricing.id && selectedPricing.id !== 'default') {
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

            // For multi-section events, create section booking records
            if (isMultiSectionEvent && selectedSections.length > 0) {
        
                
                for (const selection of selectedSections) {
                    try {
                        const section = event.sections?.find(s => s.id === selection.sectionId)
                        const sectionStatus = section ? getSectionStatus(section) : null
                        const isWhitelistSection = sectionStatus?.shouldWhitelist || false
                        

                        
                        const { data: sectionBookingData, error: sectionBookingError } = await supabase
                            .from('section_bookings')
                            .insert({
                                booking_id: booking.id,
                                section_id: selection.sectionId,
                                pricing_id: selection.pricingId,
                                quantity: selection.quantity,
                                unit_price: selection.pricing.price,
                                total_amount: selection.pricing.price * selection.quantity,
                                status: isWhitelistSection ? 'whitelisted' : 'pending',
                                is_whitelisted: isWhitelistSection,
                                whitelisted_at: isWhitelistSection ? new Date().toISOString() : null,
                                whitelist_reason: isWhitelistSection ? 'Section is full and whitelist is enabled' : null
                            })
                            .select()
                        
                        if (sectionBookingError) {
                            console.error('❌ [BOOKING-FORM] Error creating section booking:', sectionBookingError)
                            throw new Error(`Failed to create section booking: ${sectionBookingError.message}`)
                        }
                        
                        console.log('✅ [BOOKING-FORM] Section booking created successfully:', sectionBookingData)
                    } catch (sectionBookingError) {
                        console.error('❌ [BOOKING-FORM] Error creating section booking:', sectionBookingError)
                        throw new Error('Failed to create section booking')
                    }
                }
            } else {

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

            // Create discount code application record if discount code was applied
            if (appliedDiscountCode) {
                try {
                    await supabase
                        .from('discount_applications')
                        .insert({
                            booking_id: booking.id,
                            discount_id: appliedDiscountCode.discount.id,
                            applied_value: appliedDiscountCode.discountAmount,
                            original_amount: baseAmount,
                            final_amount: appliedDiscountCode.finalAmount
                        })
                } catch (discountError) {
                    console.error('Error creating discount code application record:', discountError)
                    // Don't fail the booking if discount tracking fails
                }
            }

            // Create participants records
            
            const participantCreationErrors: string[] = []
            let successfulParticipants = 0
            
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i]

                
                if (participant.first_name && participant.last_name) {
                    console.log('✅ [BOOKING-FORM] Participant', i + 1, 'meets criteria, proceeding with creation')
                    // For multi-section events, assign participants to sections automatically
                    let sectionId = null
                    if (isMultiSectionEvent && selectedSections.length > 0) {
                        // Logic to automatically assign participants to sections based on selectedSections quantities
                        // This will distribute participants across sections as per the quantities selected in step 0
                        let assignedCount = 0
                        for (const sectionSelection of selectedSections) {
                            if (i >= assignedCount && i < assignedCount + sectionSelection.quantity) {
                                sectionId = sectionSelection.sectionId
                                break
                            }
                            assignedCount += sectionSelection.quantity
                        }
                    }
                    


                    const { data: createdParticipant, error: participantError } = await supabase
                        .from('participants')
                        .insert({
                            booking_id: booking.id,
                            first_name: participant.first_name,
                            last_name: participant.last_name,
                            contact_email: participant.email,
                            contact_phone: participant.phone,
                            date_of_birth: participant.date_of_birth,
                            gender: participant.gender,
                            custom_data: participant.custom_data || {},
                            section_id: sectionId,
                            status: shouldWhitelist ? 'whitelisted' : (isConditionalFreeEntry ? 'pending_approval' : 'active')
                        })
                        .select()
                        .single()

                    if (participantError) {
                        console.error('❌ [BOOKING-FORM] Error creating participant:', participantError)
                        participantCreationErrors.push(`Participant ${i + 1}: ${participantError.message}`)
                    } else {
                        console.log('✅ [BOOKING-FORM] Successfully created participant:', createdParticipant?.id)
                        successfulParticipants++
                        
                        // Section assignment is already handled via section_id field in participants table
                        if (isMultiSectionEvent && createdParticipant && sectionId) {
                            console.log('✅ [BOOKING-FORM] Participant assigned to section:', sectionId)
                        }
                    }
                } else {
                    console.log('❌ [BOOKING-FORM] Participant', i + 1, 'does not meet criteria:', {
                        first_name: participant.first_name,
                        last_name: participant.last_name,
                        missing_first_name: !participant.first_name,
                        missing_last_name: !participant.last_name
                    })
                    participantCreationErrors.push(`Participant ${i + 1}: Missing first_name or last_name`)
                }
            }
            
            // Check if we had any participant creation errors
            if (participantCreationErrors.length > 0) {
                console.error('❌ [BOOKING-FORM] Participant creation failed with errors:', participantCreationErrors)
                console.error('❌ [BOOKING-FORM] Successful participants:', successfulParticipants, 'out of', participants.length)
                setError(`Failed to create participants: ${participantCreationErrors.join(', ')}`)
                setLoading(false)
                return
            }
            
            console.log('✅ [BOOKING-FORM] All participants created successfully:', successfulParticipants, 'participants')

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
                
                // Send whitelisted booking email
                try {
                    const emailResponse = await fetch('/api/bookings/send-whitelisted-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ bookingId: booking.id })
                    })
                    
                    if (emailResponse.ok) {
                        console.log('✅ [BOOKING-FORM] Whitelisted booking email sent successfully')
                    } else {
                        console.error('❌ [BOOKING-FORM] Failed to send whitelisted booking email')
                    }
                } catch (emailError) {
                    console.error('❌ [BOOKING-FORM] Error sending whitelisted booking email:', emailError)
                }
            } else if (isConditionalFreeEntry) {
                // Conditional free entry path: show pending approval message
                setCurrentBookingId(booking.id)
                setWasCreatedAsConditionalFree(true)
                setStep(5)
                if (onStepChange) {
                    onStepChange(5)
                }
                setShouldRedirect(false)
                
                console.log('✅ [BOOKING-FORM] Conditional free entry booking created, awaiting approval')

                // Send notification email to organizer
                try {
                    const notificationResponse = await fetch('/api/email/conditional-free-request-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            bookingId: booking.id
                        })
                    })

                    if (notificationResponse.ok) {
                        console.log('✅ [BOOKING-FORM] Conditional free request notification sent to organizer')
                    } else {
                        console.error('❌ [BOOKING-FORM] Failed to send conditional free request notification')
                    }
                } catch (notificationError) {
                    console.error('❌ [BOOKING-FORM] Error sending conditional free request notification:', notificationError)
                }
            } else if (isFreeEvent || totalAmount === 0) {
                console.log('🎉 Free event detected (original or due to discount code), setting up redirect')
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
                        quantity: isMultiSectionEvent ? selectedSections.reduce((sum, selection) => sum + selection.quantity, 0) : quantity,
                        amount: totalAmount,
                        eventTitle: event.title,
                        optInMarketing: optInMarketing,
                        isMultiSectionEvent: isMultiSectionEvent,
                        selectedSections: isMultiSectionEvent ? selectedSections : undefined
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
                <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">Entries closed.</p>
            </div>
        )
    }
    // Skip sold out check when resuming a booking
    if (!isResumeFlowActive) {
        if (isMultiSectionEvent) {
            // For multi-section events, check if any sections have whitelist enabled
            const hasWhitelistSections = event.sections?.some(section => {
                const availableSeats = section.available_seats ?? 0
                const isFull = availableSeats <= 0  // Use same logic as getSectionStatus
                const whitelistEnabled = section.whitelist_enabled || false
                return isFull && whitelistEnabled
            }) ?? false

            // If all sections are full and none have whitelist enabled, show sold out
            const allSectionsFull = event.sections?.every(section => (section.available_seats ?? 0) <= 0) ?? false
            if (allSectionsFull && !hasWhitelistSections) {
                return (
                    <div className="text-center py-12">
                        <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">This event is sold out.</p>
                    </div>
                )
            }
        } else {
            // For single events, use the existing logic
            if (event.max_attendees != null && event.current_attendees >= event.max_attendees) {
                if (!whitelistEnabled) {
                    return (
                        <div className="text-center py-12">
                            <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">This event is sold out.</p>
                        </div>
                    )
                }
                // If whitelist enabled, allow booking UI to proceed as whitelist
            }
        }
    }
    // Skip event status check when resuming a booking
    if (!isResumeFlowActive && event.status !== 'published') {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold">This event is not open for booking.</p>
            </div>
        )
    }

    // Skip quantity check when resuming a booking or when on step 0 for multi-section events
    if (!isResumeFlowActive && maxQuantity <= 0) {
        if (isMultiSectionEvent) {
            // For multi-section events, check if any sections have whitelist enabled
            const hasWhitelistSections = event.sections?.some(section => {
                const availableSeats = section.available_seats ?? 0
                const isFull = availableSeats <= 0  // Use same logic as getSectionStatus
                const whitelistEnabled = section.whitelist_enabled || false
                return isFull && whitelistEnabled
            }) ?? false

            // Only show sold out if no whitelist sections are available and we're not on step 0
            if (!hasWhitelistSections && step !== 0) {
                return (
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">This event is sold out.</p>
                    </div>
                )
            }
        } else {
            // For single events, use the existing logic
            if (!whitelistEnabled) {
                return (
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">This event is sold out.</p>
                    </div>
                )
            }
        }
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


            {/* Progress Steps - Only show when booking has started */}
            {step > 0 && (
                <div className="flex items-center justify-between mb-8">
                {/* Step 0: Sections (only for multi-section events) */}
                {isMultiSectionEvent && (
                    <>
                        <div className={`flex flex-col md:flex-row md:items-center ${step >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 0 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                1
                            </div>
                            <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Sections</span>
                        </div>
                        <div className={`w-3 md:w-6 h-0.5 ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    </>
                )}

                {/* Step 1: Pricing & Quantity (or Contact for multi-section) */}
                <div className={`flex flex-col md:flex-row md:items-center ${step >= (isMultiSectionEvent ? 1 : 1) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= (isMultiSectionEvent ? 1 : 1) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {isMultiSectionEvent ? 2 : 1}
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {isMultiSectionEvent ? 'Contact' : 'Book'}
                    </span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= (isMultiSectionEvent ? 2 : 2) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                {/* Step 2: Contact (or Participants for multi-section) */}
                <div className={`flex flex-col md:flex-row md:items-center ${step >= (isMultiSectionEvent ? 2 : 2) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= (isMultiSectionEvent ? 2 : 2) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {isMultiSectionEvent ? 3 : 2}
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {isMultiSectionEvent ? 'Participants' : 'Contact'}
                    </span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= (isMultiSectionEvent ? 3 : 3) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                {/* Step 3: Participants (or Review for multi-section) */}
                <div className={`flex flex-col md:flex-row md:items-center ${step >= (isMultiSectionEvent ? 3 : 3) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= (isMultiSectionEvent ? 3 : 3) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {isMultiSectionEvent ? 4 : 3}
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {isMultiSectionEvent ? 'Review' : 'Participants'}
                    </span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= (isMultiSectionEvent ? 4 : 4) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                {/* Step 4: Review & Payment */}
                <div className={`flex flex-col md:flex-row md:items-center ${step >= (isMultiSectionEvent ? 4 : 4) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= (isMultiSectionEvent ? 4 : 4) ? (shouldWhitelist ? 'border-amber-600 bg-amber-600 text-white' : 'border-indigo-600 bg-indigo-600 text-white') : 'border-gray-300 dark:border-gray-600'}`}>
                        {isMultiSectionEvent ? 5 : 4}
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {shouldWhitelist ? 'Whitelisted' : isFreeEvent ? 'Review' : 'Payment'}
                    </span>
                </div>
            </div>
            )}

            {/* Booking in Progress Warning */}
            {step === 5 && currentBookingId && currentBookingId.trim() !== '' &&  !whitelistEnabled &&(
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

            {/* Step 0: Section Selection (multi-section events only) */}
            {step === 0 && isMultiSectionEvent && (
                <Step0Sections
                    sections={event.sections || []}
                    selectedSections={selectedSections}
                    setSelectedSections={handleSectionSelection}
                    onContinue={() => {
                        setStep(1)
                        if (onStepChange) {
                            onStepChange(1)
                        }
                    }}
                    loading={loading}
                    error={error}
                />
            )}

            {/* Step 1: Pricing & Quantity (single events) or Contact (multi-section events) */}
            {step === 1 && !isMultiSectionEvent && (
                <Step1Pricing
                    availablePricing={availablePricing}
                    selectedPricing={selectedPricing}
                    setSelectedPricing={handlePricingSelection}
                    quantity={quantity}
                    setQuantity={handleQuantityChange}
                    maxQuantity={maxQuantity}
                    totalAmount={totalAmount}
                    onContinue={handleContinueToContact}
                    loading={loading}
                    error={error}
                    hasDiscounts={hasDiscounts}
                    hasDiscountCodes={hasDiscountCodes}
                    eventId={event.id}
                    baseAmount={baseAmount}
                    onDiscountCodeApplied={handleDiscountCodeApplied}
                    onDiscountCodeRemoved={handleDiscountCodeRemoved}
                    appliedDiscountCode={appliedDiscountCode}
                />
            )}

            {/* Step 1: Contact Information (multi-section events) */}
            {step === 1 && isMultiSectionEvent && (
                <Step2Contact
                    contactInfo={contactInfo}
                    setContactInfo={handleContactInfoChange}
                    onContinue={() => {
                        // Pre-fill contact info with user data if available
                        if (user) {
                            const userFullName = user.full_name || ''
                            const nameParts = userFullName.split(' ')
                            const firstName = nameParts[0] || ''
                            const lastName = nameParts.slice(1).join(' ') || ''

                            setContactInfo({
                                first_name: firstName,
                                middle_name: '',
                                last_name: lastName,
                                email: user.email || '',
                                phone: user.phone || ''
                            })
                        }

                        // Calculate quantity based on selected sections
                        const totalQuantity = selectedSections.reduce((sum, selection) => sum + selection.quantity, 0)
                        setQuantity(totalQuantity)

                        setStep(2)
                        if (onStepChange) {
                            onStepChange(2)
                        }
                    }}
                    onBack={() => {
                        setStep(0)
                        if (onStepChange) {
                            onStepChange(0)
                        }
                    }}
                    loading={loading}
                    error={error}
                />
            )}

            {/* Step 2: Contact Information (single events) or Participants (multi-section events) */}
            {step === 2 && !isMultiSectionEvent && (
                <Step2Contact
                    contactInfo={contactInfo}
                    setContactInfo={handleContactInfoChange}
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

            {/* Step 2: Participant Information (multi-section events) */}
            {step === 2 && isMultiSectionEvent && (
                <Step3Participants
                    quantity={quantity}
                    participants={participants}
                    setParticipants={setParticipants}
                    formFields={formFields}
                    onComplete={() => {
                        setStep(3)
                        if (onStepChange) {
                            onStepChange(3)
                        }
                    }}
                    onBack={() => {
                        setStep(1)
                        if (onStepChange) {
                            onStepChange(1)
                        }
                    }}
                    loading={loading}
                    error={error}
                    setError={setError}
                    userId={user?.id}
                    sections={event.sections || []}
                    isMultiSectionEvent={true}
                    selectedSections={selectedSections}
                    event={event}
                />
            )}

            {/* Step 3: Participant Information (single events) or Review (multi-section events) */}
            {step === 3 && !isMultiSectionEvent && (
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
                    setError={setError}
                    userId={user?.id}
                    event={event}
                />
            )}

            {/* Step 3: Review (multi-section events) */}
            {step === 3 && isMultiSectionEvent && (
                <Step4Review
                    event={event}
                    contactInfo={contactInfo}
                    participants={participants}
                    selectedSections={selectedSections}
                    totalAmount={totalAmount}
                    processingFee={processingFee}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    optInMarketing={optInMarketing}
                    setOptInMarketing={setOptInMarketing}
                    onComplete={handleCompleteBooking}
                    onBack={() => {
                        setStep(2)
                        if (onStepChange) {
                            onStepChange(2)
                        }
                    }}
                    loading={loading}
                    error={error}
                    isResuming={isLegitimateResume}
                    shouldWhitelist={shouldWhitelist}
                    isLegitimateResume={isLegitimateResume}
                    discountInfo={discountInfo}
                    isMultiSectionEvent={true}
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
                    appliedDiscountCode={appliedDiscountCode}
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
                    shouldWhitelist={shouldWhitelist}
                    isLegitimateResume={isLegitimateResume}
                    isMultiSectionEvent={isMultiSectionEvent}
                    selectedSections={selectedSections}
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
                    ) : wasCreatedAsConditionalFree ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <div className="h-6 w-6 rounded-full bg-blue-600" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        Conditional Free Entry Request Submitted
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <p>Your conditional free entry request has been submitted and is awaiting organizer approval. You will receive an email notification once your request has been reviewed.</p>
                                        <p className="mt-2">Booking ID: {currentBookingId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isFreeEvent ? (
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