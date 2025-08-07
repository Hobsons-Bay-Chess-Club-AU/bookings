import { FormFieldProps } from './types'

export default function CheckboxField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    return (
        <div className="flex items-center">
            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
                className={`text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 ${error ? 'border-red-500 dark:border-red-400' : ''
                    } ${className}`}
                required={field.required}
            />
        </div>
    )
}
