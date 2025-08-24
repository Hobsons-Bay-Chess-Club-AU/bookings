"use client"

import { useEffect } from 'react'
import { EventPricing } from '@/lib/types/database'
import DiscountCodeInput from '../discount-code-input'

interface Step1PricingProps {
    availablePricing: EventPricing[]
    selectedPricing: EventPricing | null
    setSelectedPricing: (pricing: EventPricing | null) => void
    quantity: number
    setQuantity: (quantity: number) => void
    maxQuantity: number
    totalAmount: number
    onContinue: () => void
    loading: boolean
    error: string
    hasDiscounts?: boolean
    hasDiscountCodes?: boolean
    eventId?: string
    baseAmount?: number
    onDiscountCodeApplied?: (discountInfo: {
        discount: {
            id: string
            name: string
            description?: string
            value_type: string
            value: number
        }
        discountAmount: number
        finalAmount: number
    } | null) => void
    onDiscountCodeRemoved?: () => void
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
}

export default function Step1Pricing({
    availablePricing,
    selectedPricing,
    setSelectedPricing,
    quantity,
    setQuantity,
    maxQuantity,
    totalAmount,
    onContinue,
    loading,
    error,
    hasDiscounts = false,
    hasDiscountCodes = false,
    eventId,
    baseAmount,
    onDiscountCodeApplied,
    onDiscountCodeRemoved,
    appliedDiscountCode
}: Step1PricingProps) {
    // Auto-select single pricing option
    useEffect(() => {
        if (availablePricing.length === 1 && !selectedPricing) {
            setSelectedPricing(availablePricing[0])
        }
    }, [availablePricing, selectedPricing, setSelectedPricing])

    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            {error && (
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Pricing Options */}
            {availablePricing.length > 1 && (
                <div className='text-gray-900 dark:text-gray-100'>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                        Select Pricing Option *
                    </label>
                    {!selectedPricing && (
                        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Please select a pricing option to continue.
                            </p>
                        </div>
                    )}
                    <div className="space-y-3">
                        {availablePricing.map((pricing) => (
                            <div
                                key={pricing.id}
                                className={`relative rounded-lg border p-4 cursor-pointer ${selectedPricing?.id === pricing.id
                                    ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                    }`}
                                onClick={() => setSelectedPricing(pricing)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="pricing-option"
                                            checked={selectedPricing?.id === pricing.id}
                                            onChange={() => setSelectedPricing(pricing)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600"
                                        />
                                        <div className="ml-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{pricing.name}</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pricing.pricing_type === 'early_bird' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                                    pricing.pricing_type === 'regular' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                                        pricing.pricing_type === 'late_bird' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                                                            pricing.pricing_type === 'conditional_free' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                                                'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                                    }`}>
                                                    {pricing.pricing_type === 'early_bird' ? 'Early Bird' :
                                                        pricing.pricing_type === 'regular' ? 'Regular' :
                                                            pricing.pricing_type === 'late_bird' ? 'Late Bird' :
                                                                pricing.pricing_type === 'conditional_free' ? 'Conditional Free' :
                                                                    'Special'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pricing.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${pricing.price}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {pricing.available_tickets} tickets left
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Single Pricing Option */}
            {availablePricing.length === 1 && (
                <div className='text-gray-900 dark:text-gray-100'>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                        Pricing Option
                    </label>
                    <div className="space-y-3">
                        <div
                            className={`relative rounded-lg border p-4 cursor-pointer ${selectedPricing?.id === availablePricing[0].id
                                ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                            onClick={() => setSelectedPricing(availablePricing[0])}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        name="pricing-option"
                                        checked={selectedPricing?.id === availablePricing[0].id}
                                        onChange={() => setSelectedPricing(availablePricing[0])}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 focus:ring-indigo-500 dark:bg-gray-800 dark:checked:bg-indigo-600"
                                    />
                                    <div className="ml-3">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{availablePricing[0].name}</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availablePricing[0].pricing_type === 'early_bird' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                                availablePricing[0].pricing_type === 'regular' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                                    availablePricing[0].pricing_type === 'late_bird' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                                                        availablePricing[0].pricing_type === 'conditional_free' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                                            'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                                }`}>
                                                {availablePricing[0].pricing_type === 'early_bird' ? 'Early Bird' :
                                                    availablePricing[0].pricing_type === 'regular' ? 'Regular' :
                                                        availablePricing[0].pricing_type === 'late_bird' ? 'Late Bird' :
                                                            availablePricing[0].pricing_type === 'conditional_free' ? 'Conditional Free' :
                                                                'Special'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{availablePricing[0].description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${availablePricing[0].price === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {availablePricing[0].price === 0 ? 'Free' : `$${availablePricing[0].price}`}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {availablePricing[0].available_tickets} tickets left
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quantity Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Number of Tickets
                </label>
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        -
                    </button>
                    <span className="text-lg font-medium text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">{quantity}</span>
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity}
                        className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        +
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Maximum {maxQuantity} tickets per booking
                </p>
            </div>

            {/* Discount Code Input */}
            {hasDiscountCodes && eventId && baseAmount && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <DiscountCodeInput
                        eventId={eventId}
                        baseAmount={baseAmount}
                        quantity={quantity}
                        onDiscountApplied={onDiscountCodeApplied}
                        onDiscountRemoved={onDiscountCodeRemoved}
                        appliedDiscount={appliedDiscountCode}
                        disabled={loading}
                    />
                </div>
            )}

            {/* Total Amount */}
            <div className="flex items-center justify-between mt-6">
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {hasDiscounts ? 'Estimated Total' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalAmount.toFixed(2)}</span>
            </div>

            {/* Discount Hint */}
            {hasDiscounts && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200 px-4 py-3 rounded mt-2">
                    <span>
                        This event has discounts available. The final amount will be recalculated before checkout based on your details.
                    </span>
                </div>
            )}

            {/* Continue Button */}
            <div className="flex space-x-4 mt-8">
                <button
                    type="submit"
                    disabled={loading || !selectedPricing}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Loading...' : !selectedPricing ? 'Select Pricing Option' : 'Continue'}
                </button>
            </div>
        </form>
    )
} 