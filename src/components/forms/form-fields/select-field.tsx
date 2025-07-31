import { FormFieldProps, SelectOption } from './types'

export default function SelectField({ 
  field, 
  value, 
  onChange, 
  error,
  className = ''
}: FormFieldProps) {
  const options = field.options as SelectOption[] || []
  
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? 'border-red-500' : ''
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
