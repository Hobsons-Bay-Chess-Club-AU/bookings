import { FormField } from '@/lib/types/database'

export interface FormFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  className?: string
  disabled?: boolean
}

export interface SelectOption {
  value: string
  label: string
}
