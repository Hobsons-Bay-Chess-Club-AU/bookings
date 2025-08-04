import { CustomDataValue, FormField } from '@/lib/types/database'


export interface FormFieldProps {
    field: FormField
    value: unknown
    onChange: (value: CustomDataValue) => void
    error?: string
    className?: string
    disabled?: boolean
}

export interface SelectOption {
    value: string
    label: string
}
