"use client"

import { useMemo, useState } from 'react'
import { Participant, FormField, CustomDataValue, EventSection } from '@/lib/types/database'
import ParticipantSearchPopup from '../participant-search-popup'
import { DynamicFormFieldset, isFieldValid } from '@/components/forms'
import { validateSectionRules } from '@/lib/utils/section-rules'
// import ParticipantSectionAssignment from '../participant-section-assignment'

interface SelectedSectionItem {
    sectionId: string
    section: EventSection
    pricingId: string
    quantity: number
}

interface Step3ParticipantsProps {
    quantity: number
    participants: Partial<Participant>[]
    setParticipants: (participants: Partial<Participant>[]) => void
    formFields: FormField[]
    onComplete: () => void
    onBack: () => void
    loading: boolean
    error: string
    setError: (error: string) => void
    userId?: string
    // Multi-section props
    sections?: EventSection[]
    isMultiSectionEvent?: boolean

    selectedSections?: SelectedSectionItem[]
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
    setError,
    userId,

    isMultiSectionEvent = false,

    selectedSections = []
}: Step3ParticipantsProps) {
    const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0)
    const [showSearchPopup, setShowSearchPopup] = useState(false)
    // const [showSectionAssignment, setShowSectionAssignment] = useState(false)


    const currentParticipant = participants[currentParticipantIndex] || {}
    const isLastParticipant = currentParticipantIndex === quantity - 1
    const isFirstParticipant = currentParticipantIndex === 0

    // Build auto allocation order once based on selected section quantities
    const autoAllocationOrder = useMemo(() => {
        if (!isMultiSectionEvent || !selectedSections || selectedSections.length === 0) {
            return [] as { sectionId: string; sectionTitle: string }[]
        }
        const order: { sectionId: string; sectionTitle: string }[] = []
        selectedSections.forEach((sel) => {
            for (let i = 0; i < sel.quantity; i += 1) {
                order.push({ sectionId: sel.sectionId, sectionTitle: sel.section.title })
            }
        })
        return order
    }, [isMultiSectionEvent, selectedSections])

    const getAssignedSectionTitleForIndex = (index: number): string | undefined => {
        if (!isMultiSectionEvent || autoAllocationOrder.length === 0) return undefined
        return autoAllocationOrder[index]?.sectionTitle
    }

    const isCurrentParticipantValid = (): boolean => {
        const participant = currentParticipant

        // Check required fixed fields
        if (!participant.first_name?.trim() || !participant.last_name?.trim() || !participant.date_of_birth || !participant.gender?.trim()) {
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

        // Check section rules validation for multi-section events
        if (isMultiSectionEvent && selectedSections && selectedSections.length > 0) {
            const assignedSection = autoAllocationOrder[currentParticipantIndex]
            if (assignedSection) {
                const section = selectedSections.find(s => s.sectionId === assignedSection.sectionId)?.section
                if (section && section.section_rules) {
                    const validationResult = validateSectionRules(section.section_rules, {
                        date_of_birth: participant.date_of_birth,
                        gender: participant.gender
                    })
                    if (!validationResult.isValid) {
                        return false
                    }
                }
            }
        }

        return true
    }

    const getCurrentParticipantValidationError = (): string | null => {
        const participant = currentParticipant

        // Check required fixed fields
        if (!participant.first_name?.trim()) {
            return 'First name is required'
        }
        if (!participant.last_name?.trim()) {
            return 'Last name is required'
        }
        if (!participant.date_of_birth) {
            return 'Date of birth is required'
        }
        if (!participant.gender?.trim()) {
            return 'Gender is required'
        }

        // Check required custom fields
        for (const field of formFields) {
            if (field.required) {
                const value = participant.custom_data?.[field.name]
                if (!isFieldValid(field, value)) {
                    return `${field.label || field.name} is required`
                }
            }
        }

        // Check section rules validation for multi-section events
        if (isMultiSectionEvent && selectedSections && selectedSections.length > 0) {
            const assignedSection = autoAllocationOrder[currentParticipantIndex]
            if (assignedSection) {
                const section = selectedSections.find(s => s.sectionId === assignedSection.sectionId)?.section
                if (section && section.section_rules) {
                    const validationResult = validateSectionRules(section.section_rules, {
                        date_of_birth: participant.date_of_birth,
                        gender: participant.gender
                    })
                    if (!validationResult.isValid) {
                        return validationResult.error || 'Participant does not meet section requirements'
                    }
                }
            }
        }

        return null
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

    const handleNext = async () => {
        if (!isCurrentParticipantValid()) {
            return
        }

        // Check if current participant is banned
        const participant = currentParticipant
        if (participant.first_name && participant.last_name && participant.date_of_birth) {
            try {
                const response = await fetch('/api/security/check-ban', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        first_name: participant.first_name,
                        middle_name: participant.middle_name || null,
                        last_name: participant.last_name,
                        date_of_birth: participant.date_of_birth
                    })
                })

                if (response.ok) {
                    const { is_banned } = await response.json()
                    if (is_banned) {
                        setError('Sorry, we cannot process your entry right now. Please contact the event organizer.')
                        return
                    }
                }
            } catch (error) {
                console.error('Error checking ban status:', error)
                // Continue with booking if ban check fails
            }
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

            {/* Section Rules Validation Error */}
            {(() => {
                const validationError = getCurrentParticipantValidationError()
                return validationError ? (
                    <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Section Requirements:</span>
                            <span className="ml-2">{validationError}</span>
                        </div>
                    </div>
                ) : null
            })()}

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
                                    ? 'bg-green-500'
                                    : index === currentParticipantIndex
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300 dark:bg-gray-700'
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
                        {(() => {
                            const assigned = getAssignedSectionTitleForIndex(currentParticipantIndex)
                            return assigned ? `Participant ${currentParticipantIndex + 1} - ${assigned}` : `Participant ${currentParticipantIndex + 1}`
                        })()}
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

                {(() => {
                    if (isMultiSectionEvent && selectedSections && selectedSections.length > 0) {
                        const assignedSection = autoAllocationOrder[currentParticipantIndex]
                        if (assignedSection) {
                            const section = selectedSections.find(s => s.sectionId === assignedSection.sectionId)?.section
                            if (section && section.section_rules) {
                                const rules = section.section_rules
                                const requirements: string[] = []

                                if (rules.age_constraint?.enabled) {
                                    if (rules.age_constraint.min_date && rules.age_constraint.max_date) {
                                        requirements.push(`Age: Born between ${new Date(rules.age_constraint.min_date).toLocaleDateString()} and ${new Date(rules.age_constraint.max_date).toLocaleDateString()}`)
                                    } else if (rules.age_constraint.min_date) {
                                        requirements.push(`Age: Born on or before ${new Date(rules.age_constraint.min_date).toLocaleDateString()}`)
                                    } else if (rules.age_constraint.max_date) {
                                        requirements.push(`Age: Born on or after ${new Date(rules.age_constraint.max_date).toLocaleDateString()}`)
                                    }
                                }

                                if (rules.gender_rules?.enabled && rules.gender_rules.allowed_genders?.length > 0) {
                                    const allowedGenders = rules.gender_rules.allowed_genders
                                        .map(g => g.charAt(0).toUpperCase() + g.slice(1))
                                        .join(', ')
                                    requirements.push(`Gender: ${allowedGenders}`)
                                }

                                if (requirements.length > 0) {
                                    return (
                                        <div className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                                            {requirements.join('. ')}
                                        </div>
                                    )
                                }
                            }
                        }
                    }
                    return null
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            Middle Name
                        </label>
                        <input
                            type="text"
                            value={currentParticipant.middle_name || ''}
                            onChange={(e) => handleParticipantChange('middle_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
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
                            Gender *
                        </label>
                        <select
                            value={currentParticipant.gender || ''}
                            onChange={(e) => handleParticipantChange('gender', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            required
                        >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={currentParticipant.contact_email || ''}
                            onChange={(e) => handleParticipantChange('contact_email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={currentParticipant.contact_phone || ''}
                            onChange={(e) => handleParticipantChange('contact_phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>

                    {/* Custom Fields */}
                    <DynamicFormFieldset
                        key={`participant-${currentParticipantIndex}`}
                        fields={formFields.filter((f) => f.type !== 'computed_membership_lookup' && !f.admin_only)}
                        values={currentParticipant.custom_data || {}}
                        onChange={handleCustomFieldChange}
                        className="md:col-span-2"
                        fieldClassName=""
                    />
                </div>
            </div>

            {/* Section Assignment for Multi-Section Events (hidden for now) */}
            {/* We keep the code scaffold but don't render it to simplify UX as requested */}
            {false && isMultiSectionEvent && participants.length > 0 && (
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                    {/* Manual assignment UI intentionally hidden */}
                </div>
            )}

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