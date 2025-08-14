import { useState, useRef, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import Image from 'next/image'
import Link from 'next/link'
import { HiExclamationTriangle, HiCheckCircle, HiExclamationCircle, HiPhoto, HiArrowUpTray, HiTrash } from 'react-icons/hi2'
import MarkdownEditor from '@/components/ui/markdown-editor'
import FormBuilder from '@/components/events/form-builder'
import TimelineBuilder from '@/components/events/timeline-builder'
import { FormField, RefundTimelineItem } from '@/lib/types/database'
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '@/lib/utils/timezone'

export interface EventFormValues {
    title: string
    description: string
    event_summary: string
    start_date: string
    end_date: string
    entry_close_date: string
    location: string
    price: string
    max_attendees: string
    image_url: string
    organizer_name: string
    organizer_email: string
    organizer_phone: string
    timezone: string
    status: 'draft' | 'published' | string
    is_promoted: boolean
    location_settings: {
        map_url: string
        direction_url: string
    }
    settings: {
        terms_conditions: string
    }
}

interface EventFormProps {
    mode: 'create' | 'edit'
    initialValues?: Partial<EventFormValues>
    initialFormFields?: FormField[]
    initialRefundTimeline?: RefundTimelineItem[]
    onSubmit: (values: EventFormValues, formFields: FormField[], refundTimeline: RefundTimelineItem[]) => Promise<void>
    loading: boolean
    error: string
    success: string
    setError: (msg: string) => void
    setSuccess: (msg: string) => void
    submitLabel?: string
    cancelHref?: string
    afterSubmit?: () => void
}

export default function EventForm({
    mode,
    initialValues = {},
    initialFormFields = [],
    initialRefundTimeline = [],
    onSubmit,
    loading,
    error,
    success,
    setError,
    setSuccess,
    submitLabel = 'Save',
    cancelHref = '/organizer',
    afterSubmit
}: EventFormProps) {
    const [formData, setFormData] = useState<EventFormValues>({
        title: '',
        description: '',
        event_summary: '',
        start_date: '',
        end_date: '',
        entry_close_date: '',
        location: '',
        price: '',
        max_attendees: '',
        image_url: '',
        organizer_name: '',
        organizer_email: '',
        organizer_phone: '',
        timezone: DEFAULT_TIMEZONE,
        status: 'draft',
        is_promoted: false,
        location_settings: {
            map_url: '',
            direction_url: ''
        },
        settings: {
            terms_conditions: ''
        },
        ...initialValues
    })
    const [formFields, setFormFields] = useState<FormField[]>(initialFormFields)
    const [refundTimeline, setRefundTimeline] = useState<RefundTimelineItem[]>(initialRefundTimeline)
    const [enableRefunds, setEnableRefunds] = useState(initialRefundTimeline.length > 0)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const errorRef = useRef<HTMLDivElement>(null)
    const firstFieldErrorRef = useRef<HTMLParagraphElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Auto-scroll to error message when error appears
    useEffect(() => {
        if (error && errorRef.current) {
            errorRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            })
        }
    }, [error])

    // Auto-scroll to first field error when field errors appear
    useEffect(() => {
        if (Object.keys(fieldErrors).length > 0 && firstFieldErrorRef.current) {
            firstFieldErrorRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            })
        }
    }, [fieldErrors])

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}
        
        // Required field validation
        if (!formData.title.trim()) {
            errors.title = 'Event title is required'
        }
        
        // Description validation
        if (formData.description && formData.description.length > 10000) {
            errors.description = 'Description is too long (maximum 10,000 characters)'
        }
        
        // Event summary validation
        if (formData.event_summary && formData.event_summary.length > 200) {
            errors.event_summary = 'Event summary is too long (maximum 200 characters)'
        }
        
        if (!formData.start_date) {
            errors.start_date = 'Start date is required'
        }
        
        if (!formData.end_date) {
            errors.end_date = 'End date is required'
        }
        
        if (!formData.location.trim()) {
            errors.location = 'Location is required'
        }
        
        // Date validation
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date)
            const endDate = new Date(formData.end_date)
            
            if (startDate >= endDate) {
                errors.end_date = 'End date must be after start date'
            }
            
            if (startDate < new Date()) {
                errors.start_date = 'Start date cannot be in the past'
            }
        }
        
        // Entry close date validation
        if (formData.entry_close_date) {
            const entryCloseDate = new Date(formData.entry_close_date)
            const startDate = new Date(formData.start_date)
            
            if (entryCloseDate >= startDate) {
                // errors.entry_close_date = 'Entry close date must be before the event start date'
            }
        }
        
        // Price validation
        if (formData.price && parseFloat(formData.price) < 0) {
            errors.price = 'Price cannot be negative'
        }
        
        // Max attendees validation
        if (formData.max_attendees && parseInt(formData.max_attendees) < 1) {
            errors.max_attendees = 'Maximum attendees must be at least 1'
        }
        
        // Email validation
        if (formData.organizer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.organizer_email)) {
            errors.organizer_email = 'Please enter a valid email address'
        }
        
        // Phone validation (basic)
        if (formData.organizer_phone && formData.organizer_phone.length < 8) {
            errors.organizer_phone = 'Please enter a valid phone number'
        }
        
        // Terms & conditions validation
        if (formData.settings.terms_conditions && formData.settings.terms_conditions.length > 10000) {
            errors.terms_conditions = 'Terms & conditions is too long (maximum 10,000 characters)'
        }
        
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const clearFieldError = (fieldName: string) => {
        setFieldErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[fieldName]
            return newErrors
        })
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        clearFieldError(name)
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked
            setFormData(prev => ({ ...prev, [name]: checked }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleDescriptionChange = (content: string) => {
        setFormData(prev => ({ ...prev, description: content }))
    }

    const getFieldClasses = (fieldName: string) => {
        const baseClasses = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        const hasError = fieldErrors[fieldName]
        if (hasError) {
            return `${baseClasses} border-red-300 dark:border-red-500 focus:ring-red-500 focus:border-red-500`
        }
        return `${baseClasses} border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setFieldErrors({})
        if (!validateForm()) {
            setError('Please fix the errors below before saving the event')
            return
        }
        await onSubmit(formData, formFields, refundTimeline)
        if (afterSubmit) afterSubmit()
    }

    const handleSelectImageFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file')
            return
        }
        if (file.size > 8 * 1024 * 1024) { // 8MB limit
            setError('Image is too large. Maximum size is 8MB')
            return
        }
        setError('')
        setSuccess('')
        setUploadingImage(true)
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                contentType: file.type
            })
            setFormData(prev => ({ ...prev, image_url: blob.url }))
            setSuccess('Image uploaded successfully')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload image'
            setError(message)
        } finally {
            setUploadingImage(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
                <div ref={errorRef} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded flex items-start">
                    <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded flex items-start">
                    <HiCheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Success</p>
                        <p className="text-sm">{success}</p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        className={getFieldClasses('title')}
                        placeholder="Enter event title"
                    />
                    {fieldErrors.title && (
                        <p ref={firstFieldErrorRef} className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.title}
                        </p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (Markdown)
                    </label>
                    <MarkdownEditor value={formData.description} onChange={handleDescriptionChange} placeholder="Describe your event using Markdown formatting..." />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="event_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Summary (Max 200 characters)
                    </label>
                    <textarea
                        id="event_summary"
                        name="event_summary"
                        value={formData.event_summary}
                        onChange={handleChange}
                        maxLength={200}
                        rows={3}
                        className={getFieldClasses('event_summary')}
                        placeholder="Enter a brief summary of your event..."
                    />
                    <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formData.event_summary?.length || 0} / 200 characters</div>
                        {fieldErrors.event_summary && (
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                <HiExclamationCircle className="h-4 w-4 mr-1" />
                                {fieldErrors.event_summary}
                            </p>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This summary will be displayed on event cards and social sharing.</p>
                </div>

                <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input type="datetime-local" id="start_date" name="start_date" required value={formData.start_date} onChange={handleChange} className={getFieldClasses('start_date')} />
                    {fieldErrors.start_date && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.start_date}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input type="datetime-local" id="end_date" name="end_date" required value={formData.end_date} onChange={handleChange} className={getFieldClasses('end_date')} />
                    {fieldErrors.end_date && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.end_date}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="entry_close_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Entry Close Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        id="entry_close_date"
                        name="entry_close_date"
                        value={formData.entry_close_date || ''}
                        onChange={handleChange}
                        className={getFieldClasses('entry_close_date')}
                        placeholder="Leave empty for no entry close date"
                    />
                </div>

                <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event Timezone <span className="text-red-500">*</span>
                    </label>
                    <select id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} className={getFieldClasses('timezone')}>
                        {TIMEZONE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="location" name="location" required value={formData.location} onChange={handleChange} className={getFieldClasses('location')} placeholder="Event location or venue" />
                    {fieldErrors.location && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.location}
                        </p>
                    )}
                </div>

                {/* Location Settings */}
                <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Location Settings</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add embedded map and directions to help attendees find your event location.</p>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="map_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Embedded Map URL
                    </label>
                    <input
                        type="url"
                        id="map_url"
                        name="map_url"
                        value={formData.location_settings.map_url}
                        onChange={(e) => {
                            let value = e.target.value.trim();
                            // If user pasted an iframe, extract the src attribute
                            const iframeMatch = value.match(/<iframe[^>]*src=["']([^"']+)["']/i);
                            if (iframeMatch) {
                                value = iframeMatch[1];
                            }
                            setFormData(prev => ({
                                ...prev,
                                location_settings: {
                                    ...prev.location_settings,
                                    map_url: value
                                }
                            }));
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://www.google.com/maps/embed?pb=... or paste the &lt;iframe&gt; code here"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Paste the embed URL from Google Maps, or the full &lt;iframe&gt; code. The URL will be extracted automatically.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="direction_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Directions URL
                    </label>
                    <input
                        type="url"
                        id="direction_url"
                        name="direction_url"
                        value={formData.location_settings.direction_url || ''}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            location_settings: {
                                ...prev.location_settings,
                                direction_url: e.target.value
                            }
                        }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://maps.google.com/directions?daddr=..."
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Link to directions (optional). This will be shown as a &quot;Get Directions&quot; button.
                    </p>
                </div>

                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ticket Price (AUD)
                    </label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        className={getFieldClasses('price')}
                        placeholder="0.00"
                    />
                    {fieldErrors.price && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.price}
                        </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave empty or set to 0 for free events</p>
                </div>

                <div>
                    <label htmlFor="max_attendees" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Maximum Attendees
                    </label>
                    <input
                        type="number"
                        id="max_attendees"
                        name="max_attendees"
                        min="1"
                        value={formData.max_attendees}
                        onChange={handleChange}
                        className={getFieldClasses('max_attendees')}
                        placeholder="Leave empty for unlimited"
                    />
                    {fieldErrors.max_attendees && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.max_attendees}
                        </p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event Image
                    </label>
                    <div className="mt-1 space-y-3">
                        <div className="flex items-center space-x-3">
                            <input
                                type="url"
                                id="image_url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="https://example.com/image.jpg"
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleSelectImageFile}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                title="Upload image"
                            >
                                <HiArrowUpTray className="h-4 w-4 mr-2" />
                                {uploadingImage ? 'Uploading...' : 'Upload'}
                            </button>
                            {formData.image_url && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                    className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-700 rounded-md bg-white dark:bg-gray-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    title="Remove image"
                                >
                                    <HiTrash className="h-4 w-4 mr-2" />
                                    Remove
                                </button>
                            )}
                        </div>
                        {formData.image_url && (
                            <div className="relative">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center"><HiPhoto className="h-4 w-4 mr-1" /> Preview</div>
                                <div className="relative w-full h-56">
                                    <Image
                                        src={formData.image_url}
                                        alt="Event preview"
                                        fill
                                        className="object-cover rounded-md border border-gray-200 dark:border-gray-700"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        priority
                                    />
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">Paste an image URL or upload a file (PNG, JPG, WEBP, max 8MB).</p>
                    </div>
                </div>

                {/* Organizer Contact Information */}
                <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Organizer Contact Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Contact details for this specific event. Leave empty to use your profile information.</p>
                </div>

                <div>
                    <label htmlFor="organizer_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Organizer Name
                    </label>
                    <input
                        type="text"
                        id="organizer_name"
                        name="organizer_name"
                        value={formData.organizer_name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Leave empty to use profile name"
                    />
                </div>

                <div>
                    <label htmlFor="organizer_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Organizer Email
                    </label>
                    <input
                        type="email"
                        id="organizer_email"
                        name="organizer_email"
                        value={formData.organizer_email}
                        onChange={handleChange}
                        className={getFieldClasses('organizer_email')}
                        placeholder="Leave empty to use profile email"
                    />
                    {fieldErrors.organizer_email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.organizer_email}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="organizer_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Organizer Phone
                    </label>
                    <input
                        type="tel"
                        id="organizer_phone"
                        name="organizer_phone"
                        value={formData.organizer_phone}
                        onChange={handleChange}
                        className={getFieldClasses('organizer_phone')}
                        placeholder="Leave empty to use profile phone"
                    />
                    {fieldErrors.organizer_phone && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                            <HiExclamationCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.organizer_phone}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                    </label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="entry_closed">Entry Closed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Only published events are visible to users</p>
                </div>

                <div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_promoted"
                            name="is_promoted"
                            checked={formData.is_promoted}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                        <label htmlFor="is_promoted" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Promote on Landing Page
                        </label>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Promoted events appear first on the landing page</p>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Terms & Conditions (Markdown)
                    </label>
                    <MarkdownEditor
                        value={formData.settings.terms_conditions}
                        onChange={(content) => {
                            clearFieldError('terms_conditions')
                            setFormData(prev => ({
                                ...prev,
                                settings: {
                                    ...prev.settings,
                                    terms_conditions: content
                                }
                            }))
                        }}
                        placeholder="Enter the terms and conditions using Markdown formatting..."
                    />
                    <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formData.settings.terms_conditions?.length || 0} / 10,000 characters
                        </div>
                        {fieldErrors.terms_conditions && (
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                <HiExclamationCircle className="h-4 w-4 mr-1" />
                                {fieldErrors.terms_conditions}
                            </p>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        These terms will be displayed to participants during booking and included on their tickets. Use Markdown for formatting.
                    </p>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Participant Information Form</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Define what information you want to collect from each participant during booking.</p>
                <FormBuilder fields={formFields} onChange={setFormFields} />
            </div>

            {/* Refund Timeline */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Refund Policy</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure automatic refund policies based on timing.</p>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="enable_refunds"
                            checked={enableRefunds}
                            onChange={(e) => setEnableRefunds(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                        <label htmlFor="enable_refunds" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Refunds
                        </label>
                    </div>
                </div>

                {enableRefunds && (
                    <TimelineBuilder
                        eventStartDate={formData.start_date}
                        refundTimeline={refundTimeline}
                        onChange={setRefundTimeline}
                    />
                )}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Link
                    href={cancelHref}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : submitLabel}
                </button>
            </div>
        </form>
    )
}
