import { FormFieldProps } from './types'

export default function DateField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    return (
        <input
            type="date"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-500' : ''
                } ${className}`}
            required={field.required}
        />
    )
}
