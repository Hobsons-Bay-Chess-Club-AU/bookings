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
    const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const [desktopMenuPos, setDesktopMenuPos] = useState<{ top: number; left: number } | null>(null)
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailError, setEmailError] = useState('')
    const [emailSuccess, setEmailSuccess] = useState('')
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

    const handleSendMarketingEmail = async () => {
        if (!emailSubject.trim() || !emailBody.trim()) {
            setEmailError('Please fill in both subject and body')
            return
        }

        setEmailLoading(true)
        setEmailError('')
        setEmailSuccess('')

        try {
            const response = await fetch('/api/admin/mailing-list/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject: emailSubject,
                    body: emailBody
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send email')
            }

            const result = await response.json()
            setEmailSuccess(`Email sent successfully to ${result.successful} subscribers`)
            setEmailSubject('')
            setEmailBody('')
            setShowEmailModal(false)
        } catch (err) {
            setEmailError(err instanceof Error ? err.message : 'An unexpected error occurred')
        } finally {
            setEmailLoading(false)
        }
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

    const toggleDropdown = (eventId: string) => {
        setOpenDropdownId(openDropdownId === eventId ? null : eventId)
    }

    const openDesktopDropdown = (id: string, anchorEl: HTMLElement) => {
        if (openDropdownId === id) {
            setOpenDropdownId(null)
            return
        }
        const rect = anchorEl.getBoundingClientRect()
        const menuWidth = 192 // w-48
        const viewportPadding = 8
        let left = rect.right - menuWidth
        if (left < viewportPadding) left = viewportPadding
        let top = rect.bottom + 8
        const assumedMenuHeight = 320
        if (top + assumedMenuHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, rect.top - assumedMenuHeight - 8)
        }
        setDesktopMenuPos({ top, left })
        setOpenDropdownId(id)
    }

    useEffect(() => {
        if (!openDropdownId) return
        const handleWindowChange = () => {
            setOpenDropdownId(null)
        }
        window.addEventListener('scroll', handleWindowChange, true)
        window.addEventListener('resize', handleWindowChange)
        return () => {
            window.removeEventListener('scroll', handleWindowChange, true)
            window.removeEventListener('resize', handleWindowChange)
        }
    }, [openDropdownId])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId) {
                const dropdownElement = dropdownRefs.current[openDropdownId]
                
                // Check if the click target is a menu item
                const target = event.target as HTMLElement;
                const isMenuItem = target.closest('[data-menu-item]');
                
                // Only close if click is outside the dropdown AND not on a menu item
                if (dropdownElement && !dropdownElement.contains(event.target as Node) && !isMenuItem) {
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
            <div className="max-w-7xl mx-auto py-0 px-0 md:py-12 md:px-4 sm:px-6 lg:px-0">
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
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.matchMedia('(min-width: 1024px)').matches) {
                                                        openDesktopDropdown(event.id, e.currentTarget)
                                                    } else {
                                                        toggleDropdown(event.id)
                                                    }
                                                }}
                                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative z-20"
                                                    title="Event Actions"
                                                >
                                                    <HiCog6Tooth className="h-5 w-5" />
                                                </button>
                                                
                                                {/* Desktop Dropdown Menu */}
                                                {openDropdownId === event.id && desktopMenuPos && (
                                                    <div
                                                        ref={(el) => { dropdownRefs.current[event.id] = el }}
                                                        style={{ position: 'fixed', top: desktopMenuPos.top, left: desktopMenuPos.left }}
                                                        className="w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-[9999] hidden lg:block"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <div className="py-1" onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/bookings`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                data-menu-item
                                                            >
                                                                <HiClipboardDocumentList className="mr-2 h-4 w-4" /> View Bookings
                                                            </Link>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/participants`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                data-menu-item
                                                            >
                                                                <HiUsers className="mr-2 h-4 w-4" /> View Participants
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenSettings(event);
                                                                }}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                                data-menu-item
                                                            >
                                                                <HiCog8Tooth className="mr-2 h-4 w-4" /> Event Settings
                                                            </button>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/pricing`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                data-menu-item
                                                            >
                                                                <HiCurrencyDollar className="mr-2 h-4 w-4" /> Manage Pricing
                                                            </Link>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/discounts`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                data-menu-item
                                                            >
                                                                <HiTag className="mr-2 h-4 w-4" /> Manage Discounts
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowEmailModal(true);
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                                data-menu-item
                                                            >
                                                                <HiEnvelope className="mr-2 h-4 w-4" /> Send Marketing Email
                                                            </button>
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                data-menu-item
                                                            >
                                                                <HiPencilSquare className="mr-2 h-4 w-4" /> Edit Event
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCloneEvent(event.id);
                                                                }}
                                                                disabled={cloningEventId === event.id}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                                                data-menu-item
                                                            >
                                                                <HiDocumentDuplicate className="mr-2 h-4 w-4" />
                                                                {cloningEventId === event.id ? 'Cloning...' : 'Clone Event'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
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
                                                <button
                                                    onClick={() => toggleDropdown(event.id)}
                                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                    title="Event Actions"
                                                >
                                                    <HiCog6Tooth className="h-5 w-5" />
                                                </button>

                                                {/* Mobile Dropdown Menu */}
                                                {openDropdownId === event.id && (
                                                    <div
                                                        ref={(el) => { dropdownRefs.current[event.id] = el }}
                                                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 lg:hidden"
                                                    >
                                                        <div className="py-1">
                                                            <Link
                                                                href={`/organizer/events/${event.id}/bookings`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={() => setOpenDropdownId(null)}
                                                                data-menu-item
                                                            >
                                                                <HiClipboardDocumentList className="mr-2 h-4 w-4" /> View Bookings
                                                            </Link>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/participants`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={() => setOpenDropdownId(null)}
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
                                                                onClick={() => setOpenDropdownId(null)}
                                                                data-menu-item
                                                            >
                                                                <HiCurrencyDollar className="mr-2 h-4 w-4" /> Manage Pricing
                                                            </Link>
                                                            <Link
                                                                href={`/organizer/events/${event.id}/discounts`}
                                                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                onClick={() => setOpenDropdownId(null)}
                                                                data-menu-item
                                                            >
                                                                <HiTag className="mr-2 h-4 w-4" /> Manage Discounts
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    setShowEmailModal(true)
                                                                    setOpenDropdownId(null)
                                                                }}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                                data-menu-item
                                                            >
                                                                <HiEnvelope className="mr-2 h-4 w-4" /> Send Marketing Email
                                                            </button>
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
                                                                onClick={() => setOpenDropdownId(null)}
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
                                                        </div>
                                                    </div>
                                                )}
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

            {/* Marketing Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Send Marketing Email</h3>
                            
                            {emailError && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                                    <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>
                                </div>
                            )}

                            {emailSuccess && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                                    <p className="text-sm text-green-600 dark:text-green-400">{emailSuccess}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Enter email subject"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={6}
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Enter your message here..."
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSendMarketingEmail}
                                        disabled={emailLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {emailLoading ? 'Sending...' : 'Send Email'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowEmailModal(false)
                                            setEmailSubject('')
                                            setEmailBody('')
                                            setEmailError('')
                                            setEmailSuccess('')
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
