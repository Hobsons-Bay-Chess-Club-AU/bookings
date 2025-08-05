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
                    location_settings: eventData.location_settings || { map_url: '', direction_url: '' }
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

            // Update event
            const { error: eventError } = await supabase
                .from('events')
                .update({
                    title: formData.title,
                    description: formData.description || null,
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
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)

            console.log('🔄 Event updated successfully!', { eventError })
            if (eventError) {
                console.error('❌ Database update error:', eventError)
                throw new Error(eventError.message)
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
                errors.entry_close_date = 'Entry close date must be before the event start date'
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
        setFormData(prev => ({
            ...prev,
            description: content
        }))
    }

    const getFieldClasses = (fieldName: string) => {
        const baseClasses = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
        const hasError = fieldErrors[fieldName]
        
        if (hasError) {
            return `${baseClasses} border-red-300 focus:ring-red-500 focus:border-red-500`
        }
        
        return `${baseClasses} border-gray-300 focus:ring-indigo-500 focus:border-indigo-500`
    }

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading event...</p>
                </div>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500">
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
                <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
                <p className="mt-2 text-gray-600">
                    Update your event details and participant form.
                </p>
            </div>

            <div className="bg-white shadow rounded-lg text-gray-900">
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-start">
                            <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded flex items-start">
                            <HiCheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Success</p>
                                <p className="text-sm">{success}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.title}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Markdown)
                            </label>
                            <MarkdownEditor
                                value={formData.description}
                                onChange={handleDescriptionChange}
                                placeholder="Describe your event using Markdown formatting..."
                            />
                        </div>

                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.start_date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.end_date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="entry_close_date" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.entry_close_date}
                                </p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">If set, entries will close automatically after this date/time.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.location}
                                </p>
                            )}
                        </div>

                        {/* Location Settings */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Location Settings
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Add embedded map and directions to help attendees find your event location.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="map_url" className="block text-sm font-medium text-gray-700">
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://www.google.com/maps/embed?pb=... or paste the &lt;iframe&gt; code here"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Paste the embed URL from Google Maps, or the full &lt;iframe&gt; code. The URL will be extracted automatically.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="direction_url" className="block text-sm font-medium text-gray-700">
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://maps.google.com/directions?daddr=..."
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Link to directions (optional). This will be shown as a &quot;Get Directions&quot; button.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.price}
                                </p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">Leave empty or set to 0 for free events</p>
                        </div>

                        <div>
                            <label htmlFor="max_attendees" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.max_attendees}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                                Event Image URL
                            </label>
                            <input
                                type="url"
                                id="image_url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Organizer Contact Information */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Organizer Contact Information
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Contact details for this specific event. Leave empty to use your profile information.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="organizer_name" className="block text-sm font-medium text-gray-700">
                                Organizer Name
                            </label>
                            <input
                                type="text"
                                id="organizer_name"
                                name="organizer_name"
                                value={formData.organizer_name}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Leave empty to use profile name"
                            />
                        </div>

                        <div>
                            <label htmlFor="organizer_email" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.organizer_email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="organizer_phone" className="block text-sm font-medium text-gray-700">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <HiExclamationCircle className="h-4 w-4 mr-1" />
                                    {fieldErrors.organizer_phone}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                Status
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="entry_closed">Entry Closed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="completed">Completed</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
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
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_promoted" className="ml-2 block text-sm font-medium text-gray-700">
                                    Promote on Landing Page
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                Promoted events appear first on the landing page
                            </p>
                        </div>
                    </div>

                    {/* Refund Timeline */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">
                                    Refund Policy
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Configure automatic refund policies based on timing.
                                </p>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="enable_refunds"
                                    checked={enableRefunds}
                                    onChange={(e) => setEnableRefunds(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="enable_refunds" className="ml-2 block text-sm font-medium text-gray-700">
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
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Participant Information Form
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Define what information you want to collect from each participant during booking.
                        </p>
                        <FormBuilder
                            fields={formFields}
                            onChange={setFormFields}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <div className="flex space-x-4">
                            <Link
                                href="/organizer"
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </Link>
                            {event && (
                                <>
                                    <Link
                                        href={`/organizer/events/${event.id}/bookings`}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        View Bookings
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleCloneEvent}
                                        disabled={cloning}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cloning ? 'Cloning...' : 'Clone Event'}
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Event'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}