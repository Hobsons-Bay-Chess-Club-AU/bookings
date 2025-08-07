import { FormFieldProps } from './types'

export default function EmailField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    return (
        <input
            type="email"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${error ? 'border-red-500 dark:border-red-400' : ''
                } ${className}`}
            required={field.required}
        />
    )
}
