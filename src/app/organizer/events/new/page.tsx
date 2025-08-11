'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HiExclamationTriangle, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi2'
import MarkdownEditor from '@/components/ui/markdown-editor'
import FormBuilder from '@/components/events/form-builder'
import Breadcrumb from '@/components/ui/breadcrumb'
import { FormField } from '@/lib/types/database'
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '@/lib/utils/timezone'

export default function NewEventPage() {
    const [formData, setFormData] = useState({
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
        status: 'draft' as 'draft' | 'published',
        is_promoted: false,
        location_settings: {
            map_url: '',
            direction_url: ''
        },
        settings: {
            terms_conditions: ''
        }
    })
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const router = useRouter()
    const supabase = createClient()
    const errorRef = useRef<HTMLDivElement>(null)
    const firstFieldErrorRef = useRef<HTMLParagraphElement>(null)

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
        
        // Event summary validation
        if (formData.event_summary && formData.event_summary.length > 200) {
            errors.event_summary = 'Event summary is too long (maximum 200 characters)'
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        setFieldErrors({})

        try {
            // Validate form before submission
            if (!validateForm()) {
                setError('Please fix the errors below before creating the event')
                setLoading(false)
                return
            }

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                throw new Error('You must be logged in to create events')
            }

            // Generate alias if event is being published
            let alias: string | null = null
            if (formData.status === 'published') {
                try {
                    const response = await fetch('/api/events/generate-alias', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })

                    if (response.ok) {
                        const data = await response.json()
                        alias = data.alias
                    } else {
                        throw new Error('Failed to generate alias')
                    }
                } catch {
                    throw new Error('Failed to generate alias for event')
                }
            }

            // Sanitize and encode event summary to handle special characters
            let sanitizedSummary: string | null = null
            
            try {
                if (formData.event_summary) {
                    sanitizedSummary = formData.event_summary
                        .replace(/\r\n/g, '\n') // Normalize line endings
                        .replace(/\r/g, '\n')    // Convert remaining carriage returns
                        .trim()                  // Remove leading/trailing whitespace
                }

                console.log('🔄 Sanitizing event summary...', {
                    originalLength: formData.event_summary?.length,
                    sanitizedLength: sanitizedSummary?.length,
                    hasSpecialChars: sanitizedSummary?.includes("'") || sanitizedSummary?.includes('"')
                })
            } catch (sanitizeError) {
                console.error('❌ Error sanitizing event summary:', sanitizeError)
                throw new Error('There was an issue processing the event summary content. Please try again.')
            }

            // Sanitize and encode terms & conditions to handle special characters
            let sanitizedTermsConditions: string | null = null
            
            try {
                if (formData.settings.terms_conditions) {
                    sanitizedTermsConditions = formData.settings.terms_conditions
                        .replace(/\r\n/g, '\n') // Normalize line endings
                        .replace(/\r/g, '\n')    // Convert remaining carriage returns
                        .trim()                  // Remove leading/trailing whitespace
                }

                console.log('🔄 Sanitizing terms & conditions...', {
                    originalLength: formData.settings.terms_conditions?.length,
                    sanitizedLength: sanitizedTermsConditions?.length,
                    hasSpecialChars: sanitizedTermsConditions?.includes("'") || sanitizedTermsConditions?.includes('"')
                })
            } catch (sanitizeError) {
                console.error('❌ Error sanitizing terms & conditions:', sanitizeError)
                throw new Error('There was an issue processing the terms & conditions content. Please try again.')
            }

            // Create event
            const { error: eventError } = await supabase
                .from('events')
                .insert({
                    title: formData.title,
                    description: formData.description || null,
                    event_summary: sanitizedSummary,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    entry_close_date: formData.entry_close_date || null,
                    location: formData.location,
                    price: parseFloat(formData.price) || 0,
                    max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
                    image_url: formData.image_url || null,
                    organizer_name: formData.organizer_name || null,
                    organizer_email: formData.organizer_email || null,
                    organizer_phone: formData.organizer_phone || null,
                    timezone: formData.timezone,
                    status: formData.status,
                    alias: alias,
                    organizer_id: user.id,
                    custom_form_fields: formFields,
                    is_promoted: formData.is_promoted,
                    location_settings: formData.location_settings,
                    settings: {
                        terms_conditions: sanitizedTermsConditions
                    }
                })
                .select()
                .single()

            if (eventError) {
                throw new Error(eventError.message)
            }

            setSuccess('Event created successfully!')
            setError('')
            
            // Redirect after a short delay to show success message
            setTimeout(() => {
                router.push('/organizer')
            }, 1500)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating the event'
            setError(errorMessage)
            console.error('Event creation error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        
        // Clear field error when user starts typing
        clearFieldError(name)
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked
            setFormData(prev => ({ ...prev, [name]: checked }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleDescriptionChange = (content: string) => {
        setFormData(prev => ({
            ...prev,
            description: content
        }))
    }

    const getFieldClasses = (fieldName: string) => {
        const baseClasses = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        const hasError = fieldErrors[fieldName]
        
        if (hasError) {
            return `${baseClasses} border-red-300 dark:border-red-500 focus:ring-red-500 focus:border-red-500`
        }
        
        return `${baseClasses} border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500`
    }

    return (
        <>
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: 'Create New Event' }
                    ]} 
                />
            </div>

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Event</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Set up your event details and registration form</p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div 
                            ref={errorRef}
                            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded flex items-start"
                        >
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
                                <p 
                                    ref={firstFieldErrorRef}
                                    className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center"
                                >
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.title}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description (Markdown)
                            </label>
                            <MarkdownEditor
                                value={formData.description}
                                onChange={handleDescriptionChange}
                                placeholder="Describe your event using Markdown formatting..."
                            />
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
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formData.event_summary?.length || 0} / 200 characters
                                </div>
                                {fieldErrors.event_summary && (
                                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                        <HiExclamationCircle className="h-4 w-4 mr-1" />
                                        {fieldErrors.event_summary}
                                    </p>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                This summary will be displayed on event cards and social sharing.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Start Date & Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                id="start_date"
                                name="start_date"
                                required
                                value={formData.start_date}
                                onChange={handleChange}
                                className={getFieldClasses('start_date')}
                            />
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
                            <input
                                type="datetime-local"
                                id="end_date"
                                name="end_date"
                                required
                                value={formData.end_date}
                                onChange={handleChange}
                                className={getFieldClasses('end_date')}
                            />
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
                            {fieldErrors.entry_close_date && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.entry_close_date}
                                </p>
                            )}
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">If set, entries will close automatically after this date/time.</p>
                        </div>

                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Event Timezone <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="timezone"
                                name="timezone"
                                value={formData.timezone}
                                onChange={handleChange}
                                className={getFieldClasses('timezone')}
                            >
                                {TIMEZONE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.timezone && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.timezone}
                                </p>
                            )}
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                All event times will be displayed in this timezone.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                required
                                value={formData.location}
                                onChange={handleChange}
                                className={getFieldClasses('location')}
                                placeholder="Event location or venue"
                            />
                            {fieldErrors.location && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.location}
                                </p>
                            )}
                        </div>

                        {/* Location Settings */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Location Settings
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Add embedded map and directions to help attendees find your event location.
                            </p>
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                                Event Image URL
                            </label>
                            <input
                                type="url"
                                id="image_url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Organizer Contact Information */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Organizer Contact Information
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Contact details for this specific event. Leave empty to use your profile information.
                            </p>
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Only published events are visible to users
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_promoted"
                                    name="is_promoted"
                                    checked={formData.is_promoted}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label htmlFor="is_promoted" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Promote on Landing Page
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Promoted events appear first on the landing page
                            </p>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Terms & Conditions
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Define the terms and conditions that participants must accept when booking this event. These will be displayed on each ticket.
                            </p>
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
                                These terms will be included on each ticket and participants must accept them during booking. Use Markdown for formatting.
                            </p>
                        </div>
                    </div>

                    {/* Participant Form Fields */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            Participant Information Form
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Define what information you want to collect from each participant during booking.
                        </p>
                        <FormBuilder
                            fields={formFields}
                            onChange={setFormFields}
                        />
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Link
                            href="/organizer"
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}