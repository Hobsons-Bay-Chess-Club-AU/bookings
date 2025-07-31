import { FormFieldProps } from './types'
import { useState } from 'react'

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
      onChange(file)
      
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
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-500' : ''
        } ${className}`}
        required={field.required}
        accept={field.validation?.accept || undefined}
      />
      
      {preview && (
        <div className="mt-2">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-w-32 max-h-32 object-cover rounded border"
          />
        </div>
      )}
      
      {value && !preview && (
        <div className="text-sm text-gray-600">
          File selected: {value.name || 'Unknown file'}
        </div>
      )}
    </div>
  )
}
