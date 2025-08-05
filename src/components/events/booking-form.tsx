'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile, EventPricing, Participant, FormField } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'
import Step1Pricing from './booking-steps/step-1-pricing'
import Step2Contact from './booking-steps/step-2-contact'
import Step3Participants from './booking-steps/step-3-participants'
import Step4Review from './booking-steps/step-4-review'
import { useBookingJourney } from '@/contexts/BookingJourneyContext'

interface BookingFormProps {
    event: Event
    user?: Profile // Make user optional
    onStepChange?: (step: number) => void // Callback for when booking step changes
}

// Function removed as it was unused
// function isBookable(event: Event) {
//     const now = new Date()
//     if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
//     return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
// }

export default function BookingForm({ event, user, onStepChange }: BookingFormProps) {
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
    const [participants, setParticipants] = useState<Partial<Participant>[]>([])
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [optInMarketing, setOptInMarketing] = useState(false)
    const [shouldRedirect, setShouldRedirect] = useState(false)
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const supabase = createClient()
    
    // Use booking journey context
    const { setIsInBookingJourney, setBookingStep } = useBookingJourney()

    const totalAmount = selectedPricing ? selectedPricing.price * quantity : (event.price * quantity)
    const maxQuantity = event.max_attendees
        ? Math.min(10, event.max_attendees - event.current_attendees)
        : 10

    // Fetch available pricing options and form fields
    useEffect(() => {
        const fetchData = async () => {
            try {
                setPricingLoading(true)

                // Fetch pricing options
                const membershipType = user?.membership_type || 'non_member'
                const pricingResponse = await fetch(`/api/events/${event.id}/pricing?membership_type=${membershipType}`)
                if (!pricingResponse.ok) {
                    throw new Error('Failed to fetch pricing')
                }
                const pricing = await pricingResponse.json()
                
                // If no pricing options are available, create a default option using event's base price
                if (pricing.length === 0) {
                    const defaultPricing: EventPricing = {
                        id: 'default',
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

            } catch (err: unknown) {
                console.error('Error fetching data:', err)
                setError((err as Error).message || 'Failed to load event data')
            } finally {
                setPricingLoading(false)
            }
        }

        fetchData()
    }, [event.id, user?.membership_type, event.custom_form_fields])

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
    }, [availablePricing, selectedPricing])

    // Reset redirect state when step changes
    useEffect(() => {
        if (step !== 5) {
            setShouldRedirect(false)
        }
    }, [step])

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
    }, [shouldRedirect, currentBookingId, totalAmount, selectedPricing])

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
    }

    const handleContinueToReview = () => {
        setError('')

        if (!validateParticipants()) {
            return
        }

        setStep(4)
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

            // Create booking record with pricing information
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    event_id: event.id,
                    user_id: user.id,
                    pricing_id: isFreeEvent ? null : selectedPricing.id, // Don't set pricing_id for free events
                    quantity,
                    unit_price: selectedPricing.price,
                    total_amount: totalAmount,
                    status: isFreeEvent ? 'confirmed' : 'pending'
                })
                .select()
                .single()

            if (bookingError) {
                throw new Error(bookingError.message)
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
                            custom_data: participant.custom_data || {}
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

            if (isFreeEvent) {
                console.log('🎉 Free event detected, setting up redirect')
                console.log('📝 Setting currentBookingId:', booking.id)
                console.log('📝 Setting step to 5')
                console.log('📝 Setting shouldRedirect to true')
                
                // For free events, redirect to success page directly
                setCurrentBookingId(booking.id)
                setStep(5)
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

            setCurrentBookingId(booking.id)
            setStep(5)
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to complete booking')
        } finally {
            setLoading(false)
        }
    }

    if (event.entry_close_date && new Date(event.entry_close_date) < new Date()) {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 font-semibold">Entries for this event are now closed (entry close date has passed).</p>
            </div>
        )
    }
    if (event.max_attendees != null && event.current_attendees >= event.max_attendees) {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 font-semibold">This event is sold out.</p>
            </div>
        )
    }
    if (event.status !== 'published') {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-gray-800 font-semibold">This event is not open for booking.</p>
            </div>
        )
    }

    if (maxQuantity <= 0) {
        return (
            <div className="text-center">
                <p className="text-gray-600">This event is sold out.</p>
            </div>
        )
    }

    if (pricingLoading) {
        return (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading pricing options...</p>
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
        <div className="space-y-6 text-gray-900">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 1 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                        }`}>
                        1
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Book</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 2 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                        }`}>
                        2
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Contact</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 3 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                        }`}>
                        3
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">Participants</span>
                </div>
                <div className={`w-3 md:w-6 h-0.5 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex flex-col md:flex-row md:items-center ${step >= 4 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mx-auto md:mx-0 ${step >= 4 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                        }`}>
                        4
                    </div>
                    <span className="text-xs md:text-sm font-medium mt-1 md:mt-0 md:ml-2 text-center md:text-left">
                        {(totalAmount === 0 || selectedPricing?.price === 0) ? 'Review' : 'Payment'}
                    </span>
                </div>

            </div>

            {/* Booking in Progress Warning */}
            {currentBookingId && currentBookingId.trim() !== '' && (
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
                                <p>Your booking is being processed. Please don&apos;t close this page or navigate away.</p>
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
                />
            )}

            {/* Step 2: Contact Information */}
            {step === 2 && (
                <Step2Contact
                    contactInfo={contactInfo}
                    setContactInfo={setContactInfo}
                    onContinue={handleContinueToParticipants}
                    onBack={() => setStep(1)}
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
                    onBack={() => setStep(2)}
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
                    contactInfo={contactInfo}
                    participants={participants}
                    formFields={formFields}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    optInMarketing={optInMarketing}
                    setOptInMarketing={setOptInMarketing}
                    onComplete={handleCompleteBooking}
                    onBack={() => setStep(3)}
                    loading={loading}
                    error={error}
                />
            )}

            {/* Step 5: Processing Payment or Success */}
            {step === 5 && (
                <div className="space-y-6">
                    {(totalAmount === 0 || selectedPricing?.price === 0) ? (
                        // Free event success
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
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