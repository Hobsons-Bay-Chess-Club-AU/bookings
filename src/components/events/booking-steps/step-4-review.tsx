'use client'

import { Event, EventPricing, Participant, FormField } from '@/lib/types/database'

interface Step4ReviewProps {
    event: Event
    selectedPricing: EventPricing | null
    quantity: number
    totalAmount: number
    contactInfo: {
        first_name: string
        last_name: string
        email: string
        phone: string
    }
    participants: Partial<Participant>[]
    formFields: FormField[]
    agreedToTerms: boolean
    setAgreedToTerms: (agreed: boolean) => void
    optInMarketing: boolean
    setOptInMarketing: (opted: boolean) => void
    onComplete: () => void
    onBack: () => void
    loading: boolean
    error: string
}

export default function Step4Review({
    event,
    selectedPricing,
    quantity,
    totalAmount,
    contactInfo,
    participants,
    formFields,
    agreedToTerms,
    setAgreedToTerms,
    optInMarketing,
    setOptInMarketing,
    onComplete,
    onBack,
    loading,
    error
}: Step4ReviewProps) {
    const isFreeEvent = totalAmount === 0 || selectedPricing?.price === 0
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Booking</h3>

                {/* Event Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
                    <p className="text-gray-700">{event.title}</p>
                    {event.start_date && (
                        <p className="text-sm text-gray-600">
                            {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Pricing Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Pricing</h4>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-700">
                            {selectedPricing?.name} × {quantity}
                        </span>
                        <span className={`font-medium ${isFreeEvent ? 'text-green-600' : ''}`}>
                            {isFreeEvent ? 'Free' : `$${totalAmount.toFixed(2)}`}
                        </span>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <p className="text-gray-700">{contactInfo.first_name} {contactInfo.last_name}</p>
                    <p className="text-gray-600">{contactInfo.email}</p>
                    {contactInfo.phone && <p className="text-gray-600">{contactInfo.phone}</p>}
                </div>

                {/* Participants */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Participants ({quantity})</h4>
                    <div className="space-y-3">
                        {participants.map((participant, index) => (
                            <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                                <p className="text-gray-700 font-medium">
                                    {index + 1}. {participant.first_name} {participant.last_name}
                                </p>
                                {participant.email && (
                                    <p className="text-sm text-gray-600">{participant.email}</p>
                                )}

                                {/* Custom fields */}
                                {formFields.map((field) => {
                                    const value = participant.custom_data?.[field.name]
                                    if (!value) return null

                                    // Handle different value types
                                    let displayValue = value
                                    if (typeof value === 'object' && value !== null) {
                                        if (((value as unknown) as { name: string }).name) {
                                            // For player objects, show the name
                                            displayValue = ((value as unknown) as { name: string }).name
                                        } else if (Array.isArray(value)) {
                                            // For arrays, join with commas
                                            displayValue = value.join(', ')
                                        } else {
                                            // For other objects, stringify
                                            displayValue = JSON.stringify(value)
                                        }
                                    }

                                    return (
                                        <div key={field.id} className="text-sm text-gray-600">
                                            <span className="font-medium">{field.label}:</span> {displayValue as string}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Terms and Marketing */}
                <div className="border-t pt-6">
                    <div className="space-y-4">
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                                I agree to the{' '}
                                <a href="/content/terms-of-use" target="_blank" className="text-indigo-600 hover:text-indigo-500">
                                    Terms and Conditions
                                </a>{' '}
                                and{' '}
                                <a href="/content/privacy-policy" target="_blank" className="text-indigo-600 hover:text-indigo-500">
                                    Privacy Policy
                                </a>
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                        </div>

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="marketing"
                                checked={optInMarketing}
                                onChange={(e) => setOptInMarketing(e.target.checked)}
                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="marketing" className="ml-3 text-sm text-gray-700">
                                I would like to receive marketing emails about future events and updates
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Payment Warning for Paid Events */}
                    {!isFreeEvent && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-700">
                                <strong>Next Step:</strong> You will be redirected to our secure payment portal. 
                                We do not capture or store any payment details on our system.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between mt-6">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={onComplete}
                            disabled={!agreedToTerms || loading}
                            className={`px-6 py-2 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFreeEvent 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? 'Processing...' : isFreeEvent ? 'Finish' : 'Proceed to Payment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
