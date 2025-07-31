"use client"

import { useState } from 'react'
import { Participant, FormField } from '@/lib/types/database'

interface Step3ParticipantsProps {
    quantity: number
    participants: Partial<Participant>[]
    setParticipants: (participants: Partial<Participant>[]) => void
    formFields: FormField[]
    onComplete: () => void
    onBack: () => void
    loading: boolean
    error: string
}

export default function Step3Participants({
    quantity,
    participants,
    setParticipants,
    formFields,
    onComplete,
    onBack,
    loading,
    error
}: Step3ParticipantsProps) {
    const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0)

    const currentParticipant = participants[currentParticipantIndex] || {}
    const isLastParticipant = currentParticipantIndex === quantity - 1
    const isFirstParticipant = currentParticipantIndex === 0

    const areAllParticipantsValid = (): boolean => {
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i]
            
            // Check required fixed fields
            if (!participant.first_name?.trim() || !participant.last_name?.trim() || !participant.date_of_birth) {
                return false
            }

            // Check required custom fields
            for (const field of formFields) {
                if (field.required) {
                    const value = participant.custom_data?.[field.name]
                    if (!value || value === '') {
                        return false
                    }
                }
            }
        }
        return true
    }

    const isCurrentParticipantValid = (): boolean => {
        const participant = currentParticipant
        
        // Check required fixed fields
        if (!participant.first_name?.trim() || !participant.last_name?.trim() || !participant.date_of_birth) {
            return false
        }

        // Check required custom fields
        for (const field of formFields) {
            if (field.required) {
                const value = participant.custom_data?.[field.name]
                if (!value || value === '') {
                    return false
                }
            }
        }
        return true
    }

    const handleParticipantChange = (field: string, value: string) => {
        const newParticipants = [...participants]
        newParticipants[currentParticipantIndex] = { ...newParticipants[currentParticipantIndex], [field]: value }
        setParticipants(newParticipants)
    }

    const handleCustomFieldChange = (fieldName: string, value: string) => {
        const newParticipants = [...participants]
        if (!newParticipants[currentParticipantIndex].custom_data) {
            newParticipants[currentParticipantIndex].custom_data = {}
        }
        newParticipants[currentParticipantIndex].custom_data![fieldName] = value
        setParticipants(newParticipants)
    }

    const handleNext = () => {
        if (!isCurrentParticipantValid()) {
            return
        }

        if (isLastParticipant) {
            onComplete()
        } else {
            setCurrentParticipantIndex(currentParticipantIndex + 1)
        }
    }

    const handlePrevious = () => {
        if (isFirstParticipant) {
            onBack()
        } else {
            setCurrentParticipantIndex(currentParticipantIndex - 1)
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Progress Indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">
                            Participant Information
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Participant {currentParticipantIndex + 1} of {quantity}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        {Array.from({ length: quantity }, (_, index) => (
                            <div
                                key={index}
                                className={`w-3 h-3 rounded-full ${
                                    index < currentParticipantIndex
                                        ? 'bg-green-500' // Completed
                                        : index === currentParticipantIndex
                                        ? 'bg-blue-500' // Current
                                        : 'bg-gray-300' // Pending
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Participant Form */}
            <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-6">
                    Participant {currentParticipantIndex + 1}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fixed Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={currentParticipant.first_name || ''}
                            onChange={(e) => handleParticipantChange('first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={currentParticipant.last_name || ''}
                            onChange={(e) => handleParticipantChange('last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={currentParticipant.email || ''}
                            onChange={(e) => handleParticipantChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={currentParticipant.phone || ''}
                            onChange={(e) => handleParticipantChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={currentParticipant.date_of_birth || ''}
                            onChange={(e) => handleParticipantChange('date_of_birth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* Custom Fields */}
                    {formFields.map((field) => (
                        <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={currentParticipant.custom_data?.[field.name] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required={field.required}
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    value={currentParticipant.custom_data?.[field.name] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required={field.required}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4">
                <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400"
                >
                    {isFirstParticipant ? 'Back to Contact Information' : 'Previous Participant'}
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={loading || !isCurrentParticipantValid()}
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : isLastParticipant ? 'Complete Booking' : 'Next Participant'}
                </button>
            </div>
        </div>
    )
} 