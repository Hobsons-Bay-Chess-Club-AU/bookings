'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile, EventPricing, Participant, FormField } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'
import Step1Pricing from './booking-steps/step-1-pricing'
import Step2Contact from './booking-steps/step-2-contact'
import Step3Participants from './booking-steps/step-3-participants'

interface BookingFormProps {
    event: Event
    user?: Profile // Make user optional
}

function isBookable(event: Event) {
  const now = new Date()
  if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
  return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
}

export default function BookingForm({ event, user }: BookingFormProps) {
    const [step, setStep] = useState(1) // 1: Pricing & Quantity, 2: Contact Info, 3: Participant Info, 4: Checkout
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

    const supabase = createClient()
    
    const totalAmount = selectedPricing ? selectedPricing.price * quantity : 0
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
                setAvailablePricing(pricing)
                
                // Auto-select the first (cheapest) available pricing
                if (pricing.length > 0) {
                    setSelectedPricing(pricing[0])
                }

                // Set form fields from event
                setFormFields(event.custom_form_fields || [])
                
            } catch (err: any) {
                console.error('Error fetching data:', err)
                setError(err.message || 'Failed to load event data')
            } finally {
                setPricingLoading(false)
            }
        }

        fetchData()
    }, [event.id, user?.membership_type])

    const handleContinueToContact = () => {
        setError('')

        if (!user) {
            if (typeof window !== 'undefined') {
                window.location.href = `/auth/login?redirectTo=${window.location.pathname}`
            }
            return
        }

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

    // Check if all participants have valid data (for button state)
    const areAllParticipantsValid = (): boolean => {
        if (participants.length !== quantity) {
            return false
        }

        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i]
            
            // Check required fixed fields
            if (!participant.first_name?.trim() || !participant.last_name?.trim()) {
                return false
            }

            // Check required custom fields
            for (const field of formFields) {
                if (field.required) {
                    const value = participant.custom_data?.[field.name]
                    if (!value || value === '') {
                        return false
                    }
                }
            }
        }
        return true
    }

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
        if (!user) {
            if (typeof window !== 'undefined') {
                window.location.href = `/auth/login?redirectTo=${window.location.pathname}`
            }
            return
        }
        setLoading(true)
        setError('')

        try {
            if (!selectedPricing) {
                throw new Error('Please select a pricing option')
            }

            if (!validateParticipants()) {
                setLoading(false)
                return
            }

            // Create booking record with pricing information
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    event_id: event.id,
                    user_id: user.id,
                    pricing_id: selectedPricing.id,
                    quantity,
                    unit_price: selectedPricing.price,
                    total_amount: totalAmount,
                    status: 'pending'
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

            // Create Stripe checkout session
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
                    eventTitle: event.title
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

            setCurrentBookingId(booking.id)
            setStep(4)
        } catch (err: any) {
            setError(err.message || 'Failed to complete booking')
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

    if (availablePricing.length === 0) {
        return (
            <div className="text-center">
                <p className="text-gray-600">No pricing options available at this time.</p>
            </div>
        )
    }

    const content = (
        <div className="space-y-6 text-gray-900">
            {/* Progress Steps */}
            <div className="flex items-center space-x-4 mb-8">
                <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        step >= 1 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}>
                        1
                    </div>
                    <span className="ml-2 text-sm font-medium">Pricing & Quantity</span>
                </div>
                <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        step >= 2 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}>
                        2
                    </div>
                    <span className="ml-2 text-sm font-medium">Contact Info</span>
                </div>
                <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        step >= 3 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}>
                        3
                    </div>
                    <span className="ml-2 text-sm font-medium">Participant Info</span>
                </div>
                <div className={`w-8 h-0.5 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center ${step >= 4 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        step >= 4 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}>
                        4
                    </div>
                    <span className="ml-2 text-sm font-medium">Checkout</span>
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
                                <p>Your booking is being processed. Please don't close this page or navigate away.</p>
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
                    onComplete={handleCompleteBooking}
                    onBack={() => setStep(2)}
                    loading={loading}
                    error={error}
                    userId={user?.id}
                />
            )}

            {/* Step 4: Processing Payment */}
            {step === 4 && (
                <div className="space-y-6">
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
                </div>
            )}
        </div>
    )

    return content
}