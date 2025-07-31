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
        className={`text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
          error ? 'border-red-500' : ''
        } ${className}`}
        required={field.required}
      />
    </div>
  )
}
