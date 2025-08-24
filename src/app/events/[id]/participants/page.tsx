import { notFound } from 'next/navigation'
import Link from 'next/link'
import ParticipantsList from '@/components/events/participants-list'
import { Event } from '@/lib/types/database'
import { Metadata } from 'next'
import { HiHome, HiLockClosed, HiCalendar, HiMapPin, HiUsers } from 'react-icons/hi2'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getEvent(id: string): Promise<Event | null> {
    const res = await fetch(`${SITE_URL}/api/public/events/${id}`)
    if (!res.ok) return null
    return res.json()
}

async function getPublicParticipants(eventId: string) {
    const res = await fetch(`${SITE_URL}/api/public/events/${eventId}/public-participants`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
}

interface ParticipantsPageProps {
    params: Promise<{ id: string }>
}

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
    if (!event) notFound()
    const shouldShowPublicParticipants = event.settings?.show_participants_public || false
    if (!shouldShowPublicParticipants) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900">
                {/* Breadcrumb */}
                <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="py-4">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-4">
                                    <li>
                                        <Link href="/" className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">
                                            <span className="sr-only">Home</span>
                                            <HiHome className="h-5 w-5" />
                                        </Link>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                            <span className="text-gray-500 dark:text-gray-400">Events</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                            <Link
                                                href={`/events/${event.id}`}
                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 truncate max-w-xs"
                                            >
                                                {event.title}
                                            </Link>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">Participants</span>
                                        </div>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                        <HiLockClosed className="text-4xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            Participant List Private
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            The organizer has chosen to keep the participant list private for this event.
                        </p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
                        >
                            ← Back to Event
                        </Link>
                    </div>
                </div>
            </div>
        )
    }
    const participants = await getPublicParticipants(event.id)
    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            {/* Breadcrumb */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-4">
                                <li>
                                    <Link href="/" className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">
                                        <span className="sr-only">Home</span>
                                        <HiHome className="h-5 w-5" />
                                    </Link>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                        <span className="text-gray-500 dark:text-gray-400">Events</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                        <Link
                                            href={`/events/${event.id}`}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 truncate max-w-xs"
                                        >
                                            {event.title}
                                        </Link>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2 dark:text-gray-500">/</span>
                                        <span className="text-gray-900 dark:text-gray-100 font-medium">Participants</span>
                                    </div>
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="max-w-9xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Event Header */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {event.title} - Participants
                            </h1>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center">
                                    <HiCalendar className="mr-1 h-4 w-4" />
                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                                <span className="flex items-center">
                                    <HiMapPin className="mr-1 h-4 w-4" />
                                    {event.location}
                                </span>
                                <span className="flex items-center">
                                    <HiUsers className="mr-1 h-4 w-4" />
                                    {event.max_attendees ?
                                        `${event.current_attendees} / ${event.max_attendees} attendees` :
                                        `${event.current_attendees} attendees`
                                    }
                                </span>
                            </div>
                        </div>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
