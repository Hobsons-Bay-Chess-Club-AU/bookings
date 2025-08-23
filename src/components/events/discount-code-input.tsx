'use client'

import { useState } from 'react'
import { HiTag, HiXMark, HiCheck } from 'react-icons/hi2'

interface DiscountCodeInputProps {
    eventId: string
    baseAmount: number
    quantity: number
    onDiscountApplied?: (discountInfo: {
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
    onDiscountRemoved?: () => void
    appliedDiscount?: {
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
    disabled?: boolean
}

export default function DiscountCodeInput({
    eventId,
    baseAmount,
    quantity,
    onDiscountApplied,
    onDiscountRemoved,
    appliedDiscount,
    disabled = false
}: DiscountCodeInputProps) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleApplyCode = async () => {
        if (!code.trim()) {
            setError('Please enter a discount code')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/events/${eventId}/apply-discount-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code.trim(),
                    baseAmount,
                    quantity
                })
            })

            const data = await response.json()

            if (response.ok) {
                onDiscountApplied?.(data)
                setCode('')
            } else {
                setError(data.error || 'Failed to apply discount code')
            }
        } catch (error) {
            console.error('Error applying discount code:', error)
            setError('Failed to apply discount code. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveCode = () => {
        onDiscountRemoved?.()
        setCode('')
        setError('')
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleApplyCode()
        }
    }

    if (appliedDiscount) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <HiCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                Discount Applied: {appliedDiscount.discount.name}
                            </p>
                            {appliedDiscount.discount.description && (
                                <p className="text-sm text-green-600 dark:text-green-300">
                                    {appliedDiscount.discount.description}
                                </p>
                            )}
                            <p className="text-sm text-green-600 dark:text-green-300">
                                -${appliedDiscount.discountAmount.toFixed(2)} off
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleRemoveCode}
                        disabled={disabled}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove discount code"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <HiTag className="h-5 w-5 text-gray-400" />
                <label htmlFor="discount-code" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Have a discount code?
                </label>
            </div>
            
            <div className="flex space-x-2">
                <input
                    type="text"
                    id="discount-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter code"
                    disabled={disabled || loading}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="button"
                    onClick={handleApplyCode}
                    disabled={disabled || loading || !code.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                    {loading ? 'Applying...' : 'Apply'}
                </button>
            </div>
            
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    )
}
