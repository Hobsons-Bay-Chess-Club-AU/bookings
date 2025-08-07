'use client'

import { useState } from 'react'
import { RefundTimelineItem } from '@/lib/types/database'

interface RefundPolicyDisplayProps {
    refundTimeline: RefundTimelineItem[]
    eventStartDate: string
}

export default function RefundPolicyDisplay({ refundTimeline, eventStartDate }: RefundPolicyDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (!refundTimeline || refundTimeline.length === 0) {
        return null
    }

    const calculateRefundForDate = (date: Date): { value: number; type: 'percentage' | 'fixed'; description?: string } => {
        const currentTime = date.getTime()

        for (const item of refundTimeline) {
            const fromTime = item.from_date ? new Date(item.from_date).getTime() : 0
            const toTime = item.to_date ? new Date(item.to_date).getTime() : new Date(eventStartDate).getTime()

            if (currentTime >= fromTime && currentTime <= toTime) {
                return {
                    value: item.value,
                    type: item.type,
                    description: item.description
                }
            }
        }

        // Default to last item if no match found
        const lastItem = refundTimeline[refundTimeline.length - 1]
        return {
            value: lastItem.value,
            type: lastItem.type,
            description: lastItem.description
        }
    }

    const getCurrentRefund = () => {
        return calculateRefundForDate(new Date())
    }

    const formatRefundValue = (value: number, type: 'percentage' | 'fixed') => {
        if (type === 'percentage') {
            return `${value}%`
        }
        return `$${value.toFixed(2)} AUD`
    }

    const formatDateRange = (fromDate: string | null, toDate: string | null) => {
        const fromText = fromDate
            ? new Date(fromDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : 'Event creation'

        const toText = toDate
            ? new Date(toDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : 'Event date'

        return `${fromText} → ${toText}`
    }

    const currentRefund = getCurrentRefund()
    const hasRefunds = currentRefund.value > 0

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Refund Policy
                </h3>
                <div className="ml-2">
                    <svg
                        className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4">
                    {/* Current refund status */}
                    <div className={`p-4 rounded-lg mb-4 ${hasRefunds
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                        <div className="flex items-center">
                            <div className={`flex-shrink-0 ${hasRefunds ? 'text-green-400' : 'text-red-400'}`}>
                                {hasRefunds ? (
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <h4 className={`text-sm font-medium ${hasRefunds ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                                    }`}>
                                    Current Refund Status
                                </h4>
                                <p className={`text-sm ${hasRefunds ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {hasRefunds ? (
                                        <>
                                            You can get a {formatRefundValue(currentRefund.value, currentRefund.type)} refund
                                            {currentRefund.description && ` (${currentRefund.description})`}
                                        </>
                                    ) : (
                                        <>
                                            No refund available at this time
                                            {currentRefund.description && ` (${currentRefund.description})`}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Full refund schedule */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Full Refund Schedule</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="space-y-2">
                                {refundTimeline.map((item, index) => {
                                    const refundValue = formatRefundValue(item.value, item.type)
                                    const dateRange = formatDateRange(item.from_date, item.to_date)
                                    const isCurrentPeriod = (() => {
                                        const now = new Date().getTime()
                                        const fromTime = item.from_date ? new Date(item.from_date).getTime() : 0
                                        const toTime = item.to_date ? new Date(item.to_date).getTime() : new Date(eventStartDate).getTime()
                                        return now >= fromTime && now <= toTime
                                    })()

                                    return (
                                        <div
                                            key={index}
                                            className={`flex justify-between items-center py-2 px-3 rounded ${isCurrentPeriod
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                                                    : 'bg-white dark:bg-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                {isCurrentPeriod && (
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                                                )}
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {dateRange}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-medium ${item.value > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {refundValue} refund
                                                </span>
                                                {item.description && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                    Refund Information
                                </h4>
                                <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Refunds are processed automatically when requested</li>
                                        <li>Percentage refunds are calculated from your original booking amount</li>
                                        <li>Processing time: 5-10 business days</li>
                                        <li>Contact the organizer if you have questions about the refund policy</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
