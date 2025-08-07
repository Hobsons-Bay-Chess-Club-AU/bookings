'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormField, FormFieldType, CustomField, FormFieldValidation } from '@/lib/types/database'
import ConfirmationModal from '@/components/ui/confirmation-modal'

// Define a type for option objects that's used in the UI but converted to strings/numbers for storage
type OptionObject = { value: string; label: string }
// This type represents options as they're used in the UI (before being converted to the database format)
type FormFieldUIOption = string | number | OptionObject
// This type represents the array of options as used in the UI
type FormFieldUIOptions = FormFieldUIOption[]

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
    const [useAdvancedOptions, setUseAdvancedOptions] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

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
        { value: 'file', label: 'File Upload', description: 'File attachment' },
        { value: 'fide_id', label: 'FIDE Player', description: 'Search and select FIDE-rated chess player' },
        { value: 'acf_id', label: 'ACF Player', description: 'Search and select ACF-rated chess player' }
    ]

    const createNewField = (): FormField => ({
        id: crypto.randomUUID(),
        name: '',
        label: '',
        description: '',
        type: 'text',
        required: false,
        options: [],
        validation: {} as unknown as FormFieldValidation, // Initialize with empty validation
        placeholder: ''
    })

    // Fetch custom fields from library
    const fetchCustomFields = useCallback(async () => {
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
    }, [librarySearch, libraryFilter])

    useEffect(() => {
        if (showLibrary) {
            fetchCustomFields()
        }
    }, [showLibrary, fetchCustomFields])

    const handleAddField = () => {
        setEditingField(createNewField())
        setIsAdding(true)
        setSaveToLibrary(false)
        setUseAdvancedOptions(false)
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
            validation: customField.validation as unknown as FormFieldValidation,
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

        // Check if field uses advanced options (has objects with value/label)
        const hasAdvancedOptions = (field.options || []).some(opt =>
            typeof opt === 'object' && 'value' in opt && 'label' in opt
        )
        setUseAdvancedOptions(hasAdvancedOptions)
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
        setFieldToDelete(fieldId)
        setShowConfirmModal(true)
    }

    const confirmDeleteField = () => {
        if (fieldToDelete) {
            onChange(fields.filter(f => f.id !== fieldToDelete))
            setFieldToDelete(null)
            setShowConfirmModal(false)
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
        if (useAdvancedOptions) {
            // Create UI options with object format, will be converted to string/number when saved
            const uiOptions: FormFieldUIOptions = [...(editingField.options || []).map(opt =>
                typeof opt === 'string' || typeof opt === 'number' ?
                    { value: String(opt), label: String(opt) } :
                    opt as OptionObject
            ), { value: '', label: '' }]

            // When saving to the form field, convert object options to strings
            // Determine if all values are strings or numbers to match the FormField.options type
            const allValues = uiOptions.map(opt =>
                typeof opt === 'object' ? opt.value : opt
            )

            // Check if all values are strings or numbers and create appropriate array type
            const allStrings = allValues.every(val => typeof val === 'string')
            const allNumbers = allValues.every(val => typeof val === 'number')

            if (allStrings) {
                const stringOptions: string[] = allValues as string[]
                updateEditingField({ options: stringOptions })
            } else if (allNumbers) {
                const numberOptions: number[] = allValues as number[]
                updateEditingField({ options: numberOptions })
            } else {
                // If mixed types, convert all to strings for consistency
                const stringOptions: string[] = allValues.map(val => String(val))
                updateEditingField({ options: stringOptions })
            }
        } else {
            const options: string[] = [...(editingField.options || []), ''].map(opt => String(opt))
            updateEditingField({ options })
        }
    }

    const updateOption = (index: number, value: string, field?: 'value' | 'label') => {
        if (!editingField) return
        // Create a UI representation of the options for editing
        const uiOptions: FormFieldUIOptions = [...(editingField.options || [])].map(opt => {
            // If we're using advanced options, convert string/number options to objects
            if (useAdvancedOptions && (typeof opt === 'string' || typeof opt === 'number')) {
                return { value: String(opt), label: String(opt) };
            }
            return opt;
        });

        if (useAdvancedOptions && field) {
            const option = typeof uiOptions[index] === 'object' ?
                uiOptions[index] as OptionObject :
                { value: '', label: '' };
            uiOptions[index] = { ...option, [field]: value } as OptionObject;
        } else {
            uiOptions[index] = value;
        }

        // Convert back to database format (string[] | number[])
        const allValues = uiOptions.map(opt =>
            typeof opt === 'object' ? opt.value : opt
        );

        // Check if all values are strings or numbers and create appropriate array type
        const allStrings = allValues.every(val => typeof val === 'string')
        const allNumbers = allValues.every(val => typeof val === 'number')

        if (allStrings) {
            const stringOptions: string[] = allValues as string[]
            updateEditingField({ options: stringOptions })
        } else if (allNumbers) {
            const numberOptions: number[] = allValues as number[]
            updateEditingField({ options: numberOptions })
        } else {
            // If mixed types, convert all to strings for consistency
            const stringOptions: string[] = allValues.map(val => String(val))
            updateEditingField({ options: stringOptions })
        }
    }

    const removeOption = (index: number) => {
        if (!editingField) return
        const currentOptions = [...(editingField.options || [])]
        currentOptions.splice(index, 1)

        // Ensure we maintain the correct type (string[] or number[])
        const allStrings = currentOptions.every(val => typeof val === 'string')
        const allNumbers = currentOptions.every(val => typeof val === 'number')

        if (allStrings) {
            const stringOptions: string[] = currentOptions as string[]
            updateEditingField({ options: stringOptions })
        } else if (allNumbers) {
            const numberOptions: number[] = currentOptions as number[]
            updateEditingField({ options: numberOptions })
        } else {
            // If mixed types, convert all to strings for consistency
            const stringOptions: string[] = currentOptions.map(val => String(val))
            updateEditingField({ options: stringOptions })
        }
    }

    const toggleAdvancedOptions = () => {
        if (!editingField) return

        const newUseAdvanced = !useAdvancedOptions
        setUseAdvancedOptions(newUseAdvanced)

        if (newUseAdvanced) {
            // Keep the original options type since we're just changing the UI representation
            // The actual database format doesn't change here
            updateEditingField({ options: editingField.options })
        } else {
            // When switching to simple mode, ensure all options are strings
            const simpleOptions: string[] = (editingField.options || []).map(opt =>
                typeof opt === 'object' && 'value' in opt && 'label' in opt ?
                    String((opt as OptionObject).value) || String((opt as OptionObject).label) || '' :
                    String(opt)
            )
            updateEditingField({ options: simpleOptions })
        }
    }

    return (
        <div className="space-y-6">
            {/* Form Fields List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No custom fields yet
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{field.label}</h4>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                {fieldTypes.find(t => t.value === field.type)?.label}
                                            </span>
                                            {field.required && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        {field.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{field.description}</p>
                                        )}
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Field name: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{field.name}</code>
                                        </div>
                                    </div>

                                    <div className="ml-6 flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(field.id || '', 'up')}
                                            disabled={index === 0}
                                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(field.id || '', 'down')}
                                            disabled={index === fields.length - 1}
                                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEditField(field)}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteField(field.id || '')}
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
                <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {isAdding ? 'Add Field' : 'Edit Field'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingField(null)
                                        setIsAdding(false)
                                    }}
                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Label *
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.label}
                                            onChange={(e) => updateEditingField({ label: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                            placeholder="e.g., Emergency Contact"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Field Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.name}
                                            onChange={(e) => updateEditingField({ name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                            placeholder="emergency_contact"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for data storage (no spaces)</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={editingField.description}
                                        onChange={(e) => updateEditingField({ description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                        placeholder="Help text for participants"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Field Type
                                        </label>
                                        <select
                                            value={editingField.type}
                                            onChange={(e) => updateEditingField({ type: e.target.value as FormFieldType })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            {fieldTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Placeholder
                                        </label>
                                        <input
                                            type="text"
                                            value={editingField.placeholder}
                                            onChange={(e) => updateEditingField({ placeholder: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
                                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Required field
                                    </label>
                                </div>

                                {/* Options for select/multiselect */}
                                {(editingField.type === 'select' || editingField.type === 'multiselect') && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Options
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="advancedOptions"
                                                    checked={useAdvancedOptions}
                                                    onChange={toggleAdvancedOptions}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                                                />
                                                <label htmlFor="advancedOptions" className="text-xs text-gray-600 dark:text-gray-400">
                                                    Advanced (separate value & label)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {(editingField.options || []).map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    {useAdvancedOptions ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={typeof option === 'object' && 'value' in option ? (option as OptionObject).value : String(option)}
                                                                onChange={(e) => updateOption(index, e.target.value, 'value')}
                                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                                                placeholder="Value (stored)"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={typeof option === 'object' && 'label' in option ? (option as OptionObject).label : String(option)}
                                                                onChange={(e) => updateOption(index, e.target.value, 'label')}
                                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                                                placeholder="Label (displayed)"
                                                            />
                                                        </>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={typeof option === 'string' ? option : (typeof option === 'object' && ('label' in option || 'value' in option) ?
                                                                (option as OptionObject).label || (option as OptionObject).value || '' :
                                                                String(option))}
                                                            onChange={(e) => updateOption(index, e.target.value)}
                                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                                            placeholder={`Option ${index + 1}`}
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(index)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addOption}
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
                                            >
                                                + Add Option
                                            </button>
                                        </div>

                                        {useAdvancedOptions && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                Advanced mode: Value is stored in database, Label is shown to users
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Validation */}
                                {(editingField.type === 'text' || editingField.type === 'textarea') && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Validation</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Length</label>
                                                <input
                                                    type="number"
                                                    value={(editingField.validation?.minLength || '') as string}
                                                    onChange={(e) => updateEditingField({
                                                        validation: {
                                                            ...(editingField.validation || {}),
                                                            minLength: e.target.value ? parseInt(e.target.value) : undefined
                                                        } as unknown as FormFieldValidation
                                                    })}
                                                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max Length</label>
                                                <input
                                                    type="number"
                                                    value={(editingField.validation?.maxLength || '') as string}
                                                    onChange={(e) => updateEditingField({
                                                        validation: {
                                                            ...(editingField.validation || {}),
                                                            maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                                        } as unknown as FormFieldValidation
                                                    })}
                                                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save to Library Option */}
                            {isAdding && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="saveToLibrary"
                                            checked={saveToLibrary}
                                            onChange={(e) => setSaveToLibrary(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="saveToLibrary" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Save this field to my library for future use
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
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
                                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium"
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
                <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Add Field from Library</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowLibrary(false)}
                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
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
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={libraryFilter}
                                        onChange={(e) => setLibraryFilter(e.target.value as FormFieldType | 'all')}
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading fields...</p>
                                    </div>
                                ) : customFields.length === 0 ? (
                                    <div className="text-center py-8">
                                        <span className="text-4xl mb-4 block">📝</span>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No fields found</h4>
                                        <p className="text-gray-600 dark:text-gray-400">
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
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition-colors"
                                                onClick={() => handleUseLibraryField(customField)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <h5 className="font-medium text-gray-900 dark:text-gray-100">{customField.label}</h5>
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                                {fieldTypes.find(t => t.value === customField.type)?.label}
                                                            </span>
                                                            {customField.required && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                                                    Required
                                                                </span>
                                                            )}
                                                            {customField.is_global && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                                    Global
                                                                </span>
                                                            )}
                                                        </div>
                                                        {customField.description && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{customField.description}</p>
                                                        )}
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                                            <span>Field name: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{customField.name}</code></span>
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

                            <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowLibrary(false)}
                                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    setFieldToDelete(null)
                }}
                onConfirm={confirmDeleteField}
                title="Delete Field"
                message="Are you sure you want to delete this field? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}