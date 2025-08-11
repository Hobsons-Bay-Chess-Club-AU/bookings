"use client"

import { useState } from 'react'
import { Participant, FormField, CustomDataValue } from '@/lib/types/database'
import ParticipantSearchPopup from '../participant-search-popup'
import { DynamicFormFieldset, isFieldValid } from '@/components/forms'

interface Step3ParticipantsProps {
    quantity: number
    participants: Partial<Participant>[]
    setParticipants: (participants: Partial<Participant>[]) => void
    formFields: FormField[]
    onComplete: () => void
    onBack: () => void
    loading: boolean
    error: string
    userId?: string
}

export default function Step3Participants({
    quantity,
    participants,
    setParticipants,
    formFields,
    onComplete,
    onBack,
    loading,
    error,
    userId
}: Step3ParticipantsProps) {
    const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0)
    const [showSearchPopup, setShowSearchPopup] = useState(false)

    const currentParticipant = participants[currentParticipantIndex] || {}
    const isLastParticipant = currentParticipantIndex === quantity - 1
    const isFirstParticipant = currentParticipantIndex === 0

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
                if (!isFieldValid(field, value)) {
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

    const handleCustomFieldChange = (fieldName: string, value: CustomDataValue) => {
        const newParticipants = [...participants]
        if (!newParticipants[currentParticipantIndex].custom_data) {
            newParticipants[currentParticipantIndex].custom_data = {}
        }
        newParticipants[currentParticipantIndex].custom_data![fieldName] = value
        setParticipants(newParticipants)
    }

    const handleSelectParticipant = (selectedParticipant: Partial<Participant>) => {
        const newParticipants = [...participants]
        newParticipants[currentParticipantIndex] = {
            ...newParticipants[currentParticipantIndex],
            ...selectedParticipant
        }
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
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Progress Indicator */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Participant Information
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-100 mt-1">
                            Participant {currentParticipantIndex + 1} of {quantity}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        {Array.from({ length: quantity }, (_, index) => (
                            <div
                                key={index}
                                className={`w-3 h-3 rounded-full ${index < currentParticipantIndex
                                    ? 'bg-green-500' // Completed
                                    : index === currentParticipantIndex
                                        ? 'bg-blue-500' // Current
                                        : 'bg-gray-300 dark:bg-gray-700' // Pending
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Participant Form */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                        Participant {currentParticipantIndex + 1}
                    </h3>
                    {userId && (
                        <button
                            type="button"
                            onClick={() => setShowSearchPopup(true)}
                            className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 hover:text-indigo-800 dark:hover:text-indigo-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-indigo-200 dark:border-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-500"
                            title="Search recent participants"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Search Recent</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fixed Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            First Name *
                        </label>
                        <input
                            type="text"
                            value={currentParticipant.first_name || ''}
                            onChange={(e) => handleParticipantChange('first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            value={currentParticipant.last_name || ''}
                            onChange={(e) => handleParticipantChange('last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Date of Birth *
                        </label>
                        <input
                            type="date"
                            value={currentParticipant.date_of_birth || ''}
                            onChange={(e) => handleParticipantChange('date_of_birth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={currentParticipant.contact_email || ''}
                            onChange={(e) => handleParticipantChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>

                    {/* Custom Fields */}
                    <DynamicFormFieldset
                        key={`participant-${currentParticipantIndex}`}
                        fields={formFields}
                        values={currentParticipant.custom_data || {}}
                        onChange={handleCustomFieldChange}
                        className="md:col-span-2"
                        fieldClassName=""
                    />
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4 mt-8">
                <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-600"
                >
                    {isFirstParticipant ? 'Back to Contact' : 'Previous Participant'}
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={loading || !isCurrentParticipantValid()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLastParticipant ? (loading ? 'Processing...' : 'Continue to Review') : 'Next Participant'}
                </button>
            </div>

            {/* Participant Search Popup */}
            {userId && (
                <ParticipantSearchPopup
                    isOpen={showSearchPopup}
                    onClose={() => setShowSearchPopup(false)}
                    onSelectParticipant={handleSelectParticipant}
                    userId={userId}
                />
            )}
        </div>
    )
} 