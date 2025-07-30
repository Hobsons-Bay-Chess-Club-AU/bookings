'use client'

import { useState, useEffect } from 'react'
import { FormField, FormFieldType, CustomField } from '@/lib/types/database'

interface FormBuilderProps {
    fields: FormField[]
    onChange: (fields: FormField[]) => void
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
    const [editingField, setEditingField] = useState<FormField | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [showLibrary, setShowLibrary] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [libraryLoading, setLibraryLoading] = useState(false)
    const [librarySearch, setLibrarySearch] = useState('')
    const [libraryFilter, setLibraryFilter] = useState<FormFieldType | 'all'>('all')
    const [saveToLibrary, setSaveToLibrary] = useState(false)

    const fieldTypes: { value: FormFieldType; label: string; description: string }[] = [
        { value: 'text', label: 'Text Input', description: 'Single line text field' },
        { value: 'textarea', label: 'Text Area', description: 'Multi-line text field' },
        { value: 'email', label: 'Email', description: 'Email address validation' },
        { value: 'phone', label: 'Phone', description: 'Phone number input' },
        { value: 'number', label: 'Number', description: 'Numeric input' },
        { value: 'date', label: 'Date', description: 'Date picker' },
        { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
        { value: 'multiselect', label: 'Multi-Select', description: 'Multiple selections from options' },
        { value: 'checkbox', label: 'Checkbox', description: 'True/false checkbox' },
        { value: 'file', label: 'File Upload', description: 'File attachment' }
    ]

    const createNewField = (): FormField => ({
        id: crypto.randomUUID(),
        name: '',
        label: '',
        description: '',
        type: 'text',
        required: false,
        options: [],
        validation: {},
        placeholder: ''
    })

    // Fetch custom fields from library
    useEffect(() => {
        if (showLibrary) {
            fetchCustomFields()
        }
    }, [showLibrary, librarySearch, libraryFilter])

    const fetchCustomFields = async () => {
        try {
            setLibraryLoading(true)
            
            const params = new URLSearchParams()
            if (librarySearch) params.append('search', librarySearch)
            if (libraryFilter !== 'all') params.append('type', libraryFilter)
            params.append('popular', 'true')

            const response = await fetch(`/api/organizer/custom-fields?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch custom fields')
            }

            const fieldsData = await response.json()
            setCustomFields(fieldsData)
        } catch (error) {
            console.error('Error fetching custom fields:', error)
        } finally {
            setLibraryLoading(false)
        }
    }

    const handleAddField = () => {
        setEditingField(createNewField())
        setIsAdding(true)
        setSaveToLibrary(false)
    }

    const handleAddFromLibrary = () => {
        setShowLibrary(true)
    }

    const handleUseLibraryField = async (customField: CustomField) => {
        // Convert custom field to form field and add to event
        const formField: FormField = {
            id: crypto.randomUUID(),
            name: customField.name,
            label: customField.label,
            description: customField.description,
            type: customField.type,
            required: customField.required,
            options: customField.options,
            validation: customField.validation,
            placeholder: customField.placeholder
        }

        onChange([...fields, formField])
        setShowLibrary(false)

        // Increment usage count
        try {
            await fetch(`/api/organizer/custom-fields/${customField.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...customField,
                    usage_count: customField.usage_count + 1
                })
            })
        } catch (error) {
            console.error('Error updating usage count:', error)
        }
    }

    const handleEditField = (field: FormField) => {
        setEditingField({ ...field })
        setIsAdding(false)
    }

    const handleSaveField = async () => {
        if (!editingField) return

        // Validate required fields
        if (!editingField.name || !editingField.label) {
            alert('Name and label are required')
            return
        }

        // Generate field name from label if empty
        if (!editingField.name) {
            editingField.name = editingField.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
        }

        // Save to event fields
        if (isAdding) {
            onChange([...fields, editingField])
        } else {
            onChange(fields.map(f => f.id === editingField.id ? editingField : f))
        }

        // Save to custom field library if requested
        if (saveToLibrary && isAdding) {
            try {
                const customFieldData = {
                    name: editingField.name,
                    label: editingField.label,
                    description: editingField.description,
                    type: editingField.type,
                    required: editingField.required,
                    options: editingField.options,
                    validation: editingField.validation,
                    placeholder: editingField.placeholder
                }

                const response = await fetch('/api/organizer/custom-fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customFieldData)
                })

                if (!response.ok) {
                    const error = await response.json()
                    console.error('Failed to save to library:', error)
                    alert('Field saved to event but failed to save to library: ' + (error.error || 'Unknown error'))
                }
            } catch (error) {
                console.error('Error saving to library:', error)
                alert('Field saved to event but failed to save to library')
            }
        }

        setEditingField(null)
        setIsAdding(false)
        setSaveToLibrary(false)
    }

    const handleDeleteField = (fieldId: string) => {
        if (confirm('Are you sure you want to delete this field?')) {
            onChange(fields.filter(f => f.id !== fieldId))
        }
    }

    const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
        const currentIndex = fields.findIndex(f => f.id === fieldId)
        if (currentIndex === -1) return

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= fields.length) return

        const newFields = [...fields]
        const [movedField] = newFields.splice(currentIndex, 1)
        newFields.splice(newIndex, 0, movedField)
        onChange(newFields)
    }

    const updateEditingField = (updates: Partial<FormField>) => {
        if (!editingField) return
        setEditingField({ ...editingField, ...updates })
    }

    const addOption = () => {
        if (!editingField) return
        const options = [...(editingField.options || []), '']
        updateEditingField({ options })
    }

    const updateOption = (index: number, value: string) => {
        if (!editingField) return
        const options = [...(editingField.options || [])]
        options[index] = value
        updateEditingField({ options })
    }

    const removeOption = (index: number) => {
        if (!editingField) return
        const options = [...(editingField.options || [])]
        options.splice(index, 1)
        updateEditingField({ options })
    }

    return (
        <div className="space-y-6">
            {/* Form Fields List */}
            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                            Participant Form Fields ({fields.length})
                        </h3>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={handleAddFromLibrary}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Add from Library
                            </button>
                            <button
                                type="button"
                                onClick={handleAddField}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Create New Field
                            </button>
                        </div>
                    </div>
                </div>

                {fields.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-4 block">📝</span>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No custom fields yet
                        </h4>
                        <p className="text-gray-600 mb-6">
                            Add custom fields to collect additional participant information.
                        </p>
                        <div className="flex items-center justify-center space-x-3">
                            <button
                                type="button"
                                onClick={handleAddFromLibrary}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                                Add from Library
                            </button>
                            <button
                                type="button"
                                onClick={handleAddField}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Create New Field
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h4 className="font-medium text-gray-900">{field.label}</h4>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {fieldTypes.find(t => t.value === field.type)?.label}
                                            </span>
                                            {field.required && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        {field.description && (
                                            <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            Field name: <code className="bg-gray-100 px-1 rounded">{field.name}</code>
                                        </div>
                                    </div>

                                    <div className="ml-6 flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(field.id, 'up')}
                                            disabled={index === 0}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(field.id, 'down')}
                                            disabled={index === fields.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEditField(field)}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteField(field.id)}
                                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Field Editor Modal */}
            {editingField && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {isAdding ? 'Add Field' : 'Edit Field'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingField(null)
                                        setIsAdding(false)
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Label *
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.label}
                                            onChange={(e) => updateEditingField({ label: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g., Emergency Contact"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Field Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.name}
                                            onChange={(e) => updateEditingField({ name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="emergency_contact"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Used for data storage (no spaces)</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={editingField.description}
                                        onChange={(e) => updateEditingField({ description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Help text for participants"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Field Type
                                        </label>
                                        <select
                                            value={editingField.type}
                                            onChange={(e) => updateEditingField({ type: e.target.value as FormFieldType })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {fieldTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Placeholder
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.placeholder}
                                            onChange={(e) => updateEditingField({ placeholder: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Placeholder text"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="required"
                                        checked={editingField.required}
                                        onChange={(e) => updateEditingField({ required: e.target.checked })}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                                        Required field
                                    </label>
                                </div>

                                {/* Options for select/multiselect */}
                                {(editingField.type === 'select' || editingField.type === 'multiselect') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Options
                                        </label>
                                        <div className="space-y-2">
                                            {(editingField.options || []).map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => updateOption(index, e.target.value)}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder={`Option ${index + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addOption}
                                                className="text-indigo-600 hover:text-indigo-800 text-sm"
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Validation */}
                                {(editingField.type === 'text' || editingField.type === 'textarea') && (
                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Validation</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Min Length</label>
                                                <input
                                                    type="number"
                                                    value={editingField.validation?.minLength || ''}
                                                    onChange={(e) => updateEditingField({
                                                        validation: {
                                                            ...editingField.validation,
                                                            minLength: e.target.value ? parseInt(e.target.value) : undefined
                                                        }
                                                    })}
                                                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Max Length</label>
                                                <input
                                                    type="number"
                                                    value={editingField.validation?.maxLength || ''}
                                                    onChange={(e) => updateEditingField({
                                                        validation: {
                                                            ...editingField.validation,
                                                            maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                                        }
                                                    })}
                                                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save to Library Option */}
                            {isAdding && (
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="saveToLibrary"
                                            checked={saveToLibrary}
                                            onChange={(e) => setSaveToLibrary(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="saveToLibrary" className="ml-2 text-sm text-gray-700">
                                            Save this field to my library for future use
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        Saved fields can be reused across multiple events
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleSaveField}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    {isAdding ? 'Add Field' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingField(null)
                                        setIsAdding(false)
                                        setSaveToLibrary(false)
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Library Selection Modal */}
            {showLibrary && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add Field from Library</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowLibrary(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Search and Filter */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Search fields..."
                                        value={librarySearch}
                                        onChange={(e) => setLibrarySearch(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={libraryFilter}
                                        onChange={(e) => setLibraryFilter(e.target.value as FormFieldType | 'all')}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="all">All Types</option>
                                        {fieldTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Fields List */}
                            <div className="max-h-96 overflow-y-auto">
                                {libraryLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-500">Loading fields...</p>
                                    </div>
                                ) : customFields.length === 0 ? (
                                    <div className="text-center py-8">
                                        <span className="text-4xl mb-4 block">📝</span>
                                        <h4 className="text-lg font-medium text-gray-900 mb-2">No fields found</h4>
                                        <p className="text-gray-600">
                                            {librarySearch || libraryFilter !== 'all' 
                                                ? 'Try adjusting your search or filter criteria.'
                                                : 'Create some custom fields first to use them here.'
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {customFields.map((customField) => (
                                            <div
                                                key={customField.id}
                                                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer transition-colors"
                                                onClick={() => handleUseLibraryField(customField)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <h5 className="font-medium text-gray-900">{customField.label}</h5>
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {fieldTypes.find(t => t.value === customField.type)?.label}
                                                            </span>
                                                            {customField.required && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    Required
                                                                </span>
                                                            )}
                                                            {customField.is_global && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    Global
                                                                </span>
                                                            )}
                                                        </div>
                                                        {customField.description && (
                                                            <p className="text-sm text-gray-600 mb-2">{customField.description}</p>
                                                        )}
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                            <span>Field name: <code className="bg-gray-100 px-1 rounded">{customField.name}</code></span>
                                                            <span>Used {customField.usage_count} times</span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                        >
                                                            Use Field
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowLibrary(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}