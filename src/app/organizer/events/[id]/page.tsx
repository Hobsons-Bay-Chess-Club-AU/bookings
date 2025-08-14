'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/breadcrumb'
import { 
    HiCalendarDays, 
    HiUsers, 
    HiCurrencyDollar, 
    HiTag, 
    HiClipboardDocumentList,
    HiCog8Tooth,
    HiPencilSquare,
    HiDocumentDuplicate,
    HiEnvelope,
    HiMapPin,
    HiClock,
    HiCheckCircle,
    HiDocumentText,
    HiArrowTopRightOnSquare
} from 'react-icons/hi2'
import { FullPageLoader } from '@/components/ui/loading-states'
import { Event, EventPricing, EventDiscount, Booking, Participant, FormField, EventSection } from '@/lib/types/database'
import FormBuilder from '@/components/events/form-builder'

interface ParticipantWithSection extends Participant {
    section?: EventSection
}

interface BookingWithSections extends Booking {
    profile?: {
        full_name: string
        email: string
    }
    participants?: Array<{
        id: string
        section_id?: string
        section?: EventSection
    }>
}

interface TabData {
    id: string
    name: string
    icon: React.ReactNode
    count?: number
}

export default function EventViewPage() {
    const [event, setEvent] = useState<Event | null>(null)
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [bookings, setBookings] = useState<BookingWithSections[]>([])
    const [pricing, setPricing] = useState<EventPricing[]>([])
    const [discounts, setDiscounts] = useState<EventDiscount[]>([])
    const [participants, setParticipants] = useState<ParticipantWithSection[]>([])
    const [customFields, setCustomFields] = useState<FormField[]>([])
    const [sections, setSections] = useState<EventSection[]>([])
    const [isManagingFields, setIsManagingFields] = useState(false)
    const [editingFields, setEditingFields] = useState<FormField[]>([])
    const [fieldsError, setFieldsError] = useState('')
    const [fieldsSuccess, setFieldsSuccess] = useState('')
    const [stats, setStats] = useState({
        totalBookings: 0,
        confirmedBookings: 0,
        totalRevenue: 0,
        totalParticipants: 0
    })

    const params = useParams()
    const eventId = params.id as string
    const supabase = createClient()

    const tabs: TabData[] = [
        { id: 'overview', name: 'Overview', icon: <HiCalendarDays className="h-5 w-5" /> },
        { id: 'bookings', name: 'Bookings', icon: <HiClipboardDocumentList className="h-5 w-5" />, count: stats.totalBookings },
        { id: 'participants', name: 'Participants', icon: <HiUsers className="h-5 w-5" />, count: stats.totalParticipants },
        { id: 'pricing', name: 'Pricing', icon: <HiCurrencyDollar className="h-5 w-5" />, count: pricing.length },
        { id: 'discounts', name: 'Discounts', icon: <HiTag className="h-5 w-5" />, count: discounts.length },
        { id: 'sections', name: 'Sections', icon: <HiDocumentDuplicate className="h-5 w-5" />, count: sections.length },
        { id: 'custom-fields', name: 'Custom Fields', icon: <HiDocumentText className="h-5 w-5" />, count: customFields.length },
        { id: 'settings', name: 'Settings', icon: <HiCog8Tooth className="h-5 w-5" /> }
    ]

    const fetchEventData = useCallback(async () => {
        try {
            setLoading(true)
            
            // Fetch event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single()

            if (eventError) {
                throw new Error('Event not found')
            }

            setEvent(eventData)
            
            // Set custom fields from event
            setCustomFields(eventData.custom_form_fields || [])

            // Fetch bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    profile:profiles!bookings_user_id_fkey (
                        full_name,
                        email
                    ),
                    participants (
                        id,
                        section_id,
                        section:event_sections!participants_section_id_fkey (
                            id,
                            title,
                            description
                        )
                    )
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (!bookingsError && bookingsData) {
                setBookings(bookingsData)
                const confirmed = bookingsData.filter(b => ['confirmed', 'verified'].includes(b.status))
                const revenue = bookingsData.reduce((sum, b) => sum + (b.total_amount || 0), 0)
                setStats(prev => ({
                    ...prev,
                    totalBookings: bookingsData.length,
                    confirmedBookings: confirmed.length,
                    totalRevenue: revenue
                }))
            }

            // Fetch pricing
            const { data: pricingData, error: pricingError } = await supabase
                .from('event_pricing')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (!pricingError && pricingData) {
                setPricing(pricingData)
            }

            // Fetch discounts
            const { data: discountsData, error: discountsError } = await supabase
                .from('event_discounts')
                .select(`
                    *,
                    rules:participant_discount_rules(*)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (!discountsError && discountsData) {
                setDiscounts(discountsData)
            }

            // Fetch sections
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('event_sections')
                .select(`
                    *,
                    pricing:section_pricing(*)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (!sectionsError && sectionsData) {
                setSections(sectionsData)
            }

            // Fetch participants (from all bookings)
            if (bookingsData) {
                const allParticipants: ParticipantWithSection[] = []
                for (const booking of bookingsData) {
                    const { data: participantsData } = await supabase
                        .from('participants')
                        .select(`
                            *,
                            section:event_sections!participants_section_id_fkey (
                                id,
                                title,
                                description
                            )
                        `)
                        .eq('booking_id', booking.id)
                    
                    if (participantsData) {
                        allParticipants.push(...participantsData)
                    }
                }
                setParticipants(allParticipants)
                setStats(prev => ({
                    ...prev,
                    totalParticipants: allParticipants.length
                }))
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [eventId, supabase])

    useEffect(() => {
        fetchEventData()
    }, [fetchEventData])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    const getBookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            case 'verified': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
            case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'refunded': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }
    }

    const getParticipantStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            case 'whitelisted': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            default: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' // Default to active
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount)
    }

    if (loading) {
        return <FullPageLoader />
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Event not found</h1>
                <Link href="/organizer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto ">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: event.title }
                    ]} 
                />
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
                        <div className="flex items-center space-x-4 mt-2 text-gray-600 dark:text-gray-400">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                            <span className="flex items-center">
                                <HiMapPin className="h-4 w-4 mr-1" />
                                {event.location}
                            </span>
                            <span className="flex items-center">
                                <HiClock className="h-4 w-4 mr-1" />
                                {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        {event.has_sections && (
                            <Link
                                href={`/organizer/events/${eventId}/sections`}
                                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                            >
                                <HiDocumentDuplicate className="h-4 w-4 mr-2" />
                                Manage Sections
                            </Link>
                        )}
                        <Link
                            href={`/organizer/events/${eventId}/edit`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                        >
                            <HiPencilSquare className="h-4 w-4 mr-2" />
                            Edit Event
                        </Link>
                        <Link
                            href="/organizer"
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Back to Events
                        </Link>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            {tab.icon}
                            <span className="ml-2">{tab.name}</span>
                            {tab.count !== undefined && (
                                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-2 rounded-full text-xs">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-96">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <HiClipboardDocumentList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bookings</p>
                                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalBookings}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <HiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmed</p>
                                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.confirmedBookings}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                        <HiCurrencyDollar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalRevenue)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <HiUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</p>
                                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalParticipants}</p>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span className="text-green-600 dark:text-green-400">
                                                {participants.filter(p => p.status === 'active' || !p.status).length} Active
                                            </span>
                                            {participants.filter(p => p.status === 'whitelisted').length > 0 && (
                                                <span className="ml-2 text-blue-600 dark:text-blue-400">
                                                    {participants.filter(p => p.status === 'whitelisted').length} Whitelisted
                                                </span>
                                            )}
                                            {participants.filter(p => p.status === 'cancelled').length > 0 && (
                                                <span className="ml-2 text-red-600 dark:text-red-400">
                                                    {participants.filter(p => p.status === 'cancelled').length} Cancelled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Event Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Event Details</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description || 'No description provided'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Event Information</h4>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Start Date:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{new Date(event.start_date).toLocaleString()}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">End Date:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{new Date(event.end_date).toLocaleString()}</dd>
                                            </div>
                                            {event.entry_close_date && (
                                                <div className="flex justify-between">
                                                    <dt className="text-gray-600 dark:text-gray-400">Entry Close:</dt>
                                                    <dd className="text-gray-900 dark:text-gray-100">{new Date(event.entry_close_date).toLocaleString()}</dd>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Price:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{event.price === 0 ? 'Varies' : formatCurrency(event.price)}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Capacity:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{event.current_attendees} / {event.max_attendees || 'Unlimited'}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>



                        {/* Location Information */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Location Information</h3>
                                <Link
                                    href={`/organizer/events/${eventId}/edit`}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                                >
                                    Edit Event →
                                </Link>
                            </div>
                            <div className="p-6">
                                {!event.location ? (
                                    <div className="text-center py-8">
                                        <HiMapPin className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">No location information available for this event.</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">Add location details when editing the event.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Location Details */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Location Information</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-start">
                                                    <HiMapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-gray-900 dark:text-gray-100 font-medium">{event.location}</p>
                                                        {event.location_settings?.details && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.location_settings.details}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {event.location_settings?.url && (
                                                    <div className="flex items-center mt-3">
                                                        <HiArrowTopRightOnSquare className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                                                        <a
                                                            href={event.location_settings.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                                                        >
                                                            View on Google Maps
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Map */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Map</h4>
                                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                                {event.location_settings?.url ? (
                                                    <iframe
                                                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(event.location)}`}
                                                        width="100%"
                                                        height="300"
                                                        style={{ border: 0 }}
                                                        allowFullScreen
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        title="Event Location"
                                                    />
                                                ) : (
                                                    <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                                        <div className="text-center">
                                                            <HiMapPin className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                                            <p className="text-gray-500 dark:text-gray-400">Map preview not available</p>
                                                            <p className="text-sm text-gray-400 dark:text-gray-500">Add a location URL to enable map preview</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Directions */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Get Directions</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">From Your Location</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get directions from your current location to the event venue.</p>
                                                    <button
                                                        onClick={() => {
                                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium"
                                                    >
                                                        Get Directions
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Share Location</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Share the event location with participants and attendees.</p>
                                                    <button
                                                        onClick={() => {
                                                            const shareText = `Join me at: ${event.title}\nLocation: ${event.location}\nDate: ${new Date(event.start_date).toLocaleDateString()}`;
                                                            if (navigator.share) {
                                                                navigator.share({
                                                                    title: event.title,
                                                                    text: shareText,
                                                                    url: window.location.href
                                                                });
                                                            } else {
                                                                navigator.clipboard.writeText(shareText);
                                                                alert('Location copied to clipboard!');
                                                            }
                                                        }}
                                                        className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm font-medium"
                                                    >
                                                        Share Location
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Location Info */}
                                        {(event.location_settings?.details || event.location_settings?.url) && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Additional Information</h4>
                                                <div className="space-y-3">
                                                    {event.location_settings?.details && (
                                                        <div>
                                                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Venue Details</h5>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{event.location_settings.details}</p>
                                                        </div>
                                                    )}
                                                    {event.location_settings?.url && (
                                                        <div>
                                                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Links</h5>
                                                            <a
                                                                href={event.location_settings.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
                                                            >
                                                                <HiArrowTopRightOnSquare className="h-4 w-4 mr-1" />
                                                                Venue Website
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Link
                                        href={`/organizer/events/${eventId}/bookings`}
                                        className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <HiClipboardDocumentList className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">View Bookings</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/participants`}
                                        className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <HiUsers className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">View Participants</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/pricing`}
                                        className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <HiCurrencyDollar className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Manage Pricing</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/discounts`}
                                        className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <HiTag className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Manage Discounts</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Bookings</h3>
                            <Link
                                href={`/organizer/events/${eventId}/bookings`}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Booking ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                                        {event?.has_sections && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</th>
                                        )}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {bookings.slice(0, 10).map((booking) => (
                                        <tr key={booking.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <Link
                                                    href={`/organizer/events/${eventId}/bookings/${booking.id}`}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-mono"
                                                >
                                                    {booking.booking_id || booking.id.slice(0, 8)}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                <div>
                                                    <div className="font-medium">{booking.profile?.full_name || 'Unknown'}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{booking.profile?.email || ''}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {booking.quantity}
                                            </td>
                                            {event?.has_sections && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {booking.participants && booking.participants.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {booking.participants.map((participant) => (
                                                                <div key={participant.id}>
                                                                    {participant.section ? (
                                                                        <div className="text-xs">
                                                                            <div className="font-medium">{participant.section.title}</div>
                                                                            {participant.section.description && (
                                                                                <div className="text-gray-500 dark:text-gray-400">
                                                                                    {participant.section.description}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">No section</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-500 italic">No participants</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {formatCurrency(booking.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBookingStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {new Date(booking.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'participants' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">All Participants</h3>
                            <Link
                                href={`/organizer/events/${eventId}/participants`}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date of Birth</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        {event?.has_sections && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</th>
                                        )}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Booking ID</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {participants.slice(0, 10).map((participant) => (
                                        <tr key={participant.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {participant.first_name} {participant.last_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {participant.contact_email || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {participant.contact_phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {participant.date_of_birth ? new Date(participant.date_of_birth).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getParticipantStatusColor(participant.status)}`}>
                                                    {participant.status === 'cancelled' ? 'Cancelled' : 
                                                     participant.status === 'whitelisted' ? 'Whitelisted' :
                                                     participant.status === 'active' ? 'Active' :
                                                     'Active'}
                                                </span>
                                            </td>
                                            {event?.has_sections && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {participant.section ? (
                                                        <div>
                                                            <div className="font-medium">{participant.section.title}</div>
                                                            {participant.section.description && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {participant.section.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-500 italic">No section assigned</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {participant.booking_id ? (
                                                    <Link
                                                        href={`/organizer/events/${eventId}/bookings/${participant.booking_id}`}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-mono"
                                                    >
                                                        {participant.booking_id.slice(0, 8)}
                                                    </Link>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Pricing Options</h3>
                            <Link
                                href={`/organizer/events/${eventId}/pricing`}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                                Manage Pricing →
                            </Link>
                        </div>
                        <div className="p-6">
                            {pricing.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pricing options configured. Use the default event price.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pricing.map((price) => (
                                        <div key={price.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{price.name}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    price.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                }`}>
                                                    {price.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{price.description}</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{formatCurrency(price.price)}</p>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                <p>Type: {price.pricing_type}</p>
                                                <p>Membership: {price.membership_type}</p>
                                                <p>Available: {price.available_tickets} tickets</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'discounts' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Discount Rules</h3>
                            <Link
                                href={`/organizer/events/${eventId}/discounts`}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                                Manage Discounts →
                            </Link>
                        </div>
                        <div className="p-6">
                            {discounts.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No discounts configured for this event.</p>
                            ) : (
                                <div className="space-y-4">
                                    {discounts.map((discount) => (
                                        <div key={discount.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{discount.name}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    discount.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                }`}>
                                                    {discount.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{discount.description}</p>
                                            <div className="flex items-center space-x-4 text-sm">
                                                <span className="text-gray-900 dark:text-gray-100">
                                                    {discount.value_type === 'percentage' ? `${discount.value}% off` : `${formatCurrency(discount.value)} off`}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">Type: {discount.discount_type}</span>
                                                {discount.code && (
                                                    <span className="text-gray-500 dark:text-gray-400">Code: {discount.code}</span>
                                                )}
                                            </div>
                                            {discount.rules && discount.rules.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <p>{discount.rules.length} rule{discount.rules.length !== 1 ? 's' : ''} configured</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'custom-fields' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Custom Form Fields</h3>
                            {!isManagingFields ? (
                                <button
                                    onClick={() => { setIsManagingFields(true); setEditingFields(customFields); setFieldsError(''); setFieldsSuccess('') }}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                                >
                                    Manage Fields
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setIsManagingFields(false); setFieldsError(''); setFieldsSuccess('') }}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {isManagingFields ? (
                                <div>
                                    {fieldsError && (
                                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">{fieldsError}</div>
                                    )}
                                    {fieldsSuccess && (
                                        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">{fieldsSuccess}</div>
                                    )}
                                    <FormBuilder
                                        fields={editingFields}
                                        onChange={setEditingFields}
                                        context="event"
                                    />
                                    <div className="flex justify-end space-x-3 mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <button
                                            onClick={() => { setIsManagingFields(false); setEditingFields(customFields) }}
                                            className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setFieldsError(''); setFieldsSuccess('')
                                                try {
                                                    const { error: updateError } = await supabase
                                                        .from('events')
                                                        .update({ custom_form_fields: editingFields, updated_at: new Date().toISOString() })
                                                        .eq('id', eventId)
                                                    if (updateError) throw new Error(updateError.message)
                                                    setCustomFields(editingFields)
                                                    setFieldsSuccess('Custom fields updated successfully')
                                                } catch (e) {
                                                    setFieldsError(e instanceof Error ? e.message : 'Failed to update custom fields')
                                                }
                                            }}
                                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {customFields.length === 0 ? (
                                        <div className="text-center py-8">
                                            <HiDocumentText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400 mb-4">No custom form fields configured for this event.</p>
                                            <button
                                                onClick={() => { setIsManagingFields(true); setEditingFields(customFields) }}
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                                            >
                                                Add Fields
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {customFields.map((field, index) => (
                                                <div key={field.id || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{field.label}</h4>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${field.required ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                                                                {field.required ? 'Required' : 'Optional'}
                                                            </span>
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                                {field.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {field.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{field.description}</p>
                                                    )}
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                                        <p><strong>Field Name:</strong> {field.name}</p>
                                                        {field.placeholder && (
                                                            <p><strong>Placeholder:</strong> {field.placeholder}</p>
                                                        )}
                                                        {field.options && field.options.length > 0 && (
                                                            <p><strong>Options:</strong> {field.options.join(', ')}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'sections' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Event Sections</h3>
                            <Link
                                href={`/organizer/events/${eventId}/sections`}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                                Manage Sections →
                            </Link>
                        </div>
                        <div className="p-6">
                            {sections.length === 0 ? (
                                <div className="text-center py-8">
                                    <HiDocumentDuplicate className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">No sections configured for this event.</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Create sections to organize your event into different divisions or categories.</p>
                                    <Link
                                        href={`/organizer/events/${eventId}/sections`}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Create First Section
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sections.map((section) => (
                                        <div key={section.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{section.title}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    section.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                    section.status === 'draft' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                                                    section.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                }`}>
                                                    {section.status}
                                                </span>
                                            </div>
                                            {section.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{section.description}</p>
                                            )}
                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center">
                                                    <HiCalendarDays className="h-4 w-4 mr-2" />
                                                    <span>{new Date(section.start_date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiClock className="h-4 w-4 mr-2" />
                                                    <span>
                                                        {new Date(section.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                                        {new Date(section.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <HiUsers className="h-4 w-4 mr-2" />
                                                    <span>{section.current_seats} / {section.max_seats} seats</span>
                                                </div>
                                                {section.pricing && section.pricing.length > 0 && (
                                                    <div className="flex items-center">
                                                        <HiCurrencyDollar className="h-4 w-4 mr-2" />
                                                        <span>From {formatCurrency(section.pricing[0].price)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Event Settings</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">General Settings</h4>
                                        <dl className="space-y-3">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Event Status:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{event.status}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Promoted:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{event.is_promoted ? 'Yes' : 'No'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600 dark:text-gray-400">Custom Form Fields:</dt>
                                                <dd className="text-gray-900 dark:text-gray-100">{event.custom_form_fields?.length || 0} fields</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h4>
                                        <div className="space-y-3">
                                            <Link
                                                href={`/organizer/events/${eventId}/edit`}
                                                className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                            >
                                                <HiPencilSquare className="h-4 w-4 mr-2" />
                                                Edit Event Details
                                            </Link>
                                            <button className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                                                <HiDocumentDuplicate className="h-4 w-4 mr-2" />
                                                Clone Event
                                            </button>
                                            <Link
                                                href={`/organizer/email-manager?eventId=${eventId}`}
                                                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                                            >
                                                <HiEnvelope className="h-4 w-4 mr-2" />
                                                Email Contact
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 