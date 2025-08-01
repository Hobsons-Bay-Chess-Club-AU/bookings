'use client'

import { useState } from 'react'
import { Event, EventSettings } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

interface EventSettingsModalProps {
    event: Event
    isOpen: boolean
    onClose: () => void
    onUpdate: (settings: EventSettings) => void
}

// Built-in participant fields that can be displayed publicly
const BUILTIN_PARTICIPANT_FIELDS = [
    { id: 'first_name', label: 'First Name', description: 'Participant\'s first name', category: 'Basic Info' },
    { id: 'last_name', label: 'Last Name', description: 'Participant\'s last name', category: 'Basic Info' },
    { id: 'date_of_birth', label: 'Date of Birth', description: 'Participant\'s date of birth', category: 'Basic Info' },
    { id: 'contact_email', label: 'Contact Email', description: 'Participant\'s email address', category: 'Contact Info' },
    { id: 'contact_phone', label: 'Contact Phone', description: 'Participant\'s phone number', category: 'Contact Info' },
]

export default function EventSettingsModal({ event, isOpen, onClose, onUpdate }: EventSettingsModalProps) {
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState<EventSettings>({
        show_participants_public: event.settings?.show_participants_public || false,
        participant_display_fields: event.settings?.participant_display_fields || ['first_name', 'last_name'],
        show_attendance_count: event.settings?.show_attendance_count || false,
        allow_participant_contact: event.settings?.allow_participant_contact || false,
    })

    // Generate available fields dynamically from built-in fields and custom fields
    const getAvailableFields = () => {
        const fields = [...BUILTIN_PARTICIPANT_FIELDS]
        
        // Add custom fields from the event's form configuration
        if (event.custom_form_fields && event.custom_form_fields.length > 0) {
            event.custom_form_fields.forEach(customField => {
                fields.push({
                    id: `custom_${customField.name}`,
                    label: customField.label,
                    description: customField.description || `Custom field: ${customField.label}`,
                    category: 'Custom Fields'
                })
            })
        }
        
        return fields
    }

    const availableFields = getAvailableFields()
    
    // Group fields by category for better organization
    const fieldsByCategory = availableFields.reduce((acc, field) => {
        if (!acc[field.category]) {
            acc[field.category] = []
        }
        acc[field.category].push(field)
        return acc
    }, {} as Record<string, typeof availableFields>)

    const handleSave = async () => {
        setLoading(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('events')
                .update({ settings })
                .eq('id', event.id)

            if (error) {
                throw error
            }

            onUpdate(settings)
            onClose()
        } catch (error) {
            console.error('Error updating event settings:', error)
            alert('Failed to update settings. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleFieldToggle = (fieldId: string) => {
        setSettings(prev => ({
            ...prev,
            participant_display_fields: prev.participant_display_fields.includes(fieldId)
                ? prev.participant_display_fields.filter(id => id !== fieldId)
                : [...prev.participant_display_fields, fieldId]
        }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Event Settings
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Configure how your event information is displayed to the public
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Public Participant Display */}
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <input
                                        id="show_participants_public"
                                        type="checkbox"
                                        checked={settings.show_participants_public}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            show_participants_public: e.target.checked
                                        }))}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="show_participants_public" className="text-sm font-medium text-gray-900">
                                        Show Participants Publicly
                                    </label>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Display a list of confirmed participants on your event's public page.
                                        This can help build excitement and show the caliber of participants.
                                    </p>
                                </div>
                            </div>

                            {/* Participant Display Fields */}
                            {settings.show_participants_public && (
                                <div className="mt-6 pl-7">
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                                        Select Information to Display
                                    </h4>
                                    <div className="space-y-6">
                                        {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                            <div key={category}>
                                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                                    {category}
                                                </h5>
                                                <div className="space-y-3 pl-2">
                                                    {fields.map((field) => (
                                                        <div key={field.id} className="flex items-start space-x-3">
                                                            <input
                                                                id={`field-${field.id}`}
                                                                type="checkbox"
                                                                checked={settings.participant_display_fields.includes(field.id)}
                                                                onChange={() => handleFieldToggle(field.id)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                            <div className="flex-1">
                                                                <label htmlFor={`field-${field.id}`} className="text-sm font-medium text-gray-700">
                                                                    {field.label}
                                                                </label>
                                                                <p className="text-xs text-gray-500">{field.description}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {settings.participant_display_fields.length === 0 && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <p className="text-sm text-yellow-700">
                                                ⚠️ Please select at least one field to display. Otherwise, participants won't be shown.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Additional Settings */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-gray-900">Additional Display Options</h4>

                            {/* Show Attendance Count */}
                            <div className="flex items-start space-x-3">
                                <input
                                    id="show_attendance_count"
                                    type="checkbox"
                                    checked={settings.show_attendance_count}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        show_attendance_count: e.target.checked
                                    }))}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                    <label htmlFor="show_attendance_count" className="text-sm font-medium text-gray-900">
                                        Show Attendance Count
                                    </label>
                                    <p className="text-sm text-gray-500">
                                        Display the number of confirmed participants on the event page
                                    </p>
                                </div>
                            </div>

                            {/* Allow Participant Contact */}
                            <div className="flex items-start space-x-3">
                                <input
                                    id="allow_participant_contact"
                                    type="checkbox"
                                    checked={settings.allow_participant_contact}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        allow_participant_contact: e.target.checked
                                    }))}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                    <label htmlFor="allow_participant_contact" className="text-sm font-medium text-gray-900">
                                        Allow Participant Contact
                                    </label>
                                    <p className="text-sm text-gray-500">
                                        Show a contact button for participants (requires organizer contact information)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Notice */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="text-blue-400">ℹ️</span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        Privacy Notice
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <p>
                                            Only information from confirmed participants will be displayed.
                                            Sensitive information like email addresses and phone numbers are never shown publicly.
                                            Participants can contact you if they don't want their information displayed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-200">
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading || (settings.show_participants_public && settings.participant_display_fields.length === 0)}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
