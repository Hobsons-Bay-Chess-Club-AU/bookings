'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MarkdownEditor from '@/components/ui/markdown-editor'
import FormBuilder from '@/components/events/form-builder'
import { FormField } from '@/lib/types/database'

export default function NewEventPage() {
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
        status: 'draft' as const
    })
    const [formFields, setFormFields] = useState<FormField[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const router = useRouter()
    const supabase = createClient()



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                throw new Error('You must be logged in to create events')
            }

            // Validate dates
            const startDate = new Date(formData.start_date)
            const endDate = new Date(formData.end_date)

            if (startDate >= endDate) {
                throw new Error('End date must be after start date')
            }

            if (startDate < new Date()) {
                throw new Error('Start date must be in the future')
            }

            // Create event
            const { data: event, error: eventError } = await supabase
                .from('events')
                .insert({
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
                    organizer_id: user.id,
                    custom_form_fields: formFields
                })
                .select()
                .single()

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
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleDescriptionChange = (content: string) => {
        setFormData(prev => ({
            ...prev,
            description: content
        }))
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
                            <Link
                                href="/organizer"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ← Back to Events
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-800">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                    Event Title *
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
                                    Start Date & Time *
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
                                    End Date & Time *
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
                                    Location *
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    required
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Event location or venue"
                                />
                            </div>

                            <div>
                                                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                Ticket Price ($AUD)
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
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Only published events are visible to users
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

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                            <Link
                                href="/organizer"
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
            </div>
        </div>
    )
}