import { FormField } from '@/lib/types/database'

/**
 * Validates if a field value meets the field requirements
 */
export function isFieldValid(field: FormField, value: unknown): boolean {
    if (!field.required) return true

    switch (field.type) {
        case 'checkbox':
            return Boolean(value)
        case 'multiselect':
            return Array.isArray(value) && value.length > 0
        case 'file':
            return value !== null && value !== undefined
        case 'text':
        case 'textarea':
        case 'email':
        case 'phone':
        case 'number':
        case 'date':
        case 'select':
        default:
            return value !== null && value !== undefined && value !== ''
    }
}

/**
 * Validates multiple fields and returns error messages
 */
export function validateFormFields(
    fields: FormField[],
    values: Record<string, unknown>
): Record<string, string> {
    const errors: Record<string, string> = {}

    fields.forEach(field => {
        if (!isFieldValid(field, values[field.name])) {
            errors[field.name] = `${field.label} is required`
        }

        // Add specific validation for different field types
        const value = values[field.name]
        if (typeof value === 'string' && field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) {
                errors[field.name] = 'Please enter a valid email address'
            }
        }
    })

    return errors
}

/**
 * Gets the default value for a field type
 */
export function getDefaultFieldValue(field: FormField): unknown {
    switch (field.type) {
        case 'checkbox':
            return false
        case 'multiselect':
            return []
        case 'number':
            return ''
        case 'file':
            return null
        default:
            return ''
    }
}

/**
 * Formats a field value for display
 */
export function formatFieldValue(field: FormField, value: unknown): string {
    if (value === null || value === undefined) return ''

    switch (field.type) {
        case 'checkbox':
            return value ? 'Yes' : 'No'
        case 'multiselect':
            if (Array.isArray(value)) {
                let options: Array<{ value: string, label: string }> = [];
                if (Array.isArray(field.options) && field.options.length > 0 && typeof field.options[0] === 'object' && 'value' in field.options[0] && 'label' in field.options[0]) {
                    options = field.options as unknown as Array<{ value: string, label: string }>;
                }
                return value
                    .map(val => options.find(opt => opt.value === val)?.label || String(val))
                    .join(', ')
            }
            return ''
        case 'select':
            let options: Array<{ value: string, label: string }> = [];
            if (Array.isArray(field.options) && field.options.length > 0 && typeof field.options[0] === 'object' && 'value' in field.options[0] && 'label' in field.options[0]) {
                options = field.options as unknown as Array<{ value: string, label: string }>;
            }
            return options.find(opt => opt.value === value)?.label || (typeof value === 'string' ? value : '')
        case 'file':
            return (value && typeof value === 'object' && 'name' in value && typeof (value as { name?: unknown }).name === 'string')
                ? (value as { name: string }).name
                : 'File uploaded'
        default:
            return String(value)
    }
}
