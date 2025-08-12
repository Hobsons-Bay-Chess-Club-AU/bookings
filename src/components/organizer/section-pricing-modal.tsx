'use client'

import { useState, useEffect, useCallback } from 'react'
import { EventSection, SectionPricing, PricingType, MembershipType } from '@/lib/types/database'
import { HiPlus, HiTrash, HiPencil } from 'react-icons/hi2'

interface SectionPricingModalProps {
    section: EventSection
    onClose: () => void
    onPricingUpdated: () => void
}

export default function SectionPricingModal({ section, onClose, onPricingUpdated }: SectionPricingModalProps) {
    const [pricingOptions, setPricingOptions] = useState<SectionPricing[]>([])
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingPricing, setEditingPricing] = useState<SectionPricing | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Fetch existing pricing options
    const fetchPricing = useCallback(async () => {
        try {
            const response = await fetch(`/api/sections/${section.id}/pricing`)
            if (!response.ok) {
                throw new Error('Failed to fetch pricing')
            }
            const data = await response.json()
            setPricingOptions(data)
        } catch (error) {
            console.error('Error fetching pricing:', error)
            setError('Failed to load pricing options')
        }
    }, [section.id])

    // Load pricing on mount
    useEffect(() => {
        fetchPricing()
    }, [fetchPricing])

    const handleAddPricing = async (pricingData: Partial<SectionPricing>) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/sections/${section.id}/pricing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pricingData),
            })

            if (!response.ok) {
                throw new Error('Failed to create pricing option')
            }

            await fetchPricing()
            setShowAddForm(false)
            onPricingUpdated()
        } catch (error) {
            console.error('Error creating pricing:', error)
            setError('Failed to create pricing option')
        } finally {
            setLoading(false)
        }
    }

    const handleDeletePricing = async (pricingId: string) => {
        if (!confirm('Are you sure you want to delete this pricing option?')) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`/api/sections/${section.id}/pricing/${pricingId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete pricing option')
            }

            await fetchPricing()
            onPricingUpdated()
        } catch (error) {
            console.error('Error deleting pricing:', error)
            setError('Failed to delete pricing option')
        } finally {
            setLoading(false)
        }
    }

    const handleEditPricing = async (pricingData: Partial<SectionPricing>) => {
        if (!editingPricing) return

        setLoading(true)
        try {
            const response = await fetch(`/api/sections/${section.id}/pricing/${editingPricing.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pricingData),
            })

            if (!response.ok) {
                throw new Error('Failed to update pricing option')
            }

            await fetchPricing()
            setEditingPricing(null)
            onPricingUpdated()
        } catch (error) {
            console.error('Error updating pricing:', error)
            setError('Failed to update pricing option')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Manage Pricing - {section.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded">
                        {error}
                    </div>
                )}

                {/* Pricing Options List */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Pricing Options ({pricingOptions.length})
                        </h3>
                        <button
                            onClick={() => setShowAddForm(true)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <HiPlus className="h-4 w-4 mr-1" />
                            Add Pricing
                        </button>
                    </div>

                    {pricingOptions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No pricing options configured.</p>
                            <p className="text-sm mt-2">Add pricing options to make this section bookable.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pricingOptions.map((pricing) => (
                                <div key={pricing.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {pricing.name}
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
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {pricing.description}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {pricing.max_tickets ? `${pricing.tickets_sold || 0} / ${pricing.max_tickets} tickets sold` : 'Unlimited tickets'}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                    ${pricing.price}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {pricing.membership_type === 'all' ? 'All members' : pricing.membership_type}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEditingPricing(pricing)}
                                                disabled={loading}
                                                className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                                title="Edit pricing option"
                                            >
                                                <HiPencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePricing(pricing.id)}
                                                disabled={loading}
                                                className="inline-flex items-center px-2 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                                title="Delete pricing option"
                                            >
                                                <HiTrash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Pricing Form */}
                {showAddForm && (
                    <AddPricingForm
                        onSubmit={handleAddPricing}
                        onCancel={() => setShowAddForm(false)}
                        loading={loading}
                    />
                )}

                {/* Edit Pricing Form */}
                {editingPricing && (
                    <EditPricingForm
                        pricing={editingPricing}
                        onSubmit={handleEditPricing}
                        onCancel={() => setEditingPricing(null)}
                        loading={loading}
                    />
                )}

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

interface EditPricingFormProps {
    pricing: SectionPricing
    onSubmit: (pricingData: Partial<SectionPricing>) => void
    onCancel: () => void
    loading: boolean
}

function EditPricingForm({ pricing, onSubmit, onCancel, loading }: EditPricingFormProps) {
    const [formData, setFormData] = useState({
        name: pricing.name,
        description: pricing.description || '',
        pricing_type: pricing.pricing_type as string,
        membership_type: pricing.membership_type as string,
        price: pricing.price.toString(),
        start_date: new Date(pricing.start_date).toISOString().slice(0, 16),
        end_date: new Date(pricing.end_date).toISOString().slice(0, 16),
        max_tickets: pricing.max_tickets ? pricing.max_tickets.toString() : ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            ...formData,
            price: parseFloat(formData.price),
            pricing_type: formData.pricing_type as PricingType,
            membership_type: formData.membership_type as MembershipType,
            max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : undefined
        })
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Edit Pricing Option: {pricing.name}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., Regular Admission"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Price *
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="25.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Pricing Type
                        </label>
                        <select
                            value={formData.pricing_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, pricing_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="regular">Regular</option>
                            <option value="early_bird">Early Bird</option>
                            <option value="late_bird">Late Bird</option>
                            <option value="special">Special</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Membership Type
                        </label>
                        <select
                            value={formData.membership_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, membership_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Members</option>
                            <option value="member">Members Only</option>
                            <option value="non_member">Non-Members Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Tickets
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.max_tickets}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Leave empty for unlimited"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Start Date *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            End Date *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Pricing'}
                    </button>
                </div>
            </form>
        </div>
    )
}

interface AddPricingFormProps {
    onSubmit: (pricingData: Partial<SectionPricing>) => void
    onCancel: () => void
    loading: boolean
}

function AddPricingForm({ onSubmit, onCancel, loading }: AddPricingFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pricing_type: 'regular',
        membership_type: 'all',
        price: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        max_tickets: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            ...formData,
            price: parseFloat(formData.price),
            pricing_type: formData.pricing_type as PricingType,
            membership_type: formData.membership_type as MembershipType,
            max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : undefined
        })
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Add Pricing Option
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., Regular Admission"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Price *
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="25.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Pricing Type
                        </label>
                        <select
                            value={formData.pricing_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, pricing_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="regular">Regular</option>
                            <option value="early_bird">Early Bird</option>
                            <option value="late_bird">Late Bird</option>
                            <option value="special">Special</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Membership Type
                        </label>
                        <select
                            value={formData.membership_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, membership_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Members</option>
                            <option value="member">Members Only</option>
                            <option value="non_member">Non-Members Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Tickets
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.max_tickets}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Leave empty for unlimited"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Start Date *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            End Date *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Pricing'}
                    </button>
                </div>
            </form>
        </div>
    )
}
