'use client'

import { useState } from 'react'
import { EventPricing, PricingType, MembershipType, Event } from '@/lib/types/database'
import ConfirmationModal from '@/components/ui/confirmation-modal'
import { createClient } from '@/lib/supabase/client'
import { HiDocumentDuplicate, HiCog6Tooth, HiPencilSquare, HiEye, HiTrash, HiCurrencyDollar } from 'react-icons/hi2'
import ActionMenu from '@/components/ui/action-menu'

interface PricingManagerProps {
    eventId: string
    initialPricing: EventPricing[]
    event?: Event
}

export default function PricingManager({ eventId, initialPricing, event }: PricingManagerProps) {
    const [pricing, setPricing] = useState<EventPricing[]>(initialPricing)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pricingToDelete, setPricingToDelete] = useState<string | null>(null)
    

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
        // Auto-fill start and end dates with event dates when adding new pricing
        const eventStartDate = event?.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : ''
        const eventEndDate = event?.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : ''
        
        setFormData({
            name: '',
            description: '',
            pricing_type: 'regular',
            membership_type: 'all',
            price: '',
            start_date: eventStartDate,
            end_date: eventEndDate,
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

    const handleClone = (pricingItem: EventPricing) => {
        setFormData({
            name: `${pricingItem.name} (Copy)`,
            description: pricingItem.description || '',
            pricing_type: pricingItem.pricing_type,
            membership_type: pricingItem.membership_type,
            price: pricingItem.price.toString(),
            start_date: pricingItem.start_date.slice(0, 16), // Format for datetime-local
            end_date: pricingItem.end_date.slice(0, 16),
            max_tickets: pricingItem.max_tickets?.toString() || ''
        })
        setEditingId(null) // No editing ID since this is a new item
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
            setError((err as Error).message || 'Failed to update pricing status')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (pricingId: string) => {
        setPricingToDelete(pricingId)
        setShowConfirmModal(true)
    }

    const confirmDelete = async () => {
        if (!pricingToDelete) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from('event_pricing')
                .delete()
                .eq('id', pricingToDelete)

            if (error) throw error

            setPricing(prev => prev.filter(p => p.id !== pricingToDelete))
            setShowConfirmModal(false)
            setPricingToDelete(null)
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to delete pricing')
        } finally {
            setLoading(false)
        }
    }

    const getPricingTypeColor = (type: PricingType) => {
        switch (type) {
            case 'early_bird': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            case 'regular': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            case 'late_bird': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
            case 'special': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    const getMembershipTypeColor = (type: MembershipType) => {
        switch (type) {
            case 'member': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            case 'non_member': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'all': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    // ActionMenu handles dropdown behavior

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
                <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <h3 className="text-lg font-medium mb-4">
                        {editingId ? 'Edit Pricing Tier' : 'Add New Pricing Tier'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="e.g., Early Bird, Member Special"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Price (AUD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="Optional description of this pricing tier"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Pricing Type
                                </label>
                                <select
                                    value={formData.pricing_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pricing_type: e.target.value as PricingType }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="early_bird">Early Bird</option>
                                    <option value="regular">Regular</option>
                                    <option value="late_bird">Late Bird</option>
                                    <option value="special">Special</option>
                                    <option value="conditional_free">Conditional Free</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Membership
                                </label>
                                <select
                                    value={formData.membership_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, membership_type: e.target.value as MembershipType }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">All Users</option>
                                    <option value="member">Members Only</option>
                                    <option value="non_member">Non-Members Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Max Tickets
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_tickets}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="Optional limit"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Start Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                                {!editingId && event && (
                                    <div className="mt-1 flex items-center space-x-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Auto-filled with event start date
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const now = new Date()
                                                const formattedDate = now.toISOString().slice(0, 16)
                                                setFormData(prev => ({ ...prev, start_date: formattedDate }))
                                            }}
                                            className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            Use Now
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    End Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                                {!editingId && event && (
                                    <div className="mt-1 flex items-center space-x-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Auto-filled with event end date
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const now = new Date()
                                                const formattedDate = now.toISOString().slice(0, 16)
                                                setFormData(prev => ({ ...prev, end_date: formattedDate }))
                                            }}
                                            className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            Use Now
                                        </button>
                                    </div>
                                )}
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
                                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Pricing List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pricing.length === 0 ? (
                    <div className="text-center py-12">
                        <HiCurrencyDollar className="text-4xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No pricing tiers yet
                        </h3>
                        <p className="text-gray-800 dark:text-gray-300 mb-6">
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
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Pricing Tier
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Type & Membership
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Validity Period
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Tickets
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {pricing.map((pricingItem) => (
                                        <tr key={pricingItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {pricingItem.name}
                                                    </div>
                                                    {pricingItem.description && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {pricingItem.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col space-y-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPricingTypeColor(pricingItem.pricing_type)}`}>
                                                        {pricingItem.pricing_type.replace('_', ' ')}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMembershipTypeColor(pricingItem.membership_type)}`}>
                                                        {pricingItem.membership_type === 'all' ? 'All Users' :
                                                            pricingItem.membership_type === 'member' ? 'Members' : 'Non-Members'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    AUD ${pricingItem.price.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                                    <div>{new Date(pricingItem.start_date).toLocaleDateString()}</div>
                                                    <div className="text-gray-500 dark:text-gray-400">
                                                        to {new Date(pricingItem.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                                    {pricingItem.tickets_sold}
                                                    {pricingItem.max_tickets && ` / ${pricingItem.max_tickets}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    pricingItem.is_active 
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                }`}>
                                                    {pricingItem.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                                <ActionMenu
                                                    trigger={({ buttonProps }) => (
                                                        <button
                                                            {...buttonProps}
                                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                            title="Pricing Actions"
                                                        >
                                                            <HiCog6Tooth className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => handleEdit(pricingItem)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        data-menu-item
                                                    >
                                                        <HiPencilSquare className="mr-2 h-4 w-4" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleClone(pricingItem)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        data-menu-item
                                                    >
                                                        <HiDocumentDuplicate className="mr-2 h-4 w-4" /> Clone
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(pricingItem.id, pricingItem.is_active)}
                                                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left ${
                                                            pricingItem.is_active 
                                                                ? 'text-yellow-700 dark:text-yellow-400' 
                                                                : 'text-green-700 dark:text-green-400'
                                                        }`}
                                                        data-menu-item
                                                    >
                                                        <HiEye className="mr-2 h-4 w-4" />
                                                        {pricingItem.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(pricingItem.id)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        data-menu-item
                                                    >
                                                        <HiTrash className="mr-2 h-4 w-4" /> Delete
                                                    </button>
                                                </ActionMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                            {pricing.map((pricingItem) => (
                                <div key={pricingItem.id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>

                                            {pricingItem.description && (
                                                <p className="text-sm text-gray-800 dark:text-gray-300 mb-3">
                                                    {pricingItem.description}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-800 dark:text-gray-300 font-medium">Price:</span>
                                                    <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">AUD ${pricingItem.price.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-800 dark:text-gray-300 font-medium">Valid:</span>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                        {new Date(pricingItem.start_date).toLocaleDateString()} - {new Date(pricingItem.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-800 dark:text-gray-300 font-medium">Tickets Sold:</span>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                        {pricingItem.tickets_sold}
                                                        {pricingItem.max_tickets && ` / ${pricingItem.max_tickets}`}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-800 dark:text-gray-300 font-medium">Status:</span>
                                                    <div className={`font-medium ${pricingItem.is_active ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-400'}`}>
                                                        {pricingItem.is_active ? 'Active' : 'Inactive'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-6 flex-shrink-0 relative">
                                            <ActionMenu
                                                trigger={({ buttonProps }) => (
                                                    <button
                                                        {...buttonProps}
                                                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                        title="Pricing Actions"
                                                    >
                                                        <HiCog6Tooth className="h-5 w-5" />
                                                    </button>
                                                )}
                                            >
                                                <button
                                                    onClick={() => handleEdit(pricingItem)}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                    data-menu-item
                                                >
                                                    <HiPencilSquare className="mr-2 h-4 w-4" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleClone(pricingItem)}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                    data-menu-item
                                                >
                                                    <HiDocumentDuplicate className="mr-2 h-4 w-4" /> Clone
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(pricingItem.id, pricingItem.is_active)}
                                                    className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left ${
                                                        pricingItem.is_active 
                                                            ? 'text-yellow-700 dark:text-yellow-400' 
                                                            : 'text-green-700 dark:text-green-400'
                                                    }`}
                                                    data-menu-item
                                                >
                                                    <HiEye className="mr-2 h-4 w-4" />
                                                    {pricingItem.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pricingItem.id)}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                    data-menu-item
                                                >
                                                    <HiTrash className="mr-2 h-4 w-4" /> Delete
                                                </button>
                                            </ActionMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    setPricingToDelete(null)
                }}
                onConfirm={confirmDelete}
                title="Delete Pricing Tier"
                message="Are you sure you want to delete this pricing tier? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={loading}
            />
        </div>
    )
}