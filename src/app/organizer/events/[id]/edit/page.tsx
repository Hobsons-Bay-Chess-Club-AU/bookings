'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MarkdownEditor from '@/components/ui/markdown-editor'
import FormBuilder from '@/components/events/form-builder'
import { FormField, Event } from '@/lib/types/database'

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
        is_promoted: false
    })
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [initialLoading, setInitialLoading] = useState(true)
    const [event, setEvent] = useState<Event | null>(null)

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
                    is_promoted: eventData.is_promoted || false
                })

                // Set form fields
                setFormFields(eventData.custom_form_fields || [])

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
        setLoading(true)
        setError('')

        try {
            // Validate dates
            const startDate = new Date(formData.start_date)
            const endDate = new Date(formData.end_date)

            if (startDate >= endDate) {
                throw new Error('End date must be after start date')
            }

            // Handle alias for published events
            let alias: string | null = event?.alias || null
            if (formData.status === 'published' && !event?.alias) {
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
                } catch (error) {
                    throw new Error('Failed to generate alias for event')
                }
            }

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
                    is_promoted: formData.is_promoted,
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)

            if (eventError) {
                throw new Error(eventError.message)
            }

            router.push('/organizer')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
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

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading event...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
                    <p className="mt-2 text-gray-600">
                        Update your event details and participant form.
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg text-gray-900">
                    <form onSubmit={handleSubmit} className="space-y-6 p-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                                {error}
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter event title"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Leave empty for no entry close date"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter event location"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="0.00"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Leave empty for unlimited"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Leave empty to use profile email"
                                />
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
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Leave empty to use profile phone"
                                />
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
                                    <Link
                                        href={`/organizer/events/${event.id}/bookings`}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        View Bookings
                                    </Link>
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
            </div>
        </div>
    )
}