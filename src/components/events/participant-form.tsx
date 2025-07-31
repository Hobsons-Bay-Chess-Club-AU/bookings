'use client'

import { useState, useEffect } from 'react'
import { FormField, Participant } from '@/lib/types/database'

interface ParticipantFormProps {
    fields: FormField[]
    participants: Partial<Participant>[]
    onChange: (participants: Partial<Participant>[]) => void
    quantity: number
}

export default function ParticipantForm({ fields, participants, onChange, quantity }: ParticipantFormProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Initialize participants array if needed
    useEffect(() => {
        const newParticipants = Array.from({ length: quantity }, (_, index) => 
            participants[index] || {
                first_name: '',
                last_name: '',
                date_of_birth: '',
                contact_email: '',
                contact_phone: '',
                custom_data: {}
            }
        )
        
        if (newParticipants.length !== participants.length) {
            onChange(newParticipants)
        }
    }, [quantity])

    const updateParticipant = (index: number, field: string, value: any) => {
        const newParticipants = [...participants]
        if (!newParticipants[index]) {
            newParticipants[index] = {
                first_name: '',
                last_name: '',
                date_of_birth: '',
                contact_email: '',
                contact_phone: '',
                custom_data: {}
            }
        }

        if (['first_name', 'last_name', 'date_of_birth', 'contact_email', 'contact_phone'].includes(field)) {
            newParticipants[index] = { ...newParticipants[index], [field]: value }
        } else {
            // Custom field
            newParticipants[index] = {
                ...newParticipants[index],
                custom_data: { ...newParticipants[index].custom_data, [field]: value }
            }
        }

        onChange(newParticipants)
        
        // Clear error for this field
        const errorKey = `${index}_${field}`
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[errorKey]
                return newErrors
            })
        }
    }

    const validateParticipant = (participant: Partial<Participant>, index: number): boolean => {
        const newErrors: Record<string, string> = {}
        let isValid = true

        // Validate required fixed fields
        if (!participant.first_name?.trim()) {
            newErrors[`${index}_first_name`] = 'First name is required'
            isValid = false
        }
        if (!participant.last_name?.trim()) {
            newErrors[`${index}_last_name`] = 'Last name is required'
            isValid = false
        }

        // Validate custom fields
        fields.forEach(field => {
            const value = participant.custom_data?.[field.name]
            
            if (field.required && (!value || value === '')) {
                newErrors[`${index}_${field.name}`] = `${field.label} is required`
                isValid = false
            }

            // Type-specific validation
            if (value && field.validation) {
                if (field.type === 'email' && value) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(value)) {
                        newErrors[`${index}_${field.name}`] = 'Please enter a valid email address'
                        isValid = false
                    }
                }

                if (field.validation.regex && value) {
                    const regex = new RegExp(field.validation.regex)
                    if (!regex.test(value)) {
                        newErrors[`${index}_${field.name}`] = `Please enter a valid ${field.label.toLowerCase()}`
                        isValid = false
                    }
                }

                if (field.validation.minLength && value.length < field.validation.minLength) {
                    newErrors[`${index}_${field.name}`] = `${field.label} must be at least ${field.validation.minLength} characters`
                    isValid = false
                }

                if (field.validation.maxLength && value.length > field.validation.maxLength) {
                    newErrors[`${index}_${field.name}`] = `${field.label} must be no more than ${field.validation.maxLength} characters`
                    isValid = false
                }
            }
        })

        setErrors(prev => ({ ...prev, ...newErrors }))
        return isValid
    }

    const validateCurrentStep = (): boolean => {
        const participant = participants[currentStep]
        if (!participant) return false
        return validateParticipant(participant, currentStep)
    }

    const handleNext = () => {
        if (validateCurrentStep() && currentStep < quantity - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const renderField = (field: FormField, participant: Partial<Participant>, index: number) => {
        const value = field.name === 'first_name' || field.name === 'last_name' || 
                     field.name === 'date_of_birth' || field.name === 'contact_email' || 
                     field.name === 'contact_phone' 
                     ? participant[field.name as keyof Participant] 
                     : participant.custom_data?.[field.name] || ''
        
        const errorKey = `${index}_${field.name}`
        const hasError = !!errors[errorKey]

        const baseClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            hasError ? 'border-red-300' : 'border-gray-300'
        }`

        switch (field.type) {
            case 'text':
            case 'email':
            case 'phone':
                return (
                    <input
                        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                        value={value}
                        onChange={(e) => updateParticipant(index, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={baseClasses}
                    />
                )

            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => updateParticipant(index, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        min={field.validation?.min}
                        max={field.validation?.max}
                        className={baseClasses}
                    />
                )

            case 'date':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => updateParticipant(index, field.name, e.target.value)}
                        className={baseClasses}
                    />
                )

            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => updateParticipant(index, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className={baseClasses}
                    />
                )

            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => updateParticipant(index, field.name, e.target.value)}
                        className={baseClasses}
                    >
                        <option value="">Select an option</option>
                        {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                )

            case 'multiselect':
                return (
                    <div className="space-y-2">
                        {field.options?.map(option => (
                            <label key={option} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(value) ? value.includes(option) : false}
                                    onChange={(e) => {
                                        const currentValues = Array.isArray(value) ? value : []
                                        const newValues = e.target.checked
                                            ? [...currentValues, option]
                                            : currentValues.filter(v => v !== option)
                                        updateParticipant(index, field.name, newValues)
                                    }}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                )

            case 'checkbox':
                return (
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => updateParticipant(index, field.name, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{field.description || field.label}</span>
                    </label>
                )

            default:
                return null
        }
    }

    if (quantity === 0) {
        return null
    }

    const participant = participants[currentStep] || {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        contact_email: '',
        contact_phone: '',
        custom_data: {}
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Progress Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        Participant Information
                    </h3>
                    {quantity > 1 && (
                        <div className="text-sm text-gray-600">
                            Participant {currentStep + 1} of {quantity}
                        </div>
                    )}
                </div>
                
                {quantity > 1 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / quantity) * 100}%` }}
                        />
                    </div>
                )}

                {/* Pre-filled data notice */}
                {currentStep === 0 && participants[0]?.contact_email && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Pre-filled with your account information.</strong> You can edit any fields as needed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Copy from first participant button for additional participants */}
                {currentStep > 0 && participants[0]?.contact_email && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                const firstParticipant = participants[0]
                                if (firstParticipant) {
                                    updateParticipant(currentStep, 'contact_email', firstParticipant.contact_email || '')
                                    updateParticipant(currentStep, 'contact_phone', firstParticipant.contact_phone || '')
                                }
                            }}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy contact info from first participant
                        </button>
                    </div>
                )}
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* Fixed Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={participant.first_name || ''}
                            onChange={(e) => updateParticipant(currentStep, 'first_name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                errors[`${currentStep}_first_name`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                        {errors[`${currentStep}_first_name`] && (
                            <p className="text-sm text-red-600 mt-1">{errors[`${currentStep}_first_name`]}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={participant.last_name || ''}
                            onChange={(e) => updateParticipant(currentStep, 'last_name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                errors[`${currentStep}_last_name`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                        {errors[`${currentStep}_last_name`] && (
                            <p className="text-sm text-red-600 mt-1">{errors[`${currentStep}_last_name`]}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            value={participant.date_of_birth || ''}
                            onChange={(e) => updateParticipant(currentStep, 'date_of_birth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Email
                        </label>
                        <input
                            type="email"
                            value={participant.contact_email || ''}
                            onChange={(e) => updateParticipant(currentStep, 'contact_email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Phone
                        </label>
                        <input
                            type="tel"
                            value={participant.contact_phone || ''}
                            onChange={(e) => updateParticipant(currentStep, 'contact_phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Custom Fields */}
                {fields.length > 0 && (
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
                        <div className="space-y-4">
                            {fields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500"> *</span>}
                                    </label>
                                    {field.description && (
                                        <p className="text-xs text-gray-600 mb-2">{field.description}</p>
                                    )}
                                    {renderField(field, participant, currentStep)}
                                    {errors[`${currentStep}_${field.name}`] && (
                                        <p className="text-sm text-red-600 mt-1">{errors[`${currentStep}_${field.name}`]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            {quantity > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    
                    <div className="text-sm text-gray-600">
                        {currentStep + 1} of {quantity} participants
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentStep === quantity - 1}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}