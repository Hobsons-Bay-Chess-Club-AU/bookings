'use client'

import { EventSection, SectionPricing } from '@/lib/types/database'
import { HiUsers } from 'react-icons/hi2'

interface SectionSelection {
    sectionId: string
    section: EventSection
    pricingId: string
    pricing: SectionPricing
    quantity: number
}

interface Step0SectionsProps {
    sections: EventSection[]
    selectedSections: SectionSelection[]
    setSelectedSections: (sections: SectionSelection[]) => void
    onContinue: () => void
    loading: boolean
    error: string
}

export default function Step0Sections({
    sections,
    selectedSections,
    setSelectedSections,
    onContinue,
    loading,
    error
}: Step0SectionsProps) {
    const getSectionStatus = (section: EventSection) => {
        const availableSeats = section.available_seats ?? 0
        const isFull = availableSeats <= 0  // Changed from === 0 to <= 0 to include negative values
        const whitelistEnabled = section.whitelist_enabled || false
        const shouldWhitelist = isFull && whitelistEnabled
        return { isFull, whitelistEnabled, shouldWhitelist, availableSeats }
    }

    const hasWhitelistSections = selectedSections.some(selection => {
        const section = sections.find(s => s.id === selection.sectionId)
        return section && getSectionStatus(section).shouldWhitelist
    })

    const hasAvailableSections = selectedSections.some(selection => {
        const section = sections.find(s => s.id === selection.sectionId)
        return section && (section.available_seats ?? 0) > 0
    })

    const handleSectionToggle = (section: EventSection, pricing: SectionPricing) => {
        const existingIndex = selectedSections.findIndex(
            s => s.sectionId === section.id && s.pricingId === pricing.id
        )

        if (existingIndex >= 0) {
            // Remove section
            setSelectedSections(selectedSections.filter((_, index) => index !== existingIndex))
        } else {
            // Check if this would create a mixed booking
            const sectionStatus = getSectionStatus(section)
            const wouldBeWhitelist = sectionStatus.shouldWhitelist
            const wouldBeAvailable = !sectionStatus.isFull

            // If we already have whitelist sections and this is available, or vice versa, prevent selection
            if ((hasWhitelistSections && wouldBeAvailable) || (hasAvailableSections && wouldBeWhitelist)) {
                return // Don't allow mixed bookings
            }

            // Add section with quantity 1
            setSelectedSections([
                ...selectedSections,
                {
                    sectionId: section.id,
                    section,
                    pricingId: pricing.id,
                    pricing,
                    quantity: 1
                }
            ])
        }
    }

    const handleQuantityChange = (sectionId: string, pricingId: string, quantity: number) => {
        setSelectedSections(selectedSections.map(s => 
            s.sectionId === sectionId && s.pricingId === pricingId
                ? { ...s, quantity }
                : s
        ))
    }

    const getSelectedQuantity = (sectionId: string, pricingId: string) => {
        const selection = selectedSections.find(
            s => s.sectionId === sectionId && s.pricingId === pricingId
        )
        return selection?.quantity || 0
    }

    const isSelected = (sectionId: string, pricingId: string) => {
        return selectedSections.some(
            s => s.sectionId === sectionId && s.pricingId === pricingId
        )
    }

    const totalAmount = selectedSections.reduce((sum, selection) => {
        return sum + (selection.pricing.price * selection.quantity)
    }, 0)

    const totalQuantity = selectedSections.reduce((sum, selection) => {
        return sum + selection.quantity
    }, 0)

    // Get all unique pricing options across all sections
    const allPricingOptions = sections.flatMap(section => 
        section.pricing?.map(pricing => ({
            section,
            pricing,
            availableSeats: section.available_seats ?? 0,
            availableTickets: pricing.available_tickets ?? 999
        })) || []
    ).filter(option => {
        const sectionStatus = getSectionStatus(option.section)
        const isWhitelistSection = sectionStatus.shouldWhitelist
        
        // Show sections that have available seats OR are whitelist sections
        const hasAvailableSeats = option.availableSeats > 0
        const hasAvailableTickets = option.availableTickets > 0 || option.availableTickets === null
        
        // Debug logging for section filtering
        console.log('🔍 Section filtering debug:', {
            sectionTitle: option.section.title,
            availableSeats: option.availableSeats,
            availableTickets: option.availableTickets,
            hasAvailableSeats,
            hasAvailableTickets,
            isWhitelistSection,
            sectionStatus,
            shouldShow: (hasAvailableSeats && hasAvailableTickets) || isWhitelistSection
        })
        
        // Include sections with available seats OR whitelist sections
        return (hasAvailableSeats && hasAvailableTickets) || isWhitelistSection
    })

    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            {error && (
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Select Event Sections
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Choose which sections you&apos;d like to register for and how many tickets for each.
                </p>
                {(hasWhitelistSections || hasAvailableSections) && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Note:</strong> You cannot mix whitelist sections (full sections with whitelist enabled) with available sections in the same booking. 
                            Please select either all whitelist sections or all available sections.
                        </p>
                    </div>
                )}
            </div>

            {/* Section Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Available Sections
                </label>
                

                
                <div className="space-y-3">
                    {allPricingOptions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No sections available for booking.</p>
                            <p className="text-sm mt-2">Please contact the organizer if you believe this is an error.</p>
                        </div>
                    ) : (
                        allPricingOptions.map(({ section, pricing, availableSeats, availableTickets }) => {
                        const isPricingSelected = isSelected(section.id, pricing.id)
                        const selectedQuantity = getSelectedQuantity(section.id, pricing.id)
                        const sectionStatus = getSectionStatus(section)
                        const isWhitelistSection = sectionStatus.shouldWhitelist
                        
                        // For whitelist sections, allow up to 10 tickets (reasonable limit for whitelist)
                        // For available sections, use the actual available seats/tickets
                        const maxAvailable = isWhitelistSection 
                            ? Math.min(10, availableTickets || 10) 
                            : Math.min(availableSeats, availableTickets)
                        const isAvailableSection = !sectionStatus.isFull

                        // Check if this section would create a mixed booking
                        const wouldCreateMixedBooking = 
                            (hasWhitelistSections && isAvailableSection) || 
                            (hasAvailableSections && isWhitelistSection)

                        const isDisabled = wouldCreateMixedBooking && !isPricingSelected

                        return (
                            <div
                                key={`${section.id}-${pricing.id}`}
                                className={`relative rounded-lg border p-4 ${
                                    isDisabled 
                                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                                        : isPricingSelected
                                            ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer'
                                            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800 cursor-pointer'
                                }`}
                                onClick={() => !isDisabled && handleSectionToggle(section, pricing)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={isPricingSelected}
                                            onChange={() => !isDisabled && handleSectionToggle(section, pricing)}
                                            disabled={isDisabled}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600 disabled:opacity-50"
                                        />
                                        <div className="ml-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {section.title}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    pricing.pricing_type === 'early_bird' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                                    pricing.pricing_type === 'regular' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                                    pricing.pricing_type === 'late_bird' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                                                    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                                }`}>
                                                    {pricing.pricing_type === 'early_bird' ? 'Early Bird' :
                                                     pricing.pricing_type === 'regular' ? 'Regular' :
                                                     pricing.pricing_type === 'late_bird' ? 'Late Bird' :
                                                     'Special'}
                                                </span>
                                                {isWhitelistSection && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                                        Whitelist
                                                    </span>
                                                )}
                                                {isDisabled && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                        Mixed booking not allowed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {pricing.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${pricing.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {pricing.price === 0 ? 'Free' : `$${pricing.price}`}
                                        </div>
                                        <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            <HiUsers className="h-4 w-4 mr-1" />
                                            <span>
                                                {isWhitelistSection 
                                                    ? `${maxAvailable} whitelist spots` 
                                                    : `${maxAvailable} available`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quantity selector for selected pricing */}
                                {isPricingSelected && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Number of Tickets
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (selectedQuantity > 1) {
                                                            handleQuantityChange(section.id, pricing.id, selectedQuantity - 1)
                                                        }
                                                    }}
                                                    disabled={selectedQuantity <= 1}
                                                    className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    -
                                                </button>
                                                <span className="text-lg font-medium text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">
                                                    {selectedQuantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (selectedQuantity < maxAvailable) {
                                                            handleQuantityChange(section.id, pricing.id, selectedQuantity + 1)
                                                        }
                                                    }}
                                                    disabled={selectedQuantity >= maxAvailable}
                                                    className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Maximum {maxAvailable} tickets for this section
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Subtotal: ${(pricing.price * selectedQuantity).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                    )}
                </div>
            </div>

            {/* Summary */}
            {selectedSections.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Selection Summary
                    </h3>
                    <div className="space-y-2">
                        {selectedSections.map((selection, index) => (
                            <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {selection.section.title} - {selection.pricing.name} (x{selection.quantity})
                                </span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">
                                    ${(selection.pricing.price * selection.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                            <div className="flex justify-between text-base font-medium">
                                <span className="text-gray-900 dark:text-gray-100">
                                    Total ({totalQuantity} tickets)
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    ${totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Continue Button */}
            <div className="flex space-x-4 mt-8">
                <button
                    type="submit"
                    disabled={loading || selectedSections.length === 0}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"

                >
                    {loading ? 'Loading...' : 'Continue'}
                </button>
            </div>
        </form>
    )
}
