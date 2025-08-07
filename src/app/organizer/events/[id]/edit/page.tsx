'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { HiExclamationTriangle, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi2'
import MarkdownEditor from '@/components/ui/markdown-editor'
import FormBuilder from '@/components/events/form-builder'
import TimelineBuilder from '@/components/events/timeline-builder'
import { FormField, Event, RefundTimelineItem, EventTimeline } from '@/lib/types/database'

export default function EditEventPage() {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
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
        status: 'draft' as 'draft' | 'published',
        is_promoted: false,
        location_settings: {
            map_url: '',
            direction_url: ''
        },
        settings: {
            notify_organizer_on_booking: false,
            terms_conditions: ''
        }
    })
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [refundTimeline, setRefundTimeline] = useState<RefundTimelineItem[]>([])
    const [enableRefunds, setEnableRefunds] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [initialLoading, setInitialLoading] = useState(true)
    const [event, setEvent] = useState<Event | null>(null)
    const [cloning, setCloning] = useState(false)

    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string
    const supabase = createClient()

    // Load existing event data
    useEffect(() => {
        const loadEvent = async () => {
            try {
                setInitialLoading(true)

                // Get current user to verify they can edit this event
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                if (userError || !user) {
                    router.push('/auth/login')
                    return
                }

                // Fetch event data
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .eq('organizer_id', user.id)
                    .single()

                if (eventError || !eventData) {
                    setError('Event not found or you do not have permission to edit it')
                    return
                }

                setEvent(eventData)

                // Populate form with existing data
                setFormData({
                    title: eventData.title,
                    description: eventData.description || '',
                    start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().slice(0, 16) : '',
                    end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().slice(0, 16) : '',
                    entry_close_date: eventData.entry_close_date ? new Date(eventData.entry_close_date).toISOString().slice(0, 16) : '',
                    location: eventData.location,
                    price: eventData.price?.toString() || '',
                    max_attendees: eventData.max_attendees?.toString() || '',
                    image_url: eventData.image_url || '',
                    organizer_name: eventData.organizer_name || '',
                    organizer_email: eventData.organizer_email || '',
                    organizer_phone: eventData.organizer_phone || '',
                    status: eventData.status,
                    is_promoted: eventData.is_promoted || false,
                    location_settings: eventData.location_settings || { map_url: '', direction_url: '' },
                    settings: {
                        notify_organizer_on_booking: eventData.settings?.notify_organizer_on_booking || false,
                        terms_conditions: eventData.settings?.terms_conditions || ''
                    }
                })

                // Set form fields
                setFormFields(eventData.custom_form_fields || [])

                // Set refund timeline
                if (eventData.timeline?.refund) {
                    setRefundTimeline(eventData.timeline.refund)
                    setEnableRefunds(true)
                }

            } catch (err) {
                console.error('Error loading event:', err)
                setError('Failed to load event data')
            } finally {
                setInitialLoading(false)
            }
        }

        if (eventId) {
            loadEvent()
        }
    }, [eventId, router, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('🔄 Starting event update...')
        setLoading(true)
        setError('')
        setSuccess('')
        setFieldErrors({})

        try {
            // Validate form before submission
            if (!validateForm()) {
                console.log('❌ Form validation failed')
                setError('Please fix the errors below before saving')
                setLoading(false)
                return
            }

            console.log('✅ Form validation passed')

            // Handle alias for published events
            let alias: string | null = event?.alias || null
            if (formData.status === 'published' && !event?.alias) {
                console.log('🔄 Generating alias for published event...')
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
                        console.log('✅ Alias generated:', alias)
                    } else {
                        throw new Error('Failed to generate alias')
                    }
                } catch {
                    throw new Error('Failed to generate alias for event')
                }
            }

            // Prepare timeline data
            const timeline: EventTimeline = {}
            if (enableRefunds && refundTimeline.length > 0) {
                timeline.refund = refundTimeline
            }

            // Clean location_settings - remove empty strings and properly encode URLs
            const cleanedLocationSettings = {
                map_url: formData.location_settings.map_url?.trim() ? encodeURI(formData.location_settings.map_url.trim()) : null,
                direction_url: formData.location_settings.direction_url?.trim() ? encodeURI(formData.location_settings.direction_url.trim()) : null
            }
            
            // Only include location_settings if at least one field has a value
            const finalLocationSettings = (cleanedLocationSettings.map_url || cleanedLocationSettings.direction_url) 
                ? cleanedLocationSettings 
                : {}

            console.log('🔄 Updating event in database...', {
                eventId,
                locationSettings: finalLocationSettings,
                locationSettingsType: typeof finalLocationSettings,
                locationSettingsStringified: JSON.stringify(finalLocationSettings),
                originalMapUrl: formData.location_settings.map_url,
                encodedMapUrl: cleanedLocationSettings.map_url
            })

            // Sanitize and encode description to handle special characters safely
            let sanitizedDescription: string | null = null
            
            try {
                if (formData.description) {
                    sanitizedDescription = formData.description
                        .replace(/\r\n/g, '\n') // Normalize line endings
                        .replace(/\r/g, '\n')    // Convert remaining carriage returns
                        .trim()                  // Remove leading/trailing whitespace
                }

                console.log('🔄 Sanitizing description...', {
                    originalLength: formData.description?.length,
                    sanitizedLength: sanitizedDescription?.length,
                    hasSpecialChars: sanitizedDescription?.includes('🎉') || sanitizedDescription?.includes('✅') || sanitizedDescription?.includes('🚀')
                })
            } catch (sanitizeError) {
                console.error('❌ Error sanitizing description:', sanitizeError)
                throw new Error('There was an issue processing the description content. Please try again.')
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

            // Update event
            const { error: eventError } = await supabase
                .from('events')
                .update({
                    title: formData.title,
                    description: sanitizedDescription,
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
                    status: formData.status,
                    alias: alias,
                    custom_form_fields: formFields,
                    timeline: Object.keys(timeline).length > 0 ? timeline : null,
                    is_promoted: formData.is_promoted,
                    location_settings: finalLocationSettings,
                    settings: {
                        notify_organizer_on_booking: formData.settings.notify_organizer_on_booking,
                        terms_conditions: sanitizedTermsConditions
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)

            console.log('🔄 Event updated successfully!', { eventError })
            if (eventError) {
                console.error('❌ Database update error:', eventError)
                
                // Provide more specific error messages
                if (eventError.code === '23505') {
                    throw new Error('An event with this title already exists. Please choose a different title.')
                } else if (eventError.code === '23514') {
                    throw new Error('Invalid data format. Please check your input and try again.')
                } else if (eventError.message.includes('description')) {
                    throw new Error('There was an issue with the description content. Please try removing any special characters or formatting.')
                } else {
                    throw new Error(`Database error: ${eventError.message}`)
                }
            }

            console.log('✅ Event updated successfully!')
            setSuccess('Event updated successfully!')
            setError('')
            
            // Redirect after a short delay to show success message
            setTimeout(() => {
                router.push('/organizer')
            }, 1500)
        } catch (err) {
            console.error('❌ Event update error:', err)
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating the event'
            setError(errorMessage)
        } finally {
            console.log('🔄 Setting loading to false')
            setLoading(false)
        }
    }

    const handleCloneEvent = async () => {
        if (!event) return

        setCloning(true)
        setError('')
        setSuccess('')

        try {
            const response = await fetch('/api/events/clone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId: event.id }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clone event')
            }

            setSuccess('Event cloned successfully! Redirecting to edit page...')
            
            // Redirect to the new event's edit page after a short delay
            setTimeout(() => {
                router.push(`/organizer/events/${data.eventId}/edit`)
            }, 1500)

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while cloning the event'
            setError(errorMessage)
            console.error('Event clone error:', err)
        } finally {
            setCloning(false)
        }
    }

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
        // Clear description error when user starts typing
        clearFieldError('description')
        setFormData(prev => ({
            ...prev,
            description: content
        }))
    }

    const getFieldClasses = (fieldName: string) => {
        const baseClasses = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        const hasError = fieldErrors[fieldName]
        
        if (hasError) {
            return `${baseClasses} border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-400 dark:focus:border-red-400`
        }
        
        return `${baseClasses} border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400`
    }

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading event...</p>
                </div>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Update your event details and participant form.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg text-gray-900 dark:text-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded flex items-start">
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
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
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
                            <div className="mt-2 flex justify-between items-center">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formData.description?.length || 0} / 10,000 characters
                                </div>
                                {fieldErrors.description && (
                                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                        <HiExclamationCircle className="h-4 w-4 mr-1" />
                                        {fieldErrors.description}
                                    </p>
                                )}
                            </div>
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
                                placeholder="Enter event location"
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
                                Event Image URL
                            </label>
                            <input
                                type="url"
                                id="image_url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                />
                                <label htmlFor="is_promoted" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Promote on Landing Page
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Promoted events appear first on the landing page
                            </p>
                        </div>
                    </div>

                    {/* Refund Timeline */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Refund Policy
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Configure automatic refund policies based on timing.
                                </p>
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

                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-4">
                            <Link
                                href="/organizer"
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                            >
                                Cancel
                            </Link>
                            {event && (
                                <>
                                    <Link
                                        href={`/organizer/events/${event.id}/bookings`}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                    >
                                        View Bookings
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${event.id}/discounts`}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Manage Discounts
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleCloneEvent}
                                        disabled={cloning}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cloning ? 'Cloning...' : 'Clone Event'}
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Event'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}