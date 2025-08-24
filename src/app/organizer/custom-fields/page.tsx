'use client'

import { useState, useEffect, useCallback } from 'react'
import { CustomField, FormField, FormFieldType } from '@/lib/types/database'
import FormBuilder from '@/components/events/form-builder'
import { HiDocumentText, HiUser, HiGlobeAlt, HiStar, HiPlus } from 'react-icons/hi2'
import { SectionLoader } from '@/components/ui/loading-states'
import ConfirmationModal from '@/components/ui/confirmation-modal'

export default function CustomFieldsPage() {
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<FormFieldType | 'all'>('all')
    const [showPopular, setShowPopular] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [editingField, setEditingField] = useState<CustomField | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

    const fieldTypes: { value: FormFieldType | 'all'; label: string }[] = [
        { value: 'all', label: 'All Types' },
        { value: 'text', label: 'Text' },
        { value: 'textarea', label: 'Text Area' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
        { value: 'select', label: 'Select' },
        { value: 'multiselect', label: 'Multi-Select' },
        { value: 'checkbox', label: 'Checkbox' },
        { value: 'file', label: 'File' },
        { value: 'fide_id', label: 'FIDE Player' },
        { value: 'acf_id', label: 'ACF Player' }
    ]

    const fetchCustomFields = useCallback(async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams()
            if (searchTerm) params.append('search', searchTerm)
            if (filterType !== 'all') params.append('type', filterType)
            if (showPopular) params.append('popular', 'true')

            const response = await fetch(`/api/organizer/custom-fields?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch custom fields')
            }

            const fields = await response.json()
            setCustomFields(fields)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [searchTerm, filterType, showPopular])

    useEffect(() => {
        fetchCustomFields()
    }, [fetchCustomFields])

    const handleCreateField = async (formFields: FormField[]) => {
        if (formFields.length === 0) return

        // Convert FormField to CustomField shape for API
        const newField = formFields[0]
        try {
            const response = await fetch('/api/organizer/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newField)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create field')
            }

            setIsCreating(false)
            fetchCustomFields()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create field')
        }
    }

    const handleUpdateField = async (formFields: FormField[]) => {
        if (!editingField || formFields.length === 0) return

        // Convert FormField to CustomField shape for API
        const updatedField = formFields[0]
        try {
            const response = await fetch(`/api/organizer/custom-fields/${editingField.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedField)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update field')
            }

            setEditingField(null)
            fetchCustomFields()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update field')
        }
    }

    const handleDeleteField = async (fieldId: string) => {
        setFieldToDelete(fieldId)
        setShowConfirmModal(true)
    }

    const confirmDeleteField = async () => {
        if (!fieldToDelete) return

        try {
            const response = await fetch(`/api/organizer/custom-fields/${fieldToDelete}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete field')
            }

            fetchCustomFields()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete field')
        } finally {
            setShowConfirmModal(false)
            setFieldToDelete(null)
        }
    }

    const convertToFormField = (customField: CustomField) => {
        return {
            id: customField.id,
            name: customField.name,
            label: customField.label,
            description: customField.description,
            type: customField.type,
            required: customField.required,
            options: customField.options,
            validation: customField.validation,
            placeholder: customField.placeholder,
            admin_only: customField.admin_only || false,
            config: customField.config || {}
        }
    }

    const filteredFields = customFields.filter(field => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            if (!field.label.toLowerCase().includes(searchLower) &&
                !field.name.toLowerCase().includes(searchLower) &&
                !(field.description?.toLowerCase().includes(searchLower))) {
                return false
            }
        }
        return true
    })

    // If we're in creation mode, show the form directly
    if (isCreating) {
        return (
            <div className="max-w-9xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Custom Field</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Add a new reusable field to your library</p>
                        </div>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <FormBuilder
                        fields={[]}
                        onChange={handleCreateField}
                        context="library"
                        onSaved={() => {
                            setIsCreating(false)
                            fetchCustomFields()
                        }}
                    />
                </div>
            </div>
        )
    }

    return (
        <>
            {loading ? (
                <SectionLoader text="Loading custom fields..." />
            ) : (
                <>
                    {/* Page Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Custom Field Library</h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">Manage reusable form fields for your events</p>
                            </div>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                <HiPlus className="h-4 w-4 mr-2" />
                                Create New Field
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-6">
                            {error}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <HiDocumentText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Total Fields
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {customFields.length}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <HiUser className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                My Fields
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {customFields.filter(f => !f.is_global).length}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <HiGlobeAlt className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Global Fields
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {customFields.filter(f => f.is_global).length}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <HiStar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Most Used
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {Math.max(...customFields.map(f => f.usage_count), 0)}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Search fields..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as FormFieldType | 'all')}
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {fieldTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="showPopular"
                                        checked={showPopular}
                                        onChange={(e) => setShowPopular(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="showPopular" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Show most popular first
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fields List */}
                    {filteredFields.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                            <div className="text-center py-12">
                                <HiDocumentText className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    {customFields.length === 0 ? 'Your field library is empty' : 'No fields match your search'}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {customFields.length === 0
                                        ? 'Create your first reusable form field to get started.'
                                        : 'Try adjusting your search criteria or filters.'
                                    }
                                </p>
                                {customFields.length === 0 && (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        <HiPlus className="h-4 w-4 mr-2" />
                                        Create Your First Field
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredFields.map((field) => (
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
                                                    {field.is_global && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                            Global
                                                        </span>
                                                    )}
                                                </div>
                                                {field.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{field.description}</p>
                                                )}
                                                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Field name: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{field.name}</code></span>
                                                    <span>Used {field.usage_count} times</span>
                                                    <span>Created {new Date(field.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="ml-6 flex items-center space-x-2">
                                                <button
                                                    onClick={() => setEditingField(field)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                >
                                                    Edit
                                                </button>
                                                {!field.is_global && (
                                                    <button
                                                        onClick={() => handleDeleteField(field.id)}
                                                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Edit Field Modal */}
                    {editingField && (
                        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Edit Custom Field</h3>
                                        <button
                                            onClick={() => setEditingField(null)}
                                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <FormBuilder
                                        fields={[convertToFormField(editingField) as FormField]}
                                        onChange={handleUpdateField}
                                        context="library"
                                        onSaved={() => {
                                            setEditingField(null)
                                            fetchCustomFields()
                                        }}
                                    />

                                    <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setEditingField(null)}
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
                        title="Delete Custom Field"
                        message="Are you sure you want to delete this custom field? This action cannot be undone and will affect all events using this field."
                        confirmText="Delete"
                        cancelText="Cancel"
                        variant="danger"
                    />
                </>
            )}
        </>
    )
}