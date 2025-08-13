'use client'

import { useState } from 'react'
import { Event, EventSection } from '@/lib/types/database'
import { HiPlus, HiPencil, HiTrash, HiCalendarDays, HiClock, HiUsers, HiCurrencyDollar, HiCog6Tooth, HiShieldCheck } from 'react-icons/hi2'
import { formatInTimezone } from '@/lib/utils/timezone'
import SectionPricingModal from '@/components/organizer/section-pricing-modal'
import ConfirmationModal from '@/components/ui/confirmation-modal'
import SectionWhitelistSettings from '@/components/organizer/section-whitelist-settings'
import SectionRulesEditor from '@/components/organizer/section-rules-editor'

interface SectionsManagerClientProps {
    event: Event
}

export default function SectionsManagerClient({ event }: SectionsManagerClientProps) {
    const [sections, setSections] = useState<EventSection[]>(event.sections || [])
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingSection, setEditingSection] = useState<EventSection | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPricingModal, setShowPricingModal] = useState(false)
    const [selectedSection, setSelectedSection] = useState<EventSection | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [sectionToDelete, setSectionToDelete] = useState<EventSection | null>(null)
    const [deleteValidation, setDeleteValidation] = useState<{
        canDelete: boolean
        message: string
        participantCount: number
        bookingCount: number
    } | null>(null)
    const [showWhitelistSettings, setShowWhitelistSettings] = useState(false)

    const handleAddSection = async (sectionData: Partial<EventSection>) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/events/${event.id}/sections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sectionData),
            })

            if (!response.ok) {
                throw new Error('Failed to create section')
            }

            const newSection = await response.json()
            setSections(prev => [...prev, { ...newSection, available_seats: newSection.max_seats }])
            setShowAddForm(false)
        } catch (error) {
            console.error('Error creating section:', error)
            alert('Failed to create section')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteSection = async () => {
        if (!sectionToDelete || !deleteValidation?.canDelete) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`/api/events/${event.id}/sections/${sectionToDelete.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete section')
            }

            setSections(prev => prev.filter(section => section.id !== sectionToDelete.id))
            setShowDeleteModal(false)
            setSectionToDelete(null)
            setDeleteValidation(null)
        } catch (error) {
            console.error('Error deleting section:', error)
            alert('Failed to delete section')
        } finally {
            setLoading(false)
        }
    }

    const handleManagePricing = (section: EventSection) => {
        setSelectedSection(section)
        setShowPricingModal(true)
    }

    const handleUpdateWhitelistSetting = async (sectionId: string, whitelistEnabled: boolean) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/sections/${sectionId}/whitelist-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ whitelist_enabled: whitelistEnabled }),
            })

            if (!response.ok) {
                throw new Error('Failed to update whitelist setting')
            }

            const updatedSection = await response.json()
            setSections(prev => prev.map(section => 
                section.id === sectionId 
                    ? { ...section, whitelist_enabled: updatedSection.whitelist_enabled }
                    : section
            ))
        } catch (error) {
            console.error('Error updating whitelist setting:', error)
            alert('Failed to update whitelist setting')
        } finally {
            setLoading(false)
        }
    }

    const validateSectionDeletion = async (section: EventSection) => {
        setLoading(true)
        try {
            // Check for participants in this section
            const participantsResponse = await fetch(`/api/events/${event.id}/participants?section_id=${section.id}`)
            const participantsData = await participantsResponse.json()
            const participantCount = participantsData.length || 0

            // Check for bookings in this section
            const bookingsResponse = await fetch(`/api/events/${event.id}/bookings?section_id=${section.id}`)
            const bookingsData = await bookingsResponse.json()
            const bookingCount = bookingsData.length || 0

            const canDelete = participantCount === 0 && bookingCount === 0
            let message = ''

            if (canDelete) {
                message = `Are you sure you want to delete the section "${section.title}"? This action cannot be undone.`
            } else {
                message = `Cannot delete section "${section.title}" because it has ${participantCount} participant${participantCount !== 1 ? 's' : ''} and ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}. Please move all participants and bookings to other sections before deleting.`
            }

            setDeleteValidation({
                canDelete,
                message,
                participantCount,
                bookingCount
            })

            setSectionToDelete(section)
            setShowDeleteModal(true)
        } catch (error) {
            console.error('Error validating section deletion:', error)
            alert('Failed to validate section deletion. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <HiPlus className="h-4 w-4 mr-2" />
                        Add Section
                    </button>
                    {sections.length > 0 && (
                        <button
                            onClick={() => setShowWhitelistSettings(!showWhitelistSettings)}
                            disabled={loading}
                            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                                showWhitelistSettings
                                    ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 focus:ring-amber-500'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-indigo-500'
                            }`}
                        >
                            <HiShieldCheck className="h-4 w-4 mr-2" />
                            Whitelist Settings
                        </button>
                    )}
                </div>
            </div>

            {/* Add Section Form */}
            {showAddForm && (
                <AddSectionForm
                    event={event}
                    onSubmit={handleAddSection}
                    onCancel={() => setShowAddForm(false)}
                    loading={loading}
                />
            )}

            {/* Edit Section Form */}
            {editingSection && (
                <EditSectionForm
                    eventId={event.id}
                    section={editingSection}
                    onSubmit={(updatedSection) => {
                        setSections(prev => prev.map(s => s.id === updatedSection.id ? updatedSection : s))
                        setEditingSection(null)
                    }}
                    onCancel={() => setEditingSection(null)}
                    loading={loading}
                />
            )}

            {/* Whitelist Settings */}
            {showWhitelistSettings && sections.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                    <SectionWhitelistSettings
                        sections={sections}
                        onUpdate={handleUpdateWhitelistSetting}
                        loading={loading}
                    />
                </div>
            )}

            {/* Sections List */}
            <div className="space-y-4">
                {sections.length === 0 ? (
                    <div className="text-center py-12">
                        <HiUsers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No sections</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Get started by creating your first section.
                        </p>
                    </div>
                ) : (
                    sections.map((section) => (
                        <SectionCard
                            key={section.id}
                            section={section}
                            eventTimezone={event.timezone}
                            onEdit={() => setEditingSection(section)}
                            onDelete={() => validateSectionDeletion(section)}
                            onManagePricing={() => handleManagePricing(section)}
                            loading={loading}
                        />
                    ))
                )}
            </div>

            {/* Pricing Management Modal */}
            {showPricingModal && selectedSection && (
                <SectionPricingModal
                    section={selectedSection}
                    onClose={() => {
                        setShowPricingModal(false)
                        setSelectedSection(null)
                    }}
                    onPricingUpdated={() => {
                        // Refresh sections data to get updated pricing
                        // This would ideally refetch the sections with pricing data
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setSectionToDelete(null)
                    setDeleteValidation(null)
                }}
                onConfirm={handleDeleteSection}
                title={deleteValidation?.canDelete ? "Delete Section" : "Cannot Delete Section"}
                message={deleteValidation?.message || ""}
                confirmText={deleteValidation?.canDelete ? "Delete Section" : undefined}
                cancelText="Close"
                variant={deleteValidation?.canDelete ? "danger" : "warning"}
                loading={loading}
            />
        </div>
    )
}

interface SectionCardProps {
    section: EventSection
    eventTimezone: string
    onEdit: () => void
    onDelete: () => void
    onManagePricing: () => void
    loading: boolean
}

function SectionCard({ section, eventTimezone, onEdit, onDelete, onManagePricing, loading }: SectionCardProps) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {section.title}
                    </h3>
                    {section.description && (
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {section.description}
                        </p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={onManagePricing}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        title="Manage Pricing"
                    >
                        <HiCog6Tooth className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <HiPencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                        <HiTrash className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <HiCalendarDays className="h-4 w-4" />
                    <span>
                        {formatInTimezone(section.start_date, eventTimezone, 'MMM d, yyyy')}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <HiClock className="h-4 w-4" />
                    <span>
                        {formatInTimezone(section.start_date, eventTimezone, 'h:mm a')} - {formatInTimezone(section.end_date, eventTimezone, 'h:mm a')}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <HiUsers className="h-4 w-4" />
                    <span>
                        {section.current_seats} / {section.max_seats} seats
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <HiCurrencyDollar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                        From ${section.pricing?.[0]?.price || 0}
                    </span>
                </div>
            </div>

            {/* Status and Available Seats */}
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        section.status === 'published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {section.status}
                    </span>
                    <span className={`text-sm font-medium ${
                        (section.available_seats ?? 0) === 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : (section.available_seats ?? 0) < 10 
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                    }`}>
                        {(section.available_seats ?? 0)} seats available
                    </span>
                </div>
            </div>
        </div>
    )
}

interface AddSectionFormProps {
    event: Event
    onSubmit: (sectionData: Partial<EventSection>) => void
    onCancel: () => void
    loading: boolean
}

function AddSectionForm({ event, onSubmit, onCancel, loading }: AddSectionFormProps) {
    // Format event dates for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateForInput = (dateString: string) => {
        return new Date(dateString).toISOString().slice(0, 16)
    }

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: formatDateForInput(event.start_date),
        end_date: formatDateForInput(event.end_date),
        max_seats: '',
        section_type: '',
        section_config: {},
        section_rules: {}
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            ...formData,
            max_seats: parseInt(formData.max_seats),
            section_config: formData.section_config,
            section_rules: formData.section_rules
        })
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Add New Section
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Section Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., U8 Division"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Section Type
                        </label>
                        <input
                            type="text"
                            value={formData.section_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, section_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., age_group"
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
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description for this section"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Seats *
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.max_seats}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_seats: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="50"
                        />
                    </div>
                </div>

                {/* Section Rules Editor */}
                <SectionRulesEditor
                    rules={formData.section_rules}
                    onChange={(rules) => setFormData(prev => ({ ...prev, section_rules: rules }))}
                />

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
                        {loading ? 'Creating...' : 'Create Section'}
                    </button>
                </div>
            </form>
        </div>
    )
}

interface EditSectionFormProps {
    eventId: string
    section: EventSection
    onSubmit: (sectionData: EventSection) => void
    onCancel: () => void
    loading: boolean
}

function EditSectionForm({ eventId, section, onSubmit, onCancel, loading }: EditSectionFormProps) {
    const [formData, setFormData] = useState({
        title: section.title,
        description: section.description || '',
        start_date: section.start_date.slice(0, 16), // Format for datetime-local input
        end_date: section.end_date.slice(0, 16),
        max_seats: section.max_seats.toString(),
        section_type: section.section_type || '',
        section_config: section.section_config || {},
        section_rules: section.section_rules || {},
        status: section.status
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        try {
            const response = await fetch(`/api/events/${eventId}/sections/${section.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    max_seats: parseInt(formData.max_seats),
                    section_config: formData.section_config,
                    section_rules: formData.section_rules
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to update section')
            }

            const updatedSection = await response.json()
            onSubmit(updatedSection)
        } catch (error) {
            console.error('Error updating section:', error)
            alert('Failed to update section')
        }
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Edit Section: {section.title}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Section Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., U8 Division"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Section Type
                        </label>
                        <input
                            type="text"
                            value={formData.section_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, section_type: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., age_group"
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
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description for this section"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Seats *
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.max_seats}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_seats: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="50"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                    </label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'cancelled' | 'completed' }))}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                {/* Section Rules Editor */}
                <SectionRulesEditor
                    rules={formData.section_rules}
                    onChange={(rules) => setFormData(prev => ({ ...prev, section_rules: rules }))}
                />

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
                        {loading ? 'Updating...' : 'Update Section'}
                    </button>
                </div>
            </form>
        </div>
    )
}
