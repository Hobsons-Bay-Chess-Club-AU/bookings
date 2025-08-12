import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { notFound, redirect } from 'next/navigation'
import SectionsManagerClient from './sections-manager-client'
import { Event } from '@/lib/types/database'
import Breadcrumb from '@/components/ui/breadcrumb'

async function getEventWithSections(eventId: string): Promise<Event | null> {
    const supabase = await createClient()
    
    const { data: event, error } = await supabase
        .from('events')
        .select(`
            *,
            sections:event_sections(
                *,
                pricing:section_pricing(*)
            )
        `)
        .eq('id', eventId)
        .single()

    if (error || !event) {
        return null
    }

    // Calculate available seats for each section
    if (event.sections) {
        event.sections = event.sections.map((section: { max_seats: number; current_seats: number }) => ({
            ...section,
            available_seats: section.max_seats - section.current_seats
        }))
    }

    return event
}

interface SectionsPageProps {
    params: Promise<{ id: string }>
}

export default async function SectionsPage({ params }: SectionsPageProps) {
    const { id: eventId } = await params
    const profile = await getCurrentProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    const event = await getEventWithSections(eventId)

    if (!event) {
        notFound()
    }

    // Check if user is organizer of this event or admin
    if (event.organizer_id !== profile.id && profile.role !== 'admin') {
        redirect('/unauthorized')
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: event.title, href: `/organizer/events/${eventId}` },
                        { label: 'Sections' }
                    ]} 
                />
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Manage Sections
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {event.title}
                </p>
            </div>

            <SectionsManagerClient event={event} />
        </div>
    )
}
