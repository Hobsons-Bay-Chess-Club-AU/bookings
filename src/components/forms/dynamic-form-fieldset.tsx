import { CustomDataValue, FormField } from '@/lib/types/database'
import DynamicField from './form-fields/dynamic-field'

interface DynamicFormFieldsetProps {
    fields: FormField[]
    values: Record<string, CustomDataValue>
    onChange: (field: string, value: CustomDataValue) => void
    errors?: Record<string, string>
    disabled?: boolean
    className?: string
    fieldClassName?: string
    showLabels?: boolean
}

/**
 * Renders a set of dynamic form fields based on the provided field definitions.
 * 
 * @param {DynamicFormFieldsetProps} props - The properties for the dynamic form fieldset.
 * @returns {JSX.Element | null} The rendered form fields or null if no fields are provided.
 */
export default function DynamicFormFieldset({
    fields,
    values,
    onChange,
    errors = {},
    disabled = false,
    className = '',
    fieldClassName = '',
    showLabels = true
}: DynamicFormFieldsetProps) {

    if (!fields || fields.length === 0) {
        return null
    }


    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
            {fields.map((field) => (
                <DynamicField
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    onChange={(value) => onChange(field.name, value)}
                    error={errors[field.name]}
                    disabled={disabled}
                    className={fieldClassName}
                    showLabel={showLabels}
                />
            ))}
        </div>
    )
}
