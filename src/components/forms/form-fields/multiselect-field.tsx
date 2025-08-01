import { FormFieldProps, SelectOption } from './types'
import { useState } from 'react'

export default function MultiSelectField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    const options = field.options as SelectOption[] || []
    const selectedValues = Array.isArray(value) ? value : []
    const [isOpen, setIsOpen] = useState(false)

    const handleToggleOption = (optionValue: string) => {
        const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue]
        onChange(newValues)
    }

    const selectedLabels = selectedValues
        .map(val => options.find(opt => opt.value === val)?.label)
        .filter(Boolean)
        .join(', ')

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left flex justify-between items-center ${error ? 'border-red-500' : ''
                    } ${className}`}
            >
                <span className={selectedLabels ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedLabels || field.placeholder || 'Select options...'}
                </span>
                <svg
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {options.map((option, index) => (
                        <label
                            key={index}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option.value)}
                                onChange={() => handleToggleOption(option.value)}
                                className="mr-2 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-900">{option.label}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    )
}
