import { FormFieldProps } from './types'

export default function TextAreaField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    return (
        <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical ${error ? 'border-red-500' : ''
                } ${className}`}
            required={field.required}
        />
    )
}
