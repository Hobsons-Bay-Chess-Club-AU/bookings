# Dynamic Form System

This directory contains a comprehensive, reusable dynamic form system that supports all field types defined in the database schema.

## Components

### `DynamicFormFieldset`
The main component that renders a complete fieldset of dynamic form fields.

```tsx
import { DynamicFormFieldset } from '@/components/forms'

const formFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'interests', label: 'Interests', type: 'multiselect', required: false, options: [...] }
]

<DynamicFormFieldset
  fields={formFields}
  values={formData}
  onChange={(fieldName, value) => setFormData({...formData, [fieldName]: value})}
  errors={errors}
/>
```

### `DynamicField`
Individual field component for rendering a single dynamic field.

```tsx
import { DynamicField } from '@/components/forms'

<DynamicField
  field={field}
  value={value}
  onChange={handleChange}
  error={error}
/>
```

### `InfoPopover`
A reusable component that displays help text in a clean popover when clicking an info icon.

```tsx
import { InfoPopover } from '@/components/forms'

<InfoPopover content="This is helpful information about the field" />
```

## Supported Field Types

- **text**: Basic text input
- **textarea**: Multi-line text area
- **email**: Email input with validation
- **phone**: Phone number input
- **number**: Numeric input
- **date**: Date picker
- **select**: Single-select dropdown
- **multiselect**: Multi-select dropdown with checkboxes
- **checkbox**: Boolean checkbox
- **file**: File upload with preview for images

## Features

- **Type-safe**: Full TypeScript support
- **Validation**: Built-in validation for required fields and field types
- **Responsive**: Mobile-friendly layout with grid system
- **Accessible**: Proper labels, ARIA attributes, and keyboard navigation
- **Clean UI**: Help text displayed via info icon popovers to keep UI clean
- **Extensible**: Easy to add new field types
- **Reusable**: Works across different forms and contexts

## Advanced Usage

### Help Text with Info Popovers
When a field has a `description` property, it's automatically displayed as an info icon next to the label. Users can click the icon to see the help text in a popover:

```tsx
const fieldWithHelp = {
  name: 'complex_field',
  label: 'Complex Field',
  type: 'text',
  required: true,
  description: 'This field requires specific formatting. Please enter data in the format: XXX-YYY-ZZZ'
}
```

### Custom Styling
```tsx
<DynamicFormFieldset
  fields={fields}
  values={values}
  onChange={onChange}
  className="custom-form-grid"
  fieldClassName="custom-field-style"
/>
```

### Error Handling
```tsx
const [errors, setErrors] = useState<Record<string, string>>({})

const validateForm = () => {
  const newErrors: Record<string, string> = {}
  
  fields.forEach(field => {
    if (field.required && !isFieldValid(field, values[field.name])) {
      newErrors[field.name] = `${field.label} is required`
    }
  })
  
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### File Handling
For file fields, the component returns the actual File object:
```tsx
const handleFileUpload = async (fieldName: string, file: File) => {
  // Upload logic here
  const url = await uploadFile(file)
  // Store URL instead of file object if needed
}
```
