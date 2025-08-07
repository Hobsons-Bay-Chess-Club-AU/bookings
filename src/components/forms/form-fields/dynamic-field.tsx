import { FormField } from '@/lib/types/database'
import { FormFieldProps } from './types'
import InfoPopover from './info-popover'

// Import all field components
import TextField from './text-field'
import TextAreaField from './textarea-field'
import EmailField from './email-field'
import PhoneField from './phone-field'
import NumberField from './number-field'
import DateField from './date-field'
import SelectField from './select-field'
import MultiSelectField from './multiselect-field'
import CheckboxField from './checkbox-field'
import FileField from './file-field'
import FidePlayerField from './fide-player-field'
import AcfPlayerField from './acf-player-field'

interface DynamicFieldProps extends Omit<FormFieldProps, 'field'> {
    field: FormField
    showLabel?: boolean
    containerClassName?: string
}

export default function DynamicField({
    field,
    value,
    onChange,
    error,
    className = '',
    disabled = false,
    showLabel = true,
    containerClassName = ''
}: DynamicFieldProps) {

    const renderField = () => {
        const fieldProps: FormFieldProps = {
            field,
            value,
            onChange,
            error,
            className,
            disabled
        }

        switch (field.type) {
            case 'text':
                return <TextField {...fieldProps} />
            case 'textarea':
                return <TextAreaField {...fieldProps} />
            case 'email':
                return <EmailField {...fieldProps} />
            case 'phone':
                return <PhoneField {...fieldProps} />
            case 'number':
                return <NumberField {...fieldProps} />
            case 'date':
                return <DateField {...fieldProps} />
            case 'select':
                return <SelectField {...fieldProps} />
            case 'multiselect':
                return <MultiSelectField {...fieldProps} />
            case 'checkbox':
                return <CheckboxField {...fieldProps} />
            case 'file':
                return <FileField {...fieldProps} />
            case 'fide_id':
                return <FidePlayerField {...fieldProps} />
            case 'acf_id':
                return <AcfPlayerField {...fieldProps} />
            default:
                console.warn(`Unsupported field type: ${field.type}`)
                return <TextField {...fieldProps} />
        }
    }

    const getContainerClassName = () => {
        // Full width for textarea and multiselect fields
        if (field.type === 'textarea') {
            return 'md:col-span-2'
        }
        return ''
    }

    return (
        <div className={`${getContainerClassName()} ${containerClassName}`}>
            {showLabel && (
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="flex items-center">
                            {field.label}
                            {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                        </span>
                    </label>
                    {field.description && (
                        <InfoPopover content={field.description} />
                    )}
                </div>
            )}

            {renderField()}

            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    )
}
