'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, EventDiscount, ParticipantDiscountRule, SeatDiscountRule } from '@/lib/types/database'
import { HiPlus, HiPencil, HiTrash, HiX, HiInformationCircle } from 'react-icons/hi'

interface DiscountFormData {
    name: string
    description: string
    discount_type: 'code' | 'participant_based' | 'seat_based'
    value_type: 'percentage' | 'fixed'
    value: number
    code: string
    start_date: string
    end_date: string
    is_active: boolean
    max_uses: number
    min_quantity: number
    max_quantity: number
    rules: ParticipantDiscountRule[]
    seat_rules: SeatDiscountRule[]
}

interface EventDiscountsPageClientProps {
    eventId: string
}

export default function EventDiscountsPageClient({ eventId }: EventDiscountsPageClientProps) {
    const [event, setEvent] = useState<Event | null>(null)
    const [discounts, setDiscounts] = useState<EventDiscount[]>([])
    const [availableEvents, setAvailableEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingDiscount, setEditingDiscount] = useState<EventDiscount | null>(null)
    const [formData, setFormData] = useState<DiscountFormData>({
        name: '',
        description: '',
        discount_type: 'participant_based',
        value_type: 'percentage',
        value: 0,
        code: '',
        start_date: '',
        end_date: '',
        is_active: true,
        max_uses: 0,
        min_quantity: 1,
        max_quantity: 0,
        rules: [],
        seat_rules: []
    })
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState('')

    const supabase = createClient()

    const fetchEventAndDiscounts = useCallback(async () => {
        try {
            setLoading(true)
            
            // Fetch event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single()

            if (eventError) {
                throw new Error('Event not found')
            }

            setEvent(eventData)

            // Fetch available events for previous event selection (excluding current event)
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('id, title, start_date, status')
                .eq('organizer_id', eventData.organizer_id)
                .neq('id', eventId)
                .order('start_date', { ascending: false })

            if (eventsError) {
                console.error('Error fetching available events:', eventsError)
            } else {
                console.log('Available events for discount:', eventsData)
                setAvailableEvents((eventsData as Event[]) || [])
            }

            // Fetch discounts
            const { data: discountsData, error: discountsError } = await supabase
                .from('event_discounts')
                .select(`
                    *,
                    rules:participant_discount_rules(*),
                    seat_rules:seat_discount_rules(*)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (discountsError) {
                console.error('Error fetching discounts:', discountsError)
            } else {
                setDiscounts(discountsData || [])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [eventId, supabase])

    useEffect(() => {
        fetchEventAndDiscounts()
    }, [fetchEventAndDiscounts])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError('')

        try {
            if (editingDiscount) {
                // Update existing discount
                const { error: discountError } = await supabase
                    .from('event_discounts')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        discount_type: formData.discount_type,
                        value_type: formData.value_type,
                        value: formData.value,
                        code: formData.code,
                        start_date: formData.start_date || null,
                        end_date: formData.end_date || null,
                        is_active: formData.is_active,
                        max_uses: formData.max_uses || null,
                        min_quantity: formData.min_quantity || null,
                        max_quantity: formData.max_quantity || null
                    })
                    .eq('id', editingDiscount.id)

                if (discountError) throw discountError

                // Update rules
                if (formData.discount_type === 'participant_based') {
                    // Delete existing rules
                    await supabase
                        .from('participant_discount_rules')
                        .delete()
                        .eq('discount_id', editingDiscount.id)

                    // Insert new rules
                    if (formData.rules.length > 0) {
                        const { error: rulesError } = await supabase
                            .from('participant_discount_rules')
                            .insert(formData.rules.map(rule => ({
                                ...rule,
                                discount_id: editingDiscount.id
                            })))

                        if (rulesError) throw rulesError
                    }
                }

                // Update seat rules
                if (formData.discount_type === 'seat_based') {
                    // Delete existing seat rules
                    await supabase
                        .from('seat_discount_rules')
                        .delete()
                        .eq('discount_id', editingDiscount.id)

                    // Insert new seat rules
                    if (formData.seat_rules.length > 0) {
                        const { error: seatRulesError } = await supabase
                            .from('seat_discount_rules')
                            .insert(formData.seat_rules.map(rule => ({
                                ...rule,
                                discount_id: editingDiscount.id
                            })))

                        if (seatRulesError) throw seatRulesError
                    }
                }
            } else {
                // Create new discount
                const { data: newDiscount, error: discountError } = await supabase
                    .from('event_discounts')
                    .insert({
                        event_id: eventId,
                        name: formData.name,
                        description: formData.description,
                        discount_type: formData.discount_type,
                        value_type: formData.value_type,
                        value: formData.value,
                        code: formData.code,
                        start_date: formData.start_date || null,
                        end_date: formData.end_date || null,
                        is_active: formData.is_active,
                        max_uses: formData.max_uses || null,
                        min_quantity: formData.min_quantity || null,
                        max_quantity: formData.max_quantity || null
                    })
                    .select()
                    .single()

                if (discountError) throw discountError

                // Insert rules
                if (formData.discount_type === 'participant_based' && formData.rules.length > 0) {
                    const { error: rulesError } = await supabase
                        .from('participant_discount_rules')
                        .insert(formData.rules.map(rule => ({
                            ...rule,
                            discount_id: newDiscount.id
                        })))

                    if (rulesError) throw rulesError
                }

                // Insert seat rules
                if (formData.discount_type === 'seat_based' && formData.seat_rules.length > 0) {
                    const { error: seatRulesError } = await supabase
                        .from('seat_discount_rules')
                        .insert(formData.seat_rules.map(rule => ({
                            ...rule,
                            discount_id: newDiscount.id
                        })))

                    if (seatRulesError) throw seatRulesError
                }
            }

            await fetchEventAndDiscounts()
            resetForm()
            setShowForm(false)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setFormLoading(false)
        }
    }

    const handleDelete = async (discountId: string) => {
        if (!confirm('Are you sure you want to delete this discount?')) return

        try {
            const { error } = await supabase
                .from('event_discounts')
                .delete()
                .eq('id', discountId)

            if (error) throw error

            await fetchEventAndDiscounts()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        }
    }

    const handleEdit = (discount: EventDiscount) => {
        setEditingDiscount(discount)
        setFormData({
            name: discount.name,
            description: discount.description || '',
            discount_type: discount.discount_type as 'code' | 'participant_based' | 'seat_based',
            value_type: discount.value_type as 'percentage' | 'fixed',
            value: discount.value,
            code: discount.code || '',
            start_date: discount.start_date ? discount.start_date.slice(0, 16) : '',
            end_date: discount.end_date ? discount.end_date.slice(0, 16) : '',
            is_active: discount.is_active,
            max_uses: discount.max_uses || 0,
            min_quantity: discount.min_quantity || 1,
            max_quantity: discount.max_quantity || 0,
            rules: discount.rules || [],
            seat_rules: discount.seat_rules || []
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setEditingDiscount(null)
        setFormData({
            name: '',
            description: '',
            discount_type: 'participant_based',
            value_type: 'percentage',
            value: 0,
            code: '',
            start_date: '',
            end_date: '',
            is_active: true,
            max_uses: 0,
            min_quantity: 1,
            max_quantity: 0,
            rules: [],
            seat_rules: []
        })
        setFormError('')
    }

    const addRule = () => {
        setFormData(prev => ({
            ...prev,
            rules: [...prev.rules, {
                rule_type: 'previous_event',
                field_name: 'first_name,last_name',
                field_value: 'any',
                operator: 'equals'
            } as ParticipantDiscountRule]
        }))
    }

    const updateRule = (index: number, field: keyof ParticipantDiscountRule, value: string | number | boolean | undefined) => {
        setFormData(prev => ({
            ...prev,
            rules: prev.rules.map((rule, i) => 
                i === index ? { ...rule, [field]: value } : rule
            )
        }))
    }

    const removeRule = (index: number) => {
        setFormData(prev => ({
            ...prev,
            rules: prev.rules.filter((_, i) => i !== index)
        }))
    }

    const addSeatRule = () => {
        setFormData(prev => ({
            ...prev,
            seat_rules: [...prev.seat_rules, {
                min_seats: 2,
                max_seats: undefined,
                discount_amount: 10,
                discount_percentage: undefined
            } as SeatDiscountRule]
        }))
    }

    const updateSeatRule = (index: number, field: keyof SeatDiscountRule, value: string | number | boolean | undefined) => {
        setFormData(prev => ({
            ...prev,
            seat_rules: prev.seat_rules.map((rule, i) => 
                i === index ? { ...rule, [field]: value } : rule
            )
        }))
    }

    const removeSeatRule = (index: number) => {
        setFormData(prev => ({
            ...prev,
            seat_rules: prev.seat_rules.filter((_, i) => i !== index)
        }))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="space-y-4">
                            <div className="h-20 bg-gray-200 rounded"></div>
                            <div className="h-20 bg-gray-200 rounded"></div>
                            <div className="h-20 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <HiX className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">{error}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Event Discounts</h1>
                    <p className="mt-2 text-gray-600">
                        Manage discounts for &quot;{event.title}&quot;
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">Discounts</h2>
                            <button
                                onClick={() => {
                                    resetForm()
                                    setShowForm(true)
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                <HiPlus className="h-4 w-4 mr-2" />
                                Add Discount
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {discounts.length === 0 ? (
                            <div className="text-center py-12">
                                <HiInformationCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No discounts</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Get started by creating your first discount.
                                </p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => {
                                            resetForm()
                                            setShowForm(true)
                                        }}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        <HiPlus className="h-4 w-4 mr-2" />
                                        Add Discount
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {discounts.map((discount) => (
                                    <div key={discount.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium text-gray-900">{discount.name}</h3>
                                                {discount.description && (
                                                    <p className="mt-1 text-sm text-gray-600">{discount.description}</p>
                                                )}
                                                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                                    <span>Type: {discount.discount_type === 'code' ? 'Code' : discount.discount_type === 'participant_based' ? 'Participant-Based' : 'Seat-Based'}</span>
                                                    <span>Value: {discount.value}{discount.value_type === 'percentage' ? '%' : '$'}</span>
                                                    <span>Status: {discount.is_active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEdit(discount)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    <HiPencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(discount.id)}
                                                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                                >
                                                    <HiTrash className="h-4 w-4 mr-1" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
                                </h3>
                                
                                {formError && (
                                    <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                                        <div className="text-sm text-red-700">{formError}</div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                                            <select
                                                value={formData.discount_type}
                                                onChange={(e) => setFormData(prev => ({ 
                                                    ...prev, 
                                                    discount_type: e.target.value as 'code' | 'participant_based' | 'seat_based',
                                                    rules: e.target.value === 'participant_based' ? prev.rules : [],
                                                    seat_rules: e.target.value === 'seat_based' ? prev.seat_rules : []
                                                }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="code">Code</option>
                                                <option value="participant_based">Participant-Based</option>
                                                <option value="seat_based">Seat-Based</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Value Type</label>
                                            <select
                                                value={formData.value_type}
                                                onChange={(e) => setFormData(prev => ({ ...prev, value_type: e.target.value as 'percentage' | 'fixed' }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="percentage">Percentage</option>
                                                <option value="fixed">Fixed Amount</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Value</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.value}
                                                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {formData.discount_type === 'code' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Discount Code</label>
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Min Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.min_quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 1 }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.max_quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: parseInt(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Uses</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.max_uses}
                                                onChange={(e) => setFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-900">Active</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            rows={3}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {formData.discount_type === 'participant_based' && (
                                        <div className="border-t pt-6">
                                            <h4 className="text-lg font-medium text-gray-900 mb-4">Participant Rules</h4>
                                            
                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                                                <div className="flex">
                                                    <HiInformationCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                                                    <div className="ml-3">
                                                        <h5 className="text-sm font-medium text-blue-800">How to create a Participant-Based discount:</h5>
                                                        <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside space-y-1">
                                                            <li>Click &quot;Add Rule&quot; below</li>
                                                            <li>Select &quot;Previous Event&quot; as the rule type</li>
                                                            <li>Choose which event to check for previous participation</li>
                                                            <li>Select which participant fields to match (name, email, DOB)</li>
                                                            <li>Choose the participation status requirement</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            </div>

                                            {availableEvents.length === 0 ? (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                                                    <div className="flex">
                                                        <HiInformationCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                                                        <div className="ml-3">
                                                            <p className="text-sm text-yellow-800">
                                                                No previous events found. You need to have other events to create participant-based discounts.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mb-4">
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        Available events for previous participation check: <strong>{availableEvents.length}</strong>
                                                    </p>
                                                </div>
                                            )}

                                            {formData.rules.map((rule, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h5 className="text-sm font-medium text-gray-900">Rule {index + 1}</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRule(index)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <HiTrash className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Rule Type</label>
                                                            <select
                                                                value={rule.rule_type}
                                                                onChange={(e) => updateRule(index, 'rule_type', e.target.value)}
                                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                            >
                                                                <option value="previous_event">Previous Event</option>
                                                                <option value="custom">Custom Field</option>
                                                            </select>
                                                        </div>

                                                        {rule.rule_type === 'previous_event' && (
                                                            <>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Related Event</label>
                                                                    <select
                                                                        value={rule.related_event_id || ''}
                                                                        onChange={(e) => updateRule(index, 'related_event_id', e.target.value)}
                                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    >
                                                                        <option value="">Select an event</option>
                                                                        {availableEvents.map((event) => (
                                                                            <option key={event.id} value={event.id}>
                                                                                {event.title} ({new Date(event.start_date).toLocaleDateString()})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Match Fields</label>
                                                                    <div className="mt-2 space-y-2">
                                                                        {['first_name', 'last_name', 'email', 'date_of_birth'].map((field) => (
                                                                            <label key={field} className="flex items-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={rule.field_name?.includes(field) || false}
                                                                                    onChange={(e) => {
                                                                                        const currentFields = rule.field_name?.split(',').filter(f => f.trim() !== '') || []
                                                                                        const newFields = e.target.checked
                                                                                            ? [...currentFields, field]
                                                                                            : currentFields.filter(f => f !== field)
                                                                                        updateRule(index, 'field_name', newFields.join(','))
                                                                                    }}
                                                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                                />
                                                                                <span className="ml-2 text-sm text-gray-900 capitalize">{field.replace('_', ' ')}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Participation Status</label>
                                                                    <select
                                                                        value={rule.field_value || 'any'}
                                                                        onChange={(e) => updateRule(index, 'field_value', e.target.value)}
                                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    >
                                                                        <option value="any">Any status</option>
                                                                        <option value="confirmed">Confirmed only</option>
                                                                        <option value="verified">Verified only</option>
                                                                    </select>
                                                                </div>
                                                            </>
                                                        )}

                                                        {rule.rule_type === 'custom' && (
                                                            <>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Field Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={rule.field_name || ''}
                                                                        onChange={(e) => updateRule(index, 'field_name', e.target.value)}
                                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Operator</label>
                                                                    <select
                                                                        value={rule.operator || 'equals'}
                                                                        onChange={(e) => updateRule(index, 'operator', e.target.value)}
                                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    >
                                                                        <option value="equals">Equals</option>
                                                                        <option value="contains">Contains</option>
                                                                        <option value="starts_with">Starts with</option>
                                                                        <option value="ends_with">Ends with</option>
                                                                    </select>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700">Field Value</label>
                                                                    <input
                                                                        type="text"
                                                                        value={rule.field_value || ''}
                                                                        onChange={(e) => updateRule(index, 'field_value', e.target.value)}
                                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={addRule}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <HiPlus className="h-4 w-4 mr-2" />
                                                Add Rule
                                            </button>
                                        </div>
                                    )}

                                    {formData.discount_type === 'seat_based' && (
                                        <div className="border-t pt-6">
                                            <h4 className="text-lg font-medium text-gray-900 mb-4">Seat-Based Rules</h4>
                                            
                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                                                <div className="flex">
                                                    <HiInformationCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                                                    <div className="ml-3">
                                                        <h5 className="text-sm font-medium text-blue-800">How seat-based discounts work:</h5>
                                                        <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside space-y-1">
                                                            <li>Set minimum and maximum seats for each rule</li>
                                                            <li>Choose between fixed amount or percentage discount</li>
                                                            <li>For percentage discounts, it applies to the total amount</li>
                                                            <li>For fixed amounts, it&apos;s a flat discount per booking</li>
                                                            <li>The system will apply the best matching rule</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            </div>

                                            {formData.seat_rules.map((rule, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h5 className="text-sm font-medium text-gray-900">Seat Rule {index + 1}</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSeatRule(index)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <HiTrash className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Minimum Seats</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={rule.min_seats}
                                                                onChange={(e) => updateSeatRule(index, 'min_seats', parseInt(e.target.value) || 1)}
                                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Maximum Seats (optional)</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={rule.max_seats || ''}
                                                                onChange={(e) => updateSeatRule(index, 'max_seats', e.target.value ? parseInt(e.target.value) : undefined)}
                                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Fixed Discount Amount ($)</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={rule.discount_amount}
                                                                onChange={(e) => updateSeatRule(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Percentage Discount (%)</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                value={rule.discount_percentage || ''}
                                                                onChange={(e) => updateSeatRule(index, 'discount_percentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={addSeatRule}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <HiPlus className="h-4 w-4 mr-2" />
                                                Add Seat Rule
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-3 pt-6 border-t">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForm(false)
                                                resetForm()
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {formLoading ? 'Saving...' : (editingDiscount ? 'Update Discount' : 'Create Discount')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 