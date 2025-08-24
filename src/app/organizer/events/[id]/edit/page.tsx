'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { HiExclamationCircle } from 'react-icons/hi2'
import EventForm, { EventFormValues } from '../../EventForm'

import Breadcrumb from '@/components/ui/breadcrumb'
import { FormField, Event, RefundTimelineItem, EventTimeline } from '@/lib/types/database'
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '@/lib/utils/timezone'
import { SectionLoader } from '@/components/ui/loading-states'

export default function EditEventPage() {
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
            notify_organizer_on_booking: false,
            terms_conditions: ''
        }
    })
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [refundTimeline, setRefundTimeline] = useState<RefundTimelineItem[]>([])
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
                    event_summary: eventData.event_summary || '',
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
                    timezone: eventData.timezone || DEFAULT_TIMEZONE,
                    status: eventData.status,
                    is_promoted: eventData.is_promoted || false,
                    location_settings: eventData.location_settings || { map_url: '', direction_url: '' },
                    settings: {
                        notify_organizer_on_booking: eventData.settings?.notify_organizer_on_booking || false,
                        terms_conditions: eventData.settings?.terms_conditions || '',
                        prevent_duplicates: eventData.settings?.prevent_duplicates ?? true
                    } as EventFormValues['settings']
                })

                // Set form fields
                setFormFields(eventData.custom_form_fields || [])

                // Set refund timeline
                if (eventData.timeline?.refund) {
                    setRefundTimeline(eventData.timeline.refund)
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

    const handleUpdate = async (values: EventFormValues, updatedFormFields: FormField[], updatedRefundTimeline: RefundTimelineItem[]) => {
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            // Handle alias for published events
            let alias: string | null = event?.alias || null
            if (values.status === 'published' && !event?.alias) {
                try {
                    const response = await fetch('/api/events/generate-alias', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
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

            const timeline: EventTimeline = {}
            if (updatedRefundTimeline.length > 0) {
                timeline.refund = updatedRefundTimeline
            }

            const cleanedLocationSettings = {
                map_url: values.location_settings.map_url?.trim() ? encodeURI(values.location_settings.map_url.trim()) : null,
                direction_url: values.location_settings.direction_url?.trim() ? encodeURI(values.location_settings.direction_url.trim()) : null
            }
            const finalLocationSettings = (cleanedLocationSettings.map_url || cleanedLocationSettings.direction_url) ? cleanedLocationSettings : {}

            const sanitizedDescription = values.description ? values.description.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim() : null
            const sanitizedSummary = values.event_summary ? values.event_summary.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim() : null
            const sanitizedTermsConditions = values.settings.terms_conditions ? values.settings.terms_conditions.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim() : null

            const { error: eventError } = await supabase
                .from('events')
                .update({
                    title: values.title,
                    description: sanitizedDescription,
                    event_summary: sanitizedSummary,
                    start_date: values.start_date,
                    end_date: values.end_date,
                    entry_close_date: values.entry_close_date || null,
                    location: values.location,
                    price: parseFloat(values.price) || 0,
                    max_attendees: values.max_attendees ? parseInt(values.max_attendees) : null,
                    image_url: values.image_url || null,
                    organizer_name: values.organizer_name || null,
                    organizer_email: values.organizer_email || null,
                    organizer_phone: values.organizer_phone || null,
                    timezone: values.timezone,
                    status: values.status,
                    alias: alias,
                    custom_form_fields: updatedFormFields,
                    timeline: Object.keys(timeline).length > 0 ? timeline : null,
                    is_promoted: values.is_promoted,
                    location_settings: finalLocationSettings,
                    settings: {
                        notify_organizer_on_booking: event?.settings?.notify_organizer_on_booking || false,
                        terms_conditions: sanitizedTermsConditions,
                        prevent_duplicates: values.settings.prevent_duplicates ?? true
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)

            if (eventError) {
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

            setSuccess('Event updated successfully!')
            setTimeout(() => {
                router.push('/organizer')
            }, 1500)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating the event'
            setError(errorMessage)
        } finally {
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

    // Validation handled inside shared EventForm now

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

    // Description handled in EventForm

    const getFieldClasses = (fieldName: string) => {
        const baseClasses = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        const hasError = fieldErrors[fieldName]
        
        if (hasError) {
            return `${baseClasses} border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-400 dark:focus:border-red-400`
        }
        
        return `${baseClasses} border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400`
    }

    if (initialLoading) {
        return <SectionLoader text="Loading event..." />
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
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: event?.title || 'Event', href: `/organizer/events/${eventId}` },
                        { label: 'Edit' }
                    ]} 
                />
            </div>

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Update your event details and participant form.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg text-gray-900 dark:text-gray-100">
                <div className="p-6">
                    <EventForm
                        mode="edit"
                        initialValues={event ? ({
                            title: event.title,
                            description: event.description || '',
                            event_summary: event.event_summary || '',
                            start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
                            end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
                            entry_close_date: event.entry_close_date ? new Date(event.entry_close_date).toISOString().slice(0, 16) : '',
                            location: event.location,
                            price: event.price?.toString() || '',
                            max_attendees: event.max_attendees?.toString() || '',
                            image_url: event.image_url || '',
                            organizer_name: event.organizer_name || '',
                            organizer_email: event.organizer_email || '',
                            organizer_phone: event.organizer_phone || '',
                            timezone: event.timezone || DEFAULT_TIMEZONE,
                            status: event.status,
                            is_promoted: event.is_promoted || false,
                            location_settings: {
                                map_url: typeof event.location_settings === 'object' && event.location_settings && 'map_url' in event.location_settings ? (event.location_settings as { map_url?: string }).map_url ?? '' : '',
                                direction_url: typeof event.location_settings === 'object' && event.location_settings && 'direction_url' in event.location_settings ? (event.location_settings as { direction_url?: string }).direction_url ?? '' : ''
                            },
                            settings: { 
                                terms_conditions: (typeof event.settings === 'object' && event.settings && 'terms_conditions' in event.settings ? (event.settings as { terms_conditions?: string }).terms_conditions : '') || '', 
                                prevent_duplicates: (typeof event.settings === 'object' && event.settings && 'prevent_duplicates' in event.settings ? (event.settings as { prevent_duplicates?: boolean }).prevent_duplicates : true),
                                notify_organizer_on_booking: (typeof event.settings === 'object' && event.settings && 'notify_organizer_on_booking' in event.settings ? (event.settings as { notify_organizer_on_booking?: boolean }).notify_organizer_on_booking : false) || false
                            }
                        }) : undefined}
                        initialFormFields={formFields}
                        initialRefundTimeline={refundTimeline}
                        onSubmit={handleUpdate}
                        loading={loading}
                        error={error}
                        success={success}
                        setError={setError}
                        setSuccess={setSuccess}
                        submitLabel="Update Event"
                        cancelHref="/organizer"
                    />
                </div>
                    

                    <div className="hidden">
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

                    {/* Additional Actions for Edit Page */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-4">
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
                    </div>
            </div>
        </>
    )
}