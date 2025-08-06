"use client"

// ...existing code...
import { EventPricing } from '@/lib/types/database'

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
    hasDiscounts = false
}: Step1PricingProps) {
    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Pricing Options */}
            {availablePricing.length > 1 && (
                <div className='text-gray-900'>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Pricing Option
                    </label>
                    <div className="space-y-3">
                        {availablePricing.map((pricing) => (
                            <div
                                key={pricing.id}
                                className={`relative rounded-lg border p-4 cursor-pointer ${selectedPricing?.id === pricing.id
                                    ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                                    : 'border-gray-300 hover:border-gray-400'
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
                                            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <div className="ml-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900">{pricing.name}</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pricing.pricing_type === 'early_bird' ? 'bg-green-100 text-green-800' :
                                                    pricing.pricing_type === 'regular' ? 'bg-blue-100 text-blue-800' :
                                                        pricing.pricing_type === 'late_bird' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {pricing.pricing_type === 'early_bird' ? 'Early Bird' :
                                                        pricing.pricing_type === 'regular' ? 'Regular' :
                                                            pricing.pricing_type === 'late_bird' ? 'Late Bird' :
                                                                'Special'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{pricing.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">${pricing.price}</div>
                                        <div className="text-sm text-gray-500">
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
                <div className='text-gray-900'>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Pricing Option
                    </label>
                    <div className="space-y-3">
                        <div
                            className="relative rounded-lg border p-4 border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        name="pricing-option"
                                        checked={true}
                                        readOnly
                                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <div className="ml-3">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-900">{availablePricing[0].name}</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availablePricing[0].pricing_type === 'early_bird' ? 'bg-green-100 text-green-800' :
                                                availablePricing[0].pricing_type === 'regular' ? 'bg-blue-100 text-blue-800' :
                                                    availablePricing[0].pricing_type === 'late_bird' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-purple-100 text-purple-800'
                                                }`}>
                                                {availablePricing[0].pricing_type === 'early_bird' ? 'Early Bird' :
                                                    availablePricing[0].pricing_type === 'regular' ? 'Regular' :
                                                        availablePricing[0].pricing_type === 'late_bird' ? 'Late Bird' :
                                                            'Special'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{availablePricing[0].description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${availablePricing[0].price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                        {availablePricing[0].price === 0 ? 'Free' : `$${availablePricing[0].price}`}
                                    </div>
                                    <div className="text-sm text-gray-500">
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Number of Tickets
                </label>
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >
                        -
                    </button>
                    <span className="text-lg font-medium text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity}
                        className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        +
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Maximum {maxQuantity} tickets per booking
                </p>
            </div>

            {/* Total */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                        {hasDiscounts ? 'Estimated Total' : 'Total Amount'}
                    </span>
                    <span className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                </div>
                
                {/* Discount Hint */}
                {hasDiscounts && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Discounts Available
                                </h3>
                                <div className="mt-1 text-sm text-blue-800">
                                    <p>Your final amount will be recalculated after you provide participant information in the next steps.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Continue Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Processing...' : 'Start booking'}
            </button>
        </form>
    )
} 