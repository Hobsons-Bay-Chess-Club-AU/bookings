'use client'

import React, { useState } from 'react'
import { RefundTimelineItem, RefundValueType } from '@/lib/types/database'
import { HiExclamationTriangle } from 'react-icons/hi2'

interface TimelineBuilderProps {
    eventStartDate: string
    refundTimeline: RefundTimelineItem[]
    onChange: (timeline: RefundTimelineItem[]) => void
}

export default function TimelineBuilder({ eventStartDate, refundTimeline, onChange }: TimelineBuilderProps) {
    const [items, setItems] = useState<RefundTimelineItem[]>(
        refundTimeline.length > 0 ? refundTimeline : [{
            from_date: null,
            to_date: null,
            type: 'percentage',
            value: 100,
            description: 'Full refund'
        }]
    )

    const updateItems = (newItems: RefundTimelineItem[]) => {
        // Sort items by from_date (null dates go first)
        const sortedItems = [...newItems].sort((a, b) => {
            if (a.from_date === null) return -1
            if (b.from_date === null) return 1
            return new Date(a.from_date).getTime() - new Date(b.from_date).getTime()
        })

        setItems(sortedItems)
        onChange(sortedItems)
    }

    const addItem = () => {
        const lastItem = items[items.length - 1]
        const newItem: RefundTimelineItem = {
            from_date: lastItem?.to_date || null,
            to_date: null,
            type: 'percentage',
            value: 0,
            description: 'No refund'
        }
        updateItems([...items, newItem])
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) return // Keep at least one item
        const newItems = items.filter((_, i) => i !== index)
        updateItems(newItems)
    }

    const updateItem = (index: number, field: keyof RefundTimelineItem, value: unknown) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        updateItems(newItems.map(item => ({
            ...item,
            description: item.description?.replace(/"([^"]*)"/g, '&quot;$1&quot;')
        })))
    }

    const formatDateTime = (dateStr: string | null): string => {
        if (!dateStr) return ''
        return new Date(dateStr).toISOString().slice(0, 16)
    }

    const parseDateTime = (dateStr: string): string | null => {
        if (!dateStr) return null
        return new Date(dateStr).toISOString()
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Refund Timeline</h4>
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Add Period
                </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <HiExclamationTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                            Refund Timeline Tips
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Periods should not overlap and should be in chronological order</li>
                                <li>Leave dates empty for open-ended periods (e.g., &quot;from event creation&quot; or &quot;until event date&quot;)</li>
                                <li>Percentages are calculated based on the original booking amount</li>
                                <li>Fixed amounts are in AUD</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-4">
                            <h5 className="text-sm font-medium text-gray-900">
                                Refund Period {index + 1}
                            </h5>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    From Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formatDateTime(item.from_date)}
                                    onChange={(e) => updateItem(index, 'from_date', parseDateTime(e.target.value))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Leave empty for event creation"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty to start from event creation
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    To Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formatDateTime(item.to_date)}
                                    max={formatDateTime(eventStartDate)}
                                    onChange={(e) => updateItem(index, 'to_date', parseDateTime(e.target.value))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty to continue until event date
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Refund Type
                                </label>
                                <select
                                    value={item.type}
                                    onChange={(e) => updateItem(index, 'type', e.target.value as RefundValueType)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount (AUD)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {item.type === 'percentage' ? 'Percentage (%)' : 'Amount (AUD)'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={item.type === 'percentage' ? 100 : undefined}
                                    step={item.type === 'percentage' ? 1 : 0.01}
                                    value={item.value}
                                    onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value) || 0)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="e.g., &apos;Full refund&apos;, &apos;Partial refund&apos;, &apos;No refund&apos;"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Refund Policy Preview</h5>
                <div className="text-sm text-blue-800 space-y-1">
                    {items.map((item, index) => {
                        const fromText = item.from_date
                            ? new Date(item.from_date).toLocaleDateString()
                            : 'Event creation'
                        const toText = item.to_date
                            ? new Date(item.to_date).toLocaleDateString()
                            : 'Event date'
                        const valueText = item.type === 'percentage'
                            ? `${item.value}%`
                            : `$${item.value.toFixed(2)} AUD`

                        return (
                            <div key={index}>
                                <strong>{fromText} → {toText}:</strong> {valueText} refund
                                {item.description && ` (${item.description})`}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
