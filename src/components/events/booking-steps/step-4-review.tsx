'use client'

import { useState, useEffect } from 'react'
import { Event, EventPricing, Participant, FormField, EventSection, SectionPricing } from '@/lib/types/database'
import { formatParticipantName } from '@/lib/utils/name-formatting'

interface Step4ReviewProps {
    event: Event
    selectedPricing?: EventPricing | null
    quantity?: number
    totalAmount: number
    baseAmount?: number
    processingFee?: number
    selectedSections?: Array<{
        sectionId: string
        section: EventSection
        pricingId: string
        pricing: SectionPricing
        quantity: number
    }>
    discountInfo?: {
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
    } | null
    discountLoading?: boolean
    appliedDiscountCode?: {
        discount: {
            id: string
            name: string
            description?: string
            value_type: string
            value: number
        }
        discountAmount: number
        finalAmount: number
    } | null
    contactInfo: {
        first_name: string
        last_name: string
        email: string
        phone: string
    }
    participants: Partial<Participant>[]
    formFields?: FormField[]
    agreedToTerms: boolean
    setAgreedToTerms: (agreed: boolean) => void
    optInMarketing: boolean
    setOptInMarketing: (opted: boolean) => void
    onComplete: () => void
    onBack: () => void
    loading: boolean
    error: string
    isResuming?: boolean
    shouldWhitelist?: boolean
    isLegitimateResume?: boolean
    isMultiSectionEvent?: boolean
}

export default function Step4Review({
    event,
    selectedPricing,
    quantity = 1,
    totalAmount,
    baseAmount = totalAmount,
    selectedSections = [],
    discountInfo,
    discountLoading,
    appliedDiscountCode,
    contactInfo,
    participants,
    formFields = [],
    agreedToTerms,
    setAgreedToTerms,
    optInMarketing,
    setOptInMarketing,
    onComplete,
    onBack,
    loading,
    error,
    isResuming = false,
    shouldWhitelist = false,
    isMultiSectionEvent = false
}: Step4ReviewProps) {
    const [showTermsModal, setShowTermsModal] = useState(false)
    
    // Handle escape key to close modal
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showTermsModal) {
                setShowTermsModal(false)
            }
        }

        if (showTermsModal) {
            document.addEventListener('keydown', handleEscapeKey)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey)
            document.body.style.overflow = 'unset'
        }
    }, [showTermsModal])
    
    const isFreeEvent = isMultiSectionEvent 
        ? (selectedSections.length === 0 || selectedSections.every(selection => selection.pricing.price === 0))
        : (totalAmount === 0 || selectedPricing?.price === 0)
    
    // Debug logging for button text and pricing
    console.log('🔍 Step4Review Debug:', {
        isResuming,
        shouldWhitelist,
        isFreeEvent,
        isMultiSectionEvent,
        selectedSections: selectedSections.length,
        totalAmount,
        baseAmount,
        selectedPricingPrice: selectedPricing?.price,
        selectedSectionsPricing: selectedSections.map(s => ({ 
            sectionTitle: s.section.title, 
            pricingPrice: s.pricing.price,
            quantity: s.quantity 
        }))
    })
    

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {isResuming ? 'Complete Your Payment' : shouldWhitelist ? 'Whitelisted Review' : 'Review Your Booking'}
                </h3>

                {/* Event Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Event Details</h4>
                    <p className="text-gray-700 dark:text-gray-300">{event.title}</p>
                    {event.start_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Pricing Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {isMultiSectionEvent ? 'Section Pricing' : 'Pricing'}
                    </h4>
                    <div className="space-y-2">
                        {isMultiSectionEvent ? (
                            // Multi-section pricing display
                            selectedSections.map((selection, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {selection.section.title} - {selection.pricing.name} × {selection.quantity}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                        ${(selection.pricing.price * selection.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            // Single event pricing display
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300">
                                    {selectedPricing?.name} × {quantity}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                    ${baseAmount.toFixed(2)}
                                </span>
                            </div>
                        )}
                        
                        {/* Discount Information */}
                        {discountLoading && (
                            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                                <span>Calculating discounts...</span>
                                <span>Please wait</span>
                            </div>
                        )}
                        
                        {/* Discount Code */}
                        {appliedDiscountCode && (
                            <div className="flex justify-between items-start text-sm gap-2">
                                <span className="text-green-600 dark:text-green-300 text-left flex-1 min-w-0">
                                    <span className="break-words">{appliedDiscountCode.discount.name}</span>
                                    <span className="block text-xs">(Discount code)</span>
                                    {appliedDiscountCode.discount.description && (
                                        <span className="block text-xs">{appliedDiscountCode.discount.description}</span>
                                    )}
                                </span>
                                <span className="text-green-600 dark:text-green-300 font-medium flex-shrink-0">
                                    -${appliedDiscountCode.discountAmount.toFixed(2)}
                                </span>
                            </div>
                        )}
                        
                        {discountInfo && discountInfo.totalDiscount > 0 && (
                            <>
                                {discountInfo.appliedDiscounts.map((appliedDiscount, index) => (
                                    <div key={index} className="flex justify-between items-start text-sm gap-2">
                                        <span className="text-green-600 dark:text-green-300 text-left flex-1 min-w-0">
                                            <span className="break-words">{appliedDiscount.discount.name}</span>
                                            {appliedDiscount.type === 'participant_based' && 
                                                <span className="block text-xs">({appliedDiscount.eligibleParticipants} eligible)</span>}
                                            {appliedDiscount.discount.rules && appliedDiscount.discount.rules.some((rule) => rule.rule_type === 'previous_event') && 
                                                <span className="block text-xs">(Previous event discount)</span>}
                                        </span>
                                        <span className="text-green-600 dark:text-green-300 font-medium flex-shrink-0">
                                            -${appliedDiscount.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                        
                        {/* Total Discount */}
                        {((discountInfo && discountInfo.totalDiscount > 0) || appliedDiscountCode) && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Total Discount</span>
                                    <span className="text-green-600 dark:text-green-300 font-medium">
                                        -${((discountInfo?.totalDiscount || 0) + (appliedDiscountCode?.discountAmount || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-gray-100 font-medium">Total Amount</span>
                                <span className={`font-bold text-lg ${shouldWhitelist ? 'text-amber-700 dark:text-amber-300' : isFreeEvent ? 'text-green-600 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {shouldWhitelist ? 'Whitelisted' : isFreeEvent ? 'Free' : `$${totalAmount.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                        {/* Processing fee disclosure */}
                        {!isFreeEvent && !shouldWhitelist && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                A processing fee of 1.7% + A$0.30 will be added at checkout.
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Contact Information</h4>
                    <p className="text-gray-700 dark:text-gray-300">{contactInfo.first_name} {contactInfo.last_name}</p>
                    <p className="text-gray-600 dark:text-gray-400">{contactInfo.email}</p>
                    {contactInfo.phone && <p className="text-gray-600 dark:text-gray-400">{contactInfo.phone}</p>}
                </div>

                {/* Participants */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Participants ({quantity})</h4>
                    <div className="space-y-3">
                        {participants.map((participant, index) => (
                            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                                <p className="text-gray-700 dark:text-gray-300 font-medium break-words">
                                    {index + 1}. {participant.first_name && participant.last_name ? formatParticipantName(participant as { first_name: string; middle_name?: string; last_name: string }) : 'Participant'}
                                </p>
                                {participant.contact_email && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm break-all">{participant.contact_email}</p>
                                )}
                                {participant.date_of_birth && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">DOB: {participant.date_of_birth}</p>
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
                                        <div key={field.id} className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">{field.label}:</span> 
                                            <span className="break-words ml-1">{displayValue as string}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Terms and Marketing */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 flex-shrink-0 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                I agree to the{' '}
                                <a href="/content/terms-of-use" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                                    Terms and Conditions
                                </a>{' '}
                                and{' '}
                                <a href="/content/privacy-policy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                                    Privacy Policy
                                </a>
                                {event.settings?.terms_conditions && (
                                    <>
                                        , and the{' '}
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(true)}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline"
                                        >
                                            Event Terms & Conditions
                                        </button>
                                    </>
                                )}
                                <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                            </label>
                        </div>

                        {/* Event Terms & Conditions Modal */}
                        {showTermsModal && event.settings?.terms_conditions && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                {/* Backdrop */}
                                <div 
                                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" 
                                    onClick={() => setShowTermsModal(false)}
                                ></div>
                                
                                {/* Modal Content */}
                                <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            Event Terms & Conditions
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(false)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="prose dark:prose-invert max-w-none">
                                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-base font-normal">
                                                {event.settings.terms_conditions}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(false)}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                        >
                                            I Understand
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="marketing"
                                checked={optInMarketing}
                                onChange={(e) => setOptInMarketing(e.target.checked)}
                                className="mt-1 h-4 w-4 flex-shrink-0 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600"
                            />
                            <label htmlFor="marketing" className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                I would like to receive marketing emails about future events and updates
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Payment Warning for Paid Events */}
                    {!isFreeEvent && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                            <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">
                                {shouldWhitelist ? (
                                    <>
                                        <strong>Next Step:</strong> We will reserve your booking with one spot available. 
                                        You will receive an email to review and pay the outstanding amount to secure your booking.
                                    </>
                                ) : (
                                    <>
                                        <strong>Next Step:</strong> You will be redirected to our secure payment portal. 
                                        We do not capture or store any payment details on our system.
                                    </>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={onComplete}
                            disabled={!agreedToTerms || loading}
                            className={`px-6 py-2 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                shouldWhitelist
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : isFreeEvent 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? 'Processing...' : shouldWhitelist ? 'Submit to Whitelist' : isFreeEvent ? 'Finish' : (isResuming ? 'Payment' : 'Proceed to Payment')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
