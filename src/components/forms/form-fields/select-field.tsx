import { FormFieldProps, SelectOption } from './types'

export default function SelectField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    const options = field.options as unknown as SelectOption[] || []

    return (
        <select
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${error ? 'border-red-500 dark:border-red-400' : ''
                } ${className}`}
            required={field.required}
        >
            <option value="">{field.placeholder || 'Select an option...'}</option>
            {options.map((option, index) => (
                <option key={index} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}
