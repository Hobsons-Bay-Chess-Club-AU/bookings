import Image from 'next/image'
import { FormFieldProps } from './types'
import { useState } from 'react'
import { CustomDataValue } from '@/lib/types/database'

export default function FileField({
    field,
    value,
    onChange,
    error,
    className = ''
}: FormFieldProps) {
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onChange(file as unknown as CustomDataValue)

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setPreview(e.target?.result as string)
                }
                reader.readAsDataURL(file)
            } else {
                setPreview(null)
            }
        } else {
            onChange(null)
            setPreview(null)
        }
    }

    return (
        <div className="space-y-2">
            <input
                type="file"
                onChange={handleFileChange}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30 ${error ? 'border-red-500 dark:border-red-400' : ''
                    } ${className}`}
                required={field.required}
                accept={typeof field.validation?.accept === 'string' ? field.validation.accept : undefined}
            />

            {preview && (
                <div className="mt-2">
                    <Image
                        src={preview}
                        alt="Preview"
                        className="max-w-32 max-h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                        width={128}
                        height={128}
                    />
                </div>
            )}

            {value instanceof File && !preview && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    File selected: {value.name || 'Unknown file'}
                </div>
            )}
        </div>
    )
}
