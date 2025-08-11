'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Breadcrumb from '@/components/ui/breadcrumb'
import EventForm, { EventFormValues } from '../EventForm'
import { FormField } from '@/lib/types/database'
import { DEFAULT_TIMEZONE } from '@/lib/utils/timezone'
import { useRouter } from 'next/navigation'
import { RefundTimelineItem, EventTimeline } from '@/lib/types/database'

export default function NewEventPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const supabase = createClient()
    const router = useRouter()

    const handleCreateEvent = async (formData: EventFormValues, formFields: FormField[], refundTimeline: RefundTimelineItem[]) => {
        setLoading(true)
        setError('')
        setSuccess('')

        try {
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
                        headers: { 'Content-Type': 'application/json' },
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

            // Sanitize content fields
            const sanitizeContent = (content: string | undefined | null) => {
                if (!content) return null
                return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
            }

            const sanitizedSummary = sanitizeContent(formData.event_summary)
            const sanitizedDescription = sanitizeContent(formData.description)
            const sanitizedTermsConditions = sanitizeContent(formData.settings.terms_conditions)

            // Prepare timeline data
            const timeline: EventTimeline = {}
            if (refundTimeline.length > 0) {
                timeline.refund = refundTimeline
            }

            // Create event
            const { error: eventError } = await supabase
                .from('events')
                .insert({
                    title: formData.title,
                    description: sanitizedDescription,
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
                    timeline: Object.keys(timeline).length > 0 ? timeline : null,
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

    return (
        <>
            <div className="mb-6">
                <Breadcrumb items={[{ label: 'Events', href: '/organizer' }, { label: 'Create New Event' }]} />
            </div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Event</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Set up your event details and registration form</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <EventForm
                    mode="create"
                    initialValues={{ timezone: DEFAULT_TIMEZONE, status: 'draft' }}
                    initialFormFields={[]}
                    onSubmit={handleCreateEvent}
                    loading={loading}
                    error={error}
                    success={success}
                    setError={setError}
                    setSuccess={setSuccess}
                    submitLabel="Create Event"
                    cancelHref="/organizer"
                />
            </div>
        </>
    )
}
