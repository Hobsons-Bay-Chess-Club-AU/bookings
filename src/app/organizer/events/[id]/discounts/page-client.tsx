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
                setDiscounts([])
            } else {
                setDiscounts((discountsData as EventDiscount[]) || [])
            }
        } catch (err) {
            console.error('Error fetching data:', err)
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
            const discountData = {
                event_id: eventId,
                name: formData.name,
                description: formData.description,
                discount_type: formData.discount_type,
                value_type: formData.value_type,
                value: formData.value,
                code: formData.code,
                start_date: formData.start_date,
                end_date: formData.end_date,
                is_active: formData.is_active,
                max_uses: formData.max_uses,
                min_quantity: formData.min_quantity,
                max_quantity: formData.max_quantity
            }

            if (editingDiscount) {
                // Update existing discount
                const { error: updateError } = await supabase
                    .from('event_discounts')
                    .update(discountData)
                    .eq('id', editingDiscount.id)

                if (updateError) {
                    throw new Error(updateError.message)
                }

                // Update rules if they exist
                if (formData.rules.length > 0) {
                    // Delete existing rules
                    await supabase
                        .from('participant_discount_rules')
                        .delete()
                        .eq('discount_id', editingDiscount.id)

                    // Insert new rules
                    const rulesToInsert = formData.rules.map(rule => ({
                        ...rule,
                        discount_id: editingDiscount.id
                    }))

                    const { error: rulesError } = await supabase
                        .from('participant_discount_rules')
                        .insert(rulesToInsert)

                    if (rulesError) {
                        console.error('Error updating rules:', rulesError)
                    }
                }

                // Update seat rules if they exist
                if (formData.seat_rules.length > 0) {
                    // Delete existing seat rules
                    await supabase
                        .from('seat_discount_rules')
                        .delete()
                        .eq('discount_id', editingDiscount.id)

                    // Insert new seat rules
                    const seatRulesToInsert = formData.seat_rules.map(rule => ({
                        ...rule,
                        discount_id: editingDiscount.id
                    }))

                    const { error: seatRulesError } = await supabase
                        .from('seat_discount_rules')
                        .insert(seatRulesToInsert)

                    if (seatRulesError) {
                        console.error('Error updating seat rules:', seatRulesError)
                    }
                }
            } else {
                // Create new discount
                const { data: newDiscount, error: createError } = await supabase
                    .from('event_discounts')
                    .insert(discountData)
                    .select()
                    .single()

                if (createError) {
                    throw new Error(createError.message)
                }

                // Insert rules if they exist
                if (formData.rules.length > 0) {
                    const rulesToInsert = formData.rules.map(rule => ({
                        ...rule,
                        discount_id: newDiscount.id
                    }))

                    const { error: rulesError } = await supabase
                        .from('participant_discount_rules')
                        .insert(rulesToInsert)

                    if (rulesError) {
                        console.error('Error creating rules:', rulesError)
                    }
                }

                // Insert seat rules if they exist
                if (formData.seat_rules.length > 0) {
                    const seatRulesToInsert = formData.seat_rules.map(rule => ({
                        ...rule,
                        discount_id: newDiscount.id
                    }))

                    const { error: seatRulesError } = await supabase
                        .from('seat_discount_rules')
                        .insert(seatRulesToInsert)

                    if (seatRulesError) {
                        console.error('Error creating seat rules:', seatRulesError)
                    }
                }
            }

            // Refresh data
            await fetchEventAndDiscounts()
            
            // Reset form and close modal
            resetForm()
            setShowForm(false)
            setEditingDiscount(null)
        } catch (err) {
            console.error('Error saving discount:', err)
            setFormError(err instanceof Error ? err.message : 'An error occurred while saving the discount')
        } finally {
            setFormLoading(false)
        }
    }

    const handleDelete = async (discountId: string) => {
        if (!confirm('Are you sure you want to delete this discount?')) {
            return
        }

        try {
            const { error } = await supabase
                .from('event_discounts')
                .delete()
                .eq('id', discountId)

            if (error) {
                throw new Error(error.message)
            }

            await fetchEventAndDiscounts()
        } catch (err) {
            console.error('Error deleting discount:', err)
            alert(err instanceof Error ? err.message : 'An error occurred while deleting the discount')
        }
    }

    const handleEdit = (discount: EventDiscount) => {
        setFormData({
            name: discount.name,
            description: discount.description || '',
            discount_type: discount.discount_type,
            value_type: discount.value_type,
            value: discount.value,
            code: discount.code || '',
            start_date: discount.start_date,
            end_date: discount.end_date,
            is_active: discount.is_active,
            max_uses: discount.max_uses,
            min_quantity: discount.min_quantity,
            max_quantity: discount.max_quantity,
            rules: discount.rules || [],
            seat_rules: discount.seat_rules || []
        })
        setEditingDiscount(discount)
        setShowForm(true)
    }

    const resetForm = () => {
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
        setEditingDiscount(null)
    }

    const addRule = () => {
        setFormData(prev => ({
            ...prev,
            rules: [...prev.rules, {
                id: `temp-${Date.now()}`,
                discount_id: '',
                previous_event_id: '',
                min_participants: 1,
                max_participants: 0,
                discount_percentage: 0
            }]
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
                id: `temp-${Date.now()}`,
                discount_id: '',
                seat_number: '',
                discount_percentage: 0
            }]
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading discounts...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Event not found</h1>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Discounts</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage discounts for &quot;{event.title}&quot;
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Discounts</h2>
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
                                <HiInformationCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No discounts</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                                    <div key={discount.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{discount.name}</h3>
                                                {discount.description && (
                                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{discount.description}</p>
                                                )}
                                                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <span>Type: {discount.discount_type === 'code' ? 'Code' : discount.discount_type === 'participant_based' ? 'Participant-Based' : 'Seat-Based'}</span>
                                                    <span>Value: {discount.value}{discount.value_type === 'percentage' ? '%' : '$'}</span>
                                                    <span>Status: {discount.is_active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEdit(discount)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                >
                                                    <HiPencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(discount.id)}
                                                    className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                    {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
                                </h3>
                                
                                {formError && (
                                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                                        <div className="text-sm text-red-700 dark:text-red-300">{formError}</div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                                            <select
                                                value={formData.discount_type}
                                                onChange={(e) => setFormData(prev => ({ 
                                                    ...prev, 
                                                    discount_type: e.target.value as 'code' | 'participant_based' | 'seat_based',
                                                    rules: e.target.value === 'participant_based' ? prev.rules : [],
                                                    seat_rules: e.target.value === 'seat_based' ? prev.seat_rules : []
                                                }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="code">Code</option>
                                                <option value="participant_based">Participant-Based</option>
                                                <option value="seat_based">Seat-Based</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value Type</label>
                                            <select
                                                value={formData.value_type}
                                                onChange={(e) => setFormData(prev => ({ ...prev, value_type: e.target.value as 'percentage' | 'fixed' }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="percentage">Percentage</option>
                                                <option value="fixed">Fixed Amount</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.value}
                                                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {formData.discount_type === 'code' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Code</label>
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.min_quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 1 }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.max_quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: parseInt(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Uses</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.max_uses}
                                                onChange={(e) => setFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 0 }))}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                rows={3}
                                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="is_active"
                                                    checked={formData.is_active}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                                />
                                                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                                    Active
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Participant-Based Rules */}
                                    {formData.discount_type === 'participant_based' && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Participant-Based Rules</h4>
                                            <div className="space-y-4">
                                                {formData.rules.map((rule, index) => (
                                                    <div key={rule.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Previous Event</label>
                                                                <select
                                                                    value={rule.previous_event_id}
                                                                    onChange={(e) => updateRule(index, 'previous_event_id', e.target.value)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                >
                                                                    <option value="">Select an event</option>
                                                                    {availableEvents.map(event => (
                                                                        <option key={event.id} value={event.id}>
                                                                            {event.title}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Participants</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={rule.min_participants}
                                                                    onChange={(e) => updateRule(index, 'min_participants', parseInt(e.target.value) || 1)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Participants</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={rule.max_participants}
                                                                    onChange={(e) => updateRule(index, 'max_participants', parseInt(e.target.value) || 0)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Percentage</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.01"
                                                                    value={rule.discount_percentage}
                                                                    onChange={(e) => updateRule(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2 flex items-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeRule(index)}
                                                                    className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                >
                                                                    <HiTrash className="h-4 w-4 mr-1" />
                                                                    Remove Rule
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addRule}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                >
                                                    <HiPlus className="h-4 w-4 mr-2" />
                                                    Add Rule
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Seat-Based Rules */}
                                    {formData.discount_type === 'seat_based' && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Seat-Based Rules</h4>
                                            <div className="space-y-4">
                                                {formData.seat_rules.map((rule, index) => (
                                                    <div key={rule.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seat Number</label>
                                                                <input
                                                                    type="text"
                                                                    value={rule.seat_number}
                                                                    onChange={(e) => updateSeatRule(index, 'seat_number', e.target.value)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Percentage</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.01"
                                                                    value={rule.discount_percentage}
                                                                    onChange={(e) => updateSeatRule(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSeatRule(index)}
                                                                    className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                >
                                                                    <HiTrash className="h-4 w-4 mr-1" />
                                                                    Remove Rule
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addSeatRule}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                >
                                                    <HiPlus className="h-4 w-4 mr-2" />
                                                    Add Seat Rule
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetForm()
                                                setShowForm(false)
                                            }}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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