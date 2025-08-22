'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Event } from '@/lib/types/database'
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
    HiClipboardDocumentList,
    HiPencilSquare,
    HiCog8Tooth,
    HiLink,
    HiEnvelope,
    HiDocumentDuplicate,
    HiTag
} from 'react-icons/hi2'
import ActionMenu from '@/components/ui/action-menu'

export interface EventWithBookings extends Event {
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

    const [cloningEventId, setCloningEventId] = useState<string | null>(null)

    const handleOpenSettings = (event: Event) => {
        setSelectedEvent(event)
        setIsSettingsModalOpen(true)
        setOpenDropdownId(null) // Close dropdown when opening settings
    }

    const handleCloseSettings = () => {
        setIsSettingsModalOpen(false)
        setSelectedEvent(null)
    }

    const handleUpdateSettings = () => {
        // Update settings logic here
        handleCloseSettings()
    }



    const handleCloneEvent = async (eventId: string) => {
        setCloningEventId(eventId)
        setOpenDropdownId(null) // Close dropdown

        try {
            const response = await fetch('/api/events/clone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clone event')
            }

            // Redirect to the new event's edit page
            window.location.href = `/organizer/events/${data.eventId}/edit`

        } catch (err) {
            console.error('Event clone error:', err)
            alert(err instanceof Error ? err.message : 'An error occurred while cloning the event')
        } finally {
            setCloningEventId(null)
        }
    }

    useEffect(() => {
        if (!openDropdownId) return
        const handleWindowChange = () => setOpenDropdownId(null)
        window.addEventListener('scroll', handleWindowChange, true)
        window.addEventListener('resize', handleWindowChange)
        return () => {
            window.removeEventListener('scroll', handleWindowChange, true)
            window.removeEventListener('resize', handleWindowChange)
        }
    }, [openDropdownId])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            case 'draft':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
            case 'cancelled':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'completed':
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    return (
        <>
            <div className="">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="p-3 md:p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiSparkles className="h-5 w-5 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div className="ml-3 md:ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Events
                                        </dt>
                                        <dd className="text-sm md:text-lg font-medium text-gray-900 dark:text-gray-100">
                                            {events.length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="p-3 md:p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiCheckCircle className="h-5 w-5 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div className="ml-3 md:ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Published
                                        </dt>
                                        <dd className="text-sm md:text-lg font-medium text-gray-900 dark:text-gray-100">
                                            {events.filter(e => e.status === 'published').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="p-3 md:p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiTicket className="h-5 w-5 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div className="ml-3 md:ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Bookings
                                        </dt>
                                        <dd className="text-sm md:text-lg font-medium text-gray-900 dark:text-gray-100">
                                            {totalBookings}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="p-3 md:p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <HiCurrencyDollar className="h-5 w-5 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div className="ml-3 md:ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Revenue
                                        </dt>
                                        <dd className="text-sm md:text-lg font-medium text-gray-900 dark:text-gray-100">
                                            AUD ${totalRevenue.toFixed(2)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Events Table */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Events</h2>
                        <Link
                            href="/organizer/events/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Create New Event
                        </Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-12">
                            <HiSparkles className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No events yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
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
                        <div className="overflow-x-auto">
                            {/* Desktop Table */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden lg:table">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Event
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Date & Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Bookings
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 relative" onClick={() => {
                                            setOpenDropdownId(null);
                                        }}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/organizer/events/${event.id}`}
                                                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        {event.title}
                                                    </Link>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        {event.settings?.show_participants_public && (
                                                            <Link
                                                                href={`/events/${event.id}/participants`}
                                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Public Participants
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="flex items-center">
                                                        <HiCalendarDays className="mr-2 h-4 w-4 text-gray-400" />
                                                        {new Date(event.start_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center mt-1">
                                                        <HiMapPin className="mr-2 h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600 dark:text-gray-400">{event.location}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                                                    <HiTicket className="mr-2 h-4 w-4 text-gray-400" />
                                                    {event.confirmedBookings} / {event.max_attendees || '∞'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                                                    <HiCurrencyDollar className="mr-2 h-4 w-4 text-gray-400" />
                                                    AUD ${event.revenue.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {event.price === 0 ? 'Varies' : `AUD ${event.price.toFixed(2)}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                                <ActionMenu
                                                    className="relative z-20"
                                                    trigger={({ buttonProps }) => (
                                                        <button
                                                            {...(buttonProps as any)}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (typeof buttonProps.onClick === 'function') buttonProps.onClick(e)
                                                                setOpenDropdownId(prev => (prev === event.id ? null : event.id))
                                                            }}
                                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                            title="Event Actions"
                                                        >
                                                            <HiCog6Tooth className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                >
                                                    <Link
                                                        href={`/organizer/events/${event.id}/bookings`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiClipboardDocumentList className="mr-2 h-4 w-4" /> View Bookings
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/participants`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiUsers className="mr-2 h-4 w-4" /> View Participants
                                                    </Link>
                                                    <button
                                                        onClick={() => handleOpenSettings(event)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        data-menu-item
                                                    >
                                                        <HiCog8Tooth className="mr-2 h-4 w-4" /> Event Settings
                                                    </button>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/pricing`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiCurrencyDollar className="mr-2 h-4 w-4" /> Manage Pricing
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/discounts`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiTag className="mr-2 h-4 w-4" /> Manage Discounts
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/email-manager?eventId=${event.id}`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiEnvelope className="mr-2 h-4 w-4" /> Email Contact
                                                    </Link>
                                                    {event.alias && (
                                                        <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                            <span className="flex items-center">
                                                                <HiLink className="mr-2 h-4 w-4" />
                                                            </span>
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                                                    /e/{event.alias}
                                                                </span>
                                                                <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/e/${event.alias}`} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/edit`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiPencilSquare className="mr-2 h-4 w-4" /> Edit Event
                                                    </Link>
                                                    <button
                                                        onClick={() => handleCloneEvent(event.id)}
                                                        disabled={cloningEventId === event.id}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                                        data-menu-item
                                                    >
                                                        <HiDocumentDuplicate className="mr-2 h-4 w-4" />
                                                        {cloningEventId === event.id ? 'Cloning...' : 'Clone Event'}
                                                    </button>
                                                </ActionMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Cards */}
                            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                                {events.map((event) => (
                                    <div key={event.id} className="p-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                <Link
                                                    href={`/organizer/events/${event.id}`}
                                                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    {event.title}
                                                </Link>
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                {event.settings?.show_participants_public && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                        Public Participants
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
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
                                                    {typeof event.current_attendees === 'number' && (
                                                        <>
                                                            {' '}
                                                            • {event.current_attendees} participants
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <HiCurrencyDollar className="mr-2 h-4 w-4" />
                                                <span>AUD ${event.revenue.toFixed(2)} revenue</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {event.price === 0 ? 'Varies' : `AUD ${event.price.toFixed(2)} per ticket`}
                                            </span>
                                            <div className="relative">
                                                <ActionMenu
                                                    trigger={({ buttonProps }) => (
                                                        <button
                                                            {...(buttonProps as any)}
                                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                            title="Event Actions"
                                                        >
                                                            <HiCog6Tooth className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                >
                                                    <Link
                                                        href={`/organizer/events/${event.id}/bookings`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiClipboardDocumentList className="mr-2 h-4 w-4" /> View Bookings
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/participants`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiUsers className="mr-2 h-4 w-4" /> View Participants
                                                    </Link>
                                                    <button
                                                        onClick={() => handleOpenSettings(event)}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        data-menu-item
                                                    >
                                                        <HiCog8Tooth className="mr-2 h-4 w-4" /> Event Settings
                                                    </button>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/pricing`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiCurrencyDollar className="mr-2 h-4 w-4" /> Manage Pricing
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/discounts`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiTag className="mr-2 h-4 w-4" /> Manage Discounts
                                                    </Link>
                                                    <Link
                                                        href={`/organizer/email-manager?eventId=${event.id}`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiEnvelope className="mr-2 h-4 w-4" /> Email Contact
                                                    </Link>
                                                    {event.alias && (
                                                        <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                            <span className="flex items-center">
                                                                <HiLink className="mr-2 h-4 w-4" />
                                                            </span>
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                                                    /e/{event.alias}
                                                                </span>
                                                                <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/e/${event.alias}`} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <Link
                                                        href={`/organizer/events/${event.id}/edit`}
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        data-menu-item
                                                    >
                                                        <HiPencilSquare className="mr-2 h-4 w-4" /> Edit Event
                                                    </Link>
                                                    <button
                                                        onClick={() => handleCloneEvent(event.id)}
                                                        disabled={cloningEventId === event.id}
                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                                        data-menu-item
                                                    >
                                                        <HiDocumentDuplicate className="mr-2 h-4 w-4" />
                                                        {cloningEventId === event.id ? 'Cloning...' : 'Clone Event'}
                                                    </button>
                                                </ActionMenu>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
