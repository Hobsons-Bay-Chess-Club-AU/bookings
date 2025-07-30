'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile, EventPricing, Participant, FormField } from '@/lib/types/database'
import { loadStripe } from '@stripe/stripe-js'
import ParticipantForm from './participant-form'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingFormProps {
    event: Event
    user: Profile
}

function isBookable(event: Event) {
  const now = new Date()
  if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
  return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
}

export default function BookingForm({ event, user }: BookingFormProps) {
    const [step, setStep] = useState(1) // 1: Pricing & Quantity, 2: Participant Info, 3: Checkout
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [availablePricing, setAvailablePricing] = useState<EventPricing[]>([])
    const [selectedPricing, setSelectedPricing] = useState<EventPricing | null>(null)
    const [pricingLoading, setPricingLoading] = useState(true)
    const [participants, setParticipants] = useState<Partial<Participant>[]>([])
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [participantValidation, setParticipantValidation] = useState<{ [key: string]: boolean }>({})
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
                const pricingResponse = await fetch(`/api/events/${event.id}/pricing?membership_type=${user.membership_type}`)
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
    }, [event.id, user.membership_type])

    const handleContinueToParticipants = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!selectedPricing) {
            setError('Please select a pricing option')
            return
        }

        // Initialize participants array
        const initialParticipants = Array.from({ length: quantity }, () => ({
            first_name: '',
            last_name: '',
            date_of_birth: '',
            contact_email: '',
            contact_phone: '',
            custom_data: {}
        }))
        setParticipants(initialParticipants)
        setStep(2)
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

            setCurrentBookingId(booking.id)

            // Save participant data
            const response = await fetch(`/api/events/${event.id}/participants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participants,
                    bookingId: booking.id
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save participant data')
            }

            // If the event is free, confirm the booking immediately
            if (selectedPricing.price === 0) {
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ status: 'confirmed' })
                    .eq('id', booking.id)

                if (updateError) {
                    throw new Error(updateError.message)
                }

                // Redirect to success page
                window.location.href = `/booking/success?bookingId=${booking.id}`
                return
            }

            // Create Stripe checkout session for paid events
            const checkoutResponse = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: booking.id,
                    eventId: event.id,
                    quantity,
                    amount: totalAmount,
                    eventTitle: event.title,
                }),
            })

            const { sessionId, error: sessionError } = await checkoutResponse.json()

            if (sessionError) {
                throw new Error(sessionError)
            }

            // Redirect to Stripe Checkout
            const stripe = await stripePromise
            if (stripe) {
                const { error: stripeError } = await stripe.redirectToCheckout({
                    sessionId,
                })

                if (stripeError) {
                    throw new Error(stripeError.message)
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
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

    return (
        <div className="space-y-6">
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
                    <span className="ml-2 text-sm font-medium">Participant Info</span>
                </div>
                <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        step >= 3 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}>
                        3
                    </div>
                    <span className="ml-2 text-sm font-medium">Checkout</span>
                </div>
            </div>

        {step === 1 && (
            <form onSubmit={handleContinueToParticipants} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Pricing Options */}
            {availablePricing.length > 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Pricing Option
                    </label>
                    <div className="space-y-3">
                        {availablePricing.map((pricing) => (
                            <div
                                key={pricing.id}
                                className={`relative rounded-lg border p-4 cursor-pointer ${
                                    selectedPricing?.id === pricing.id
                                        ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onClick={() => setSelectedPricing(pricing)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            checked={selectedPricing?.id === pricing.id}
                                            onChange={() => setSelectedPricing(pricing)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <div className="ml-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900">{pricing.name}</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    pricing.pricing_type === 'early_bird' ? 'bg-green-100 text-green-800' :
                                                    pricing.pricing_type === 'regular' ? 'bg-blue-100 text-blue-800' :
                                                    pricing.pricing_type === 'late_bird' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {pricing.pricing_type.replace('_', ' ')}
                                                </span>
                                                {pricing.membership_type !== 'all' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        {pricing.membership_type === 'member' ? 'Members Only' : 'Non-Members'}
                                                    </span>
                                                )}
                                            </div>
                                            {pricing.description && (
                                                <p className="text-sm text-gray-500 mt-1">{pricing.description}</p>
                                            )}
                                            {pricing.available_tickets !== null && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {pricing.available_tickets} tickets remaining
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">
                                            $AUD {pricing.price.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Number of tickets
                </label>
                <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={!selectedPricing}
                >
                    {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                            {num} ticket{num > 1 ? 's' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {selectedPricing && (
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                            {quantity} × $AUD {selectedPricing.price.toFixed(2)}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                            $AUD {totalAmount.toFixed(2)}
                        </span>
                    </div>
                    {selectedPricing.name && (
                        <div className="mt-2 text-xs text-gray-500">
                            Pricing: {selectedPricing.name}
                        </div>
                    )}
                </div>
            )}

                <button
                    type="submit"
                    disabled={loading || !selectedPricing}
                    className="w-full bg-indigo-600 border border-transparent rounded-md py-3 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {!selectedPricing ? 'Select Pricing Option' : 'Continue to Participant Info'}
                </button>
            </form>
        )}

        {/* Step 2: Participant Information */}
        {step === 2 && (
            <div className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Booking Summary
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                                {quantity} × $AUD {selectedPricing?.price.toFixed(2)}
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                                $AUD {totalAmount.toFixed(2)}
                            </span>
                        </div>
                        {selectedPricing?.name && (
                            <div className="mt-2 text-xs text-gray-500">
                                Pricing: {selectedPricing.name}
                            </div>
                        )}
                    </div>
                </div>

                <ParticipantForm
                    fields={formFields}
                    participants={participants}
                    onChange={setParticipants}
                    quantity={quantity}
                />

                {/* Validation Summary */}
                {!areAllParticipantsValid() && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-yellow-400">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Participant Information Required
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>Please complete the following to continue:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        {participants.map((participant, index) => {
                                            const missing = []
                                            
                                            if (!participant.first_name?.trim()) missing.push('First Name')
                                            if (!participant.last_name?.trim()) missing.push('Last Name')
                                            
                                            formFields.forEach(field => {
                                                if (field.required) {
                                                    const value = participant.custom_data?.[field.name]
                                                    if (!value || value === '') {
                                                        missing.push(field.label)
                                                    }
                                                }
                                            })
                                            
                                            if (missing.length > 0) {
                                                return (
                                                    <li key={index}>
                                                        <strong>Participant {index + 1}:</strong> {missing.join(', ')}
                                                    </li>
                                                )
                                            }
                                            return null
                                        }).filter(Boolean)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-6">
                    <button
                        onClick={() => setStep(1)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Back to Pricing
                    </button>
                    
                    <button
                        onClick={handleCompleteBooking}
                        disabled={loading || !areAllParticipantsValid()}
                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            'Processing...'
                        ) : !areAllParticipantsValid() ? (
                            'Complete Participant Information'
                        ) : selectedPricing?.price === 0 ? (
                            'Complete Free Booking'
                        ) : (
                            `Proceed to Payment ($AUD ${totalAmount.toFixed(2)})`
                        )}
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                    {!areAllParticipantsValid() ? (
                        'Please complete all required participant information to continue.'
                    ) : selectedPricing && selectedPricing.price > 0 ? (
                        'You will be redirected to Stripe to complete your payment.'
                    ) : (
                        'Your free booking will be confirmed immediately.'
                    )}
                </p>
            </div>
        )}
    </div>
    )
}