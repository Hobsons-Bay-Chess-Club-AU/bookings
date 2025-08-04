'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Event, EventSettings } from '@/lib/types/database'
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
    HiEnvelope
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
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailError, setEmailError] = useState('')
    const [emailSuccess, setEmailSuccess] = useState('')

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
                                                        <button
                                                            onClick={() => {
                                                                setShowEmailModal(true)
                                                                setOpenDropdownId(null)
                                                            }}
                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                                        >
                                                            <HiEnvelope className="mr-2 h-4 w-4" /> Send Marketing Email
                                                        </button>
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

            {/* Marketing Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Send Marketing Email</h3>
                            
                            {emailError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{emailError}</p>
                                </div>
                            )}

                            {emailSuccess && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-600">{emailSuccess}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Enter email subject"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Message</label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={6}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
