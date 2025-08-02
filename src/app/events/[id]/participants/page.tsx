import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NavWrapper from '@/components/layout/nav-wrapper'
import ParticipantsList from '@/components/events/participants-list'
import { Event, Booking, Profile } from '@/lib/types/database'
import { Metadata } from 'next'

async function getEvent(id: string): Promise<Event | null> {
    const supabase = await createClient()

    const { data: event, error } = await supabase
        .from('events')
        .select(`
      *,
      organizer:profiles(full_name, email)
    `)
        .eq('id', id)
        .single()

    if (error || !event) {
        return null
    }

    return event
}

interface BookingWithProfile extends Booking {
    profile: Profile
    participants?: Array<{
        id: string
        first_name: string
        last_name: string
        date_of_birth?: string
        email?: string
        phone?: string
        custom_data?: Record<string, any>
    }>
}

async function getEventParticipants(eventId: string): Promise<BookingWithProfile[]> {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            profile:profiles(*),
            participants(*)
        `)
        .eq('event_id', eventId)
        .in('status', ['confirmed', 'verified'])  
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching participants:', error)
        return []
    }

    return (bookings || []) as BookingWithProfile[]
}

interface ParticipantsPageProps {
    params: Promise<{ id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ParticipantsPageProps): Promise<Metadata> {
    const { id } = await params
    const event = await getEvent(id)

    if (!event) {
        return {
            title: 'Event Not Found',
            description: 'The requested event could not be found.'
        }
    }

    const title = `${event.title} - Participants | Hobsons Bay Chess Club`
    const description = `View the list of participants for ${event.title} at ${event.location}`

    return {
        title,
        description,
        robots: {
            index: event.status === 'published' && event.settings?.show_participants_public,
            follow: true,
        },
    }
}

export default async function EventParticipantsPage({ params }: ParticipantsPageProps) {
    const { id } = await params
    const event = await getEvent(id)

    if (!event) {
        notFound()
    }

    // Check if participants should be shown publicly
    const shouldShowPublicParticipants = event.settings?.show_participants_public || false

    if (!shouldShowPublicParticipants) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavWrapper />
                
                {/* Breadcrumb */}
                <div className="bg-white border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="py-4">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-4">
                                    <li>
                                        <Link href="/" className="text-gray-400 hover:text-gray-500">
                                            <span className="sr-only">Home</span>
                                            🏠
                                        </Link>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2">/</span>
                                            <span className="text-gray-500">Events</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2">/</span>
                                            <Link 
                                                href={`/events/${event.id}`}
                                                className="text-gray-500 hover:text-gray-700 truncate max-w-xs"
                                            >
                                                {event.title}
                                            </Link>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2">/</span>
                                            <span className="text-gray-900 font-medium">Participants</span>
                                        </div>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow rounded-lg p-8 text-center">
                        <span className="text-4xl mb-4 block">🔒</span>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Participant List Private
                        </h1>
                        <p className="text-gray-600 mb-6">
                            The organizer has chosen to keep the participant list private for this event.
                        </p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            ← Back to Event
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const participants = await getEventParticipants(event.id)

    return (
        <div className="min-h-screen bg-gray-50">
            <NavWrapper />
            
            {/* Breadcrumb */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-4">
                                <li>
                                    <Link href="/" className="text-gray-400 hover:text-gray-500">
                                        <span className="sr-only">Home</span>
                                        🏠
                                    </Link>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2">/</span>
                                        <span className="text-gray-500">Events</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2">/</span>
                                        <Link 
                                            href={`/events/${event.id}`}
                                            className="text-gray-500 hover:text-gray-700 truncate max-w-xs"
                                        >
                                            {event.title}
                                        </Link>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2">/</span>
                                        <span className="text-gray-900 font-medium">Participants</span>
                                    </div>
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Event Header */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {event.title} - Participants
                            </h1>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                    <span className="mr-1">📅</span>
                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                                <span className="flex items-center">
                                    <span className="mr-1">📍</span>
                                    {event.location}
                                </span>
                                <span className="flex items-center">
                                    <span className="mr-1">👥</span>
                                    {event.max_attendees ?
                                        `${event.current_attendees} / ${event.max_attendees} attendees` :
                                        `${event.current_attendees} attendees`
                                    }
                                </span>
                            </div>
                        </div>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            ← Back to Event
                        </Link>
                    </div>
                </div>

                {/* Participants List */}
                <ParticipantsList 
                    event={event} 
                    bookings={participants} 
                    isPublic={true}
                    showPrivateInfo={false}
                />
            </div>
        </div>
    )
}
