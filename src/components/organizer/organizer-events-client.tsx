'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Event, Booking, EventSettings } from '@/lib/types/database'
import CopyButton from '@/components/ui/copy-button'
import EventSettingsModal from '@/components/events/event-settings-modal'
import { HiCog6Tooth } from 'react-icons/hi2'
import {
    HiSparkles,
    HiCheckCircle,
    HiTicket,
    HiCurrencyDollar,
    HiCalendarDays,
    HiMapPin,
    HiUsers,
    HiEye,
    HiClipboardDocumentList,
    HiPencilSquare,
    HiCog8Tooth,
    HiLink
} from 'react-icons/hi2'

interface EventWithBookings extends Event {
    totalBookings: number
    confirmedBookings: number
    revenue: number
}

interface OrganizerEventsClientProps {
    events: EventWithBookings[]
    totalRevenue: number
    totalBookings: number
}

export default function OrganizerEventsClient({ events, totalRevenue, totalBookings }: OrganizerEventsClientProps) {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
    const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const handleOpenSettings = (event: Event) => {
        setSelectedEvent(event)
        setIsSettingsModalOpen(true)
        setOpenDropdownId(null) // Close dropdown when opening settings
    }

    const handleCloseSettings = () => {
        setIsSettingsModalOpen(false)
        setSelectedEvent(null)
    }

    const handleUpdateSettings = (settings: EventSettings) => {
        // Optionally refresh the page or update local state
        // For now, just close the modal - the settings are saved in the database
        console.log('Settings updated:', settings)
    }

    const toggleDropdown = (eventId: string) => {
        setOpenDropdownId(openDropdownId === eventId ? null : eventId)
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId) {
                const dropdownElement = dropdownRefs.current[openDropdownId]
                if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
                    setOpenDropdownId(null)
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [openDropdownId])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800'
            case 'draft':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'completed':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <>
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-0">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiSparkles className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Events
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {events.length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiCheckCircle className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Published
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {events.filter(e => e.status === 'published').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiTicket className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Bookings
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {totalBookings}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiCurrencyDollar className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Revenue
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            AUD ${totalRevenue.toFixed(2)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Events List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">My Events</h2>
                        <Link
                            href="/organizer/events/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Create New Event
                        </Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-12">
                            <HiSparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No events yet
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Create your first event to start accepting bookings!
                            </p>
                            <Link
                                href="/organizer/events/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Create Event
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {events.map((event) => (
                                <div key={event.id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                    {event.settings?.show_participants_public && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            👥 Public Participants
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                        {event.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                                <div className="flex items-center">
                                                    <HiCalendarDays className="mr-2 h-4 w-4" />
                                                    <span>
                                                        {new Date(event.start_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiMapPin className="mr-2 h-4 w-4" />
                                                    <span>{event.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiTicket className="mr-2 h-4 w-4" />
                                                    <span>
                                                        {event.confirmedBookings} / {event.max_attendees || '∞'} booked
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiCurrencyDollar className="mr-2 h-4 w-4" />
                                                    <span>AUD ${event.revenue.toFixed(2)} revenue</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-gray-900">
                                                    AUD ${event.price.toFixed(2)} per ticket
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    Created {new Date(event.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                        </div>

                                        <div className="ml-6 flex-shrink-0 relative">
                                            <button
                                                onClick={() => toggleDropdown(event.id)}
                                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                title="Event Actions"
                                            >
                                                <HiCog6Tooth className="h-5 w-5" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openDropdownId === event.id && (
                                                <div
                                                    ref={(el) => { dropdownRefs.current[event.id] = el }}
                                                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                                >
                                                    <div className="py-1">
                                                        <Link
                                                            href={`/organizer/events/${event.id}/bookings`}
                                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenDropdownId(null)}
                                                        >
                                                            <HiClipboardDocumentList className="mr-2 h-4 w-4" /> View Bookings
                                                        </Link>
                                                        <Link
                                                            href={`/organizer/events/${event.id}/participants`}
                                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenDropdownId(null)}
                                                        >
                                                            <HiUsers className="mr-2 h-4 w-4" /> View Participants
                                                        </Link>
                                                        <button
                                                            onClick={() => handleOpenSettings(event)}
                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                                        >
                                                            <HiCog8Tooth className="mr-2 h-4 w-4" /> Event Settings
                                                        </button>
                                                        <Link
                                                            href={`/organizer/events/${event.id}/pricing`}
                                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenDropdownId(null)}
                                                        >
                                                            <HiCurrencyDollar className="mr-2 h-4 w-4" /> Manage Pricing
                                                        </Link>
                                                        {event.alias && (
                                                            <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <span className="flex items-center">
                                                                    <HiLink className="mr-2 h-4 w-4" />
                                                                </span>
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="text-xs font-mono text-indigo-600">
                                                                        /e/{event.alias}
                                                                    </span>
                                                                    <CopyButton text={`localhost:3000/e/${event.alias}`} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-gray-100 my-1"></div>
                                                        <Link
                                                            href={`/organizer/events/${event.id}/edit`}
                                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenDropdownId(null)}
                                                        >
                                                            <HiPencilSquare className="mr-2 h-4 w-4" /> Edit Event
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Settings Modal */}
            {selectedEvent && (
                <EventSettingsModal
                    event={selectedEvent}
                    isOpen={isSettingsModalOpen}
                    onClose={handleCloseSettings}
                    onUpdate={handleUpdateSettings}
                />
            )}
        </>
    )
}
