'use client'

import { useState } from 'react'
import { EventPricing, PricingType, MembershipType } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

interface PricingManagerProps {
    eventId: string
    initialPricing: EventPricing[]
}

export default function PricingManager({ eventId, initialPricing }: PricingManagerProps) {
    const [pricing, setPricing] = useState<EventPricing[]>(initialPricing)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pricing_type: 'regular' as PricingType,
        membership_type: 'all' as MembershipType,
        price: '',
        start_date: '',
        end_date: '',
        max_tickets: ''
    })

    const supabase = createClient()

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            pricing_type: 'regular',
            membership_type: 'all',
            price: '',
            start_date: '',
            end_date: '',
            max_tickets: ''
        })
        setIsAdding(false)
        setEditingId(null)
        setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const pricingData = {
                event_id: eventId,
                name: formData.name,
                description: formData.description || null,
                pricing_type: formData.pricing_type,
                membership_type: formData.membership_type,
                price: parseFloat(formData.price),
                start_date: formData.start_date,
                end_date: formData.end_date,
                max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : null
            }

            if (editingId) {
                // Update existing pricing
                const { data, error } = await supabase
                    .from('event_pricing')
                    .update(pricingData)
                    .eq('id', editingId)
                    .select()
                    .single()

                if (error) throw error

                setPricing(prev => prev.map(p => p.id === editingId ? data : p))
            } else {
                // Create new pricing
                const { data, error } = await supabase
                    .from('event_pricing')
                    .insert(pricingData)
                    .select()
                    .single()

                if (error) throw error

                setPricing(prev => [...prev, data])
            }

            resetForm()
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to save pricing')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (pricingItem: EventPricing) => {
        setFormData({
            name: pricingItem.name,
            description: pricingItem.description || '',
            pricing_type: pricingItem.pricing_type,
            membership_type: pricingItem.membership_type,
            price: pricingItem.price.toString(),
            start_date: pricingItem.start_date.slice(0, 16), // Format for datetime-local
            end_date: pricingItem.end_date.slice(0, 16),
            max_tickets: pricingItem.max_tickets?.toString() || ''
        })
        setEditingId(pricingItem.id)
        setIsAdding(true)
    }

    const handleToggleActive = async (pricingId: string, currentActive: boolean) => {
        try {
            setLoading(true)
            const { error } = await supabase
                .from('event_pricing')
                .update({ is_active: !currentActive })
                .eq('id', pricingId)

            if (error) throw error

            setPricing(prev => prev.map(p =>
                p.id === pricingId ? { ...p, is_active: !currentActive } : p
            ))
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update pricing status'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (pricingId: string) => {
        if (!confirm('Are you sure you want to delete this pricing tier?')) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from('event_pricing')
                .delete()
                .eq('id', pricingId)

            if (error) throw error

            setPricing(prev => prev.filter(p => p.id !== pricingId))
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete pricing'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const getPricingTypeColor = (type: PricingType) => {
        switch (type) {
            case 'early_bird': return 'bg-green-100 text-green-800'
            case 'regular': return 'bg-blue-100 text-blue-800'
            case 'late_bird': return 'bg-orange-100 text-orange-800'
            case 'special': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getMembershipTypeColor = (type: MembershipType) => {
        switch (type) {
            case 'member': return 'bg-yellow-100 text-yellow-800'
            case 'non_member': return 'bg-red-100 text-red-800'
            case 'all': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Pricing Tiers ({pricing.length})
                    </h2>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        disabled={loading}
                    >
                        Add Pricing Tier
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="p-6 border-b border-gray-200 bg-gray-50 text-gray-900">
                    <h3 className="text-lg font-medium  mb-4">
                        {editingId ? 'Edit Pricing Tier' : 'Add New Pricing Tier'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., Early Bird, Member Special"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price (AUD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Optional description of this pricing tier"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pricing Type
                                </label>
                                <select
                                    value={formData.pricing_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pricing_type: e.target.value as PricingType }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="early_bird">Early Bird</option>
                                    <option value="regular">Regular</option>
                                    <option value="late_bird">Late Bird</option>
                                    <option value="special">Special</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Membership
                                </label>
                                <select
                                    value={formData.membership_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, membership_type: e.target.value as MembershipType }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Users</option>
                                    <option value="member">Members Only</option>
                                    <option value="non_member">Non-Members Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Tickets
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_tickets}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional limit"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : (editingId ? 'Update Pricing' : 'Add Pricing')}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Pricing List */}
            <div className="divide-y divide-gray-200">
                {pricing.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-4 block">💰</span>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No pricing tiers yet
                        </h3>
                        <p className="text-gray-800 mb-6">
                            Add pricing tiers to enable dynamic pricing for your event.
                        </p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Add First Pricing Tier
                        </button>
                    </div>
                ) : (
                    pricing.map((pricingItem) => (
                        <div key={pricingItem.id} className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {pricingItem.name}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPricingTypeColor(pricingItem.pricing_type)}`}>
                                            {pricingItem.pricing_type.replace('_', ' ')}
                                        </span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMembershipTypeColor(pricingItem.membership_type)}`}>
                                            {pricingItem.membership_type === 'all' ? 'All Users' :
                                                pricingItem.membership_type === 'member' ? 'Members' : 'Non-Members'}
                                        </span>
                                        {!pricingItem.is_active && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Inactive
                                            </span>
                                        )}
                                    </div>

                                    {pricingItem.description && (
                                        <p className="text-sm text-gray-800 mb-3">
                                            {pricingItem.description}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-800 font-medium">Price:</span>
                                            <div className="font-semibold text-lg text-gray-900">AUD ${pricingItem.price.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-800 font-medium">Valid:</span>
                                            <div className="font-medium text-gray-900">
                                                {new Date(pricingItem.start_date).toLocaleDateString()} - {new Date(pricingItem.end_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-800 font-medium">Tickets Sold:</span>
                                            <div className="font-medium text-gray-900">
                                                {pricingItem.tickets_sold}
                                                {pricingItem.max_tickets && ` / ${pricingItem.max_tickets}`}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-800 font-medium">Status:</span>
                                            <div className={`font-medium ${pricingItem.is_active ? 'text-green-700' : 'text-gray-700'}`}>
                                                {pricingItem.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-6 flex flex-col space-y-2">
                                    <button
                                        onClick={() => handleEdit(pricingItem)}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        disabled={loading}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(pricingItem.id, pricingItem.is_active)}
                                        className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white ${pricingItem.is_active
                                            ? 'bg-yellow-600 hover:bg-yellow-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                        disabled={loading}
                                    >
                                        {pricingItem.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pricingItem.id)}
                                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                        disabled={loading}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}