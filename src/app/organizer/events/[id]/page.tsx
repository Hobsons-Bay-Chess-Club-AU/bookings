'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
    HiExclamationTriangle,
    HiCheckCircle,
    HiXCircle,
    HiDocumentText,
    HiArrowTopRightOnSquare
} from 'react-icons/hi2'
import { Event, EventPricing, EventDiscount, Booking, Participant, FormField } from '@/lib/types/database'

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
    const [bookings, setBookings] = useState<Booking[]>([])
    const [pricing, setPricing] = useState<EventPricing[]>([])
    const [discounts, setDiscounts] = useState<EventDiscount[]>([])
    const [participants, setParticipants] = useState<Participant[]>([])
    const [customFields, setCustomFields] = useState<FormField[]>([])
    const [stats, setStats] = useState({
        totalBookings: 0,
        confirmedBookings: 0,
        totalRevenue: 0,
        totalParticipants: 0
    })

    const router = useRouter()
    const params = useParams()
    const eventId = params.id as string
    const supabase = createClient()

    const tabs: TabData[] = [
        { id: 'overview', name: 'Overview', icon: <HiCalendarDays className="h-5 w-5" /> },
        { id: 'bookings', name: 'Bookings', icon: <HiClipboardDocumentList className="h-5 w-5" />, count: stats.totalBookings },
        { id: 'participants', name: 'Participants', icon: <HiUsers className="h-5 w-5" />, count: stats.totalParticipants },
        { id: 'pricing', name: 'Pricing', icon: <HiCurrencyDollar className="h-5 w-5" />, count: pricing.length },
        { id: 'discounts', name: 'Discounts', icon: <HiTag className="h-5 w-5" />, count: discounts.length },
        { id: 'custom-fields', name: 'Custom Fields', icon: <HiDocumentText className="h-5 w-5" />, count: customFields.length },
        { id: 'location', name: 'Location', icon: <HiMapPin className="h-5 w-5" /> },
        { id: 'settings', name: 'Settings', icon: <HiCog8Tooth className="h-5 w-5" /> }
    ]

    useEffect(() => {
        fetchEventData()
    }, [eventId])

    const fetchEventData = async () => {
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
                .select('*')
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

            // Fetch participants (from all bookings)
            if (bookingsData) {
                const allParticipants: Participant[] = []
                for (const booking of bookingsData) {
                    const { data: participantsData } = await supabase
                        .from('participants')
                        .select('*')
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
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-800'
            case 'draft': return 'bg-gray-100 text-gray-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            case 'completed': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getBookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800'
            case 'verified': return 'bg-blue-100 text-blue-800'
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            case 'refunded': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
                <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500">
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                        <div className="flex items-center space-x-4 mt-2 text-gray-600">
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
                        <Link
                            href={`/organizer/events/${eventId}/edit`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                        >
                            <HiPencilSquare className="h-4 w-4 mr-2" />
                            Edit Event
                        </Link>
                        <Link
                            href="/organizer"
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Back to Events
                        </Link>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon}
                            <span className="ml-2">{tab.name}</span>
                            {tab.count !== undefined && (
                                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
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
                            <div className="bg-white p-6 rounded-lg shadow border">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <HiClipboardDocumentList className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <HiCheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Confirmed</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.confirmedBookings}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border">
                                <div className="flex items-center">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <HiCurrencyDollar className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Revenue</p>
                                        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <HiUsers className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Participants</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.totalParticipants}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Event Details */}
                        <div className="bg-white rounded-lg shadow border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                                        <p className="text-gray-600 whitespace-pre-wrap">{event.description || 'No description provided'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Event Information</h4>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Start Date:</dt>
                                                <dd className="text-gray-900">{new Date(event.start_date).toLocaleString()}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">End Date:</dt>
                                                <dd className="text-gray-900">{new Date(event.end_date).toLocaleString()}</dd>
                                            </div>
                                            {event.entry_close_date && (
                                                <div className="flex justify-between">
                                                    <dt className="text-gray-600">Entry Close:</dt>
                                                    <dd className="text-gray-900">{new Date(event.entry_close_date).toLocaleString()}</dd>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Price:</dt>
                                                <dd className="text-gray-900">{formatCurrency(event.price)}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Capacity:</dt>
                                                <dd className="text-gray-900">{event.current_attendees} / {event.max_attendees || 'Unlimited'}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Fields Summary */}
                        <div className="bg-white rounded-lg shadow border">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Custom Form Fields</h3>
                                <Link
                                    href={`/organizer/events/${eventId}/edit`}
                                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                >
                                    Edit Event →
                                </Link>
                            </div>
                            <div className="p-6">
                                {customFields.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No custom form fields configured. Participants will only provide basic information.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Total Fields:</span>
                                            <span className="font-medium text-gray-900">{customFields.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Required Fields:</span>
                                            <span className="font-medium text-gray-900">{customFields.filter(f => f.required).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Field Types:</span>
                                            <span className="font-medium text-gray-900">
                                                {Array.from(new Set(customFields.map(f => f.type))).join(', ')}
                                            </span>
                                        </div>
                                        <div className="pt-3 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                <strong>Field Names:</strong> {customFields.map(f => f.name).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location Summary */}
                        <div className="bg-white rounded-lg shadow border">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
                                <Link
                                    href={`/organizer/events/${eventId}?tab=location`}
                                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                >
                                    View Details →
                                </Link>
                            </div>
                            <div className="p-6">
                                {!event.location ? (
                                    <p className="text-gray-500 text-center py-4">No location information available for this event.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-start">
                                            <HiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                                            <div>
                                                <p className="text-gray-900 font-medium">{event.location}</p>
                                                {event.location_settings?.details && (
                                                    <p className="text-sm text-gray-600 mt-1">{event.location_settings.details}</p>
                                                )}
                                            </div>
                                        </div>
                                        {event.location_settings?.url && (
                                            <div className="flex items-center">
                                                <HiArrowTopRightOnSquare className="h-4 w-4 text-gray-400 mr-2" />
                                                <a
                                                    href={event.location_settings.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                                >
                                                    View on Google Maps
                                                </a>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-gray-200">
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
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Link
                                        href={`/organizer/events/${eventId}/bookings`}
                                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <HiClipboardDocumentList className="h-8 w-8 text-indigo-600 mb-2" />
                                        <span className="text-sm font-medium text-gray-900">View Bookings</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/participants`}
                                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <HiUsers className="h-8 w-8 text-green-600 mb-2" />
                                        <span className="text-sm font-medium text-gray-900">View Participants</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/pricing`}
                                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <HiCurrencyDollar className="h-8 w-8 text-yellow-600 mb-2" />
                                        <span className="text-sm font-medium text-gray-900">Manage Pricing</span>
                                    </Link>
                                    <Link
                                        href={`/organizer/events/${eventId}/discounts`}
                                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <HiTag className="h-8 w-8 text-purple-600 mb-2" />
                                        <span className="text-sm font-medium text-gray-900">Manage Discounts</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
                            <Link
                                href={`/organizer/events/${eventId}/bookings`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bookings.slice(0, 10).map((booking) => (
                                        <tr key={booking.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {booking.booking_id || booking.id.slice(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {booking.user?.full_name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {booking.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(booking.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBookingStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">All Participants</h3>
                            <Link
                                href={`/organizer/events/${eventId}/participants`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {participants.slice(0, 10).map((participant) => (
                                        <tr key={participant.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {participant.first_name} {participant.last_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {participant.email || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {participant.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {participant.date_of_birth ? new Date(participant.date_of_birth).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {participant.booking_id?.slice(0, 8) || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Pricing Options</h3>
                            <Link
                                href={`/organizer/events/${eventId}/pricing`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Manage Pricing →
                            </Link>
                        </div>
                        <div className="p-6">
                            {pricing.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No pricing options configured. Use the default event price.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pricing.map((price) => (
                                        <div key={price.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900">{price.name}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    price.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {price.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{price.description}</p>
                                            <p className="text-lg font-semibold text-gray-900 mb-2">{formatCurrency(price.price)}</p>
                                            <div className="text-xs text-gray-500">
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
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Discount Rules</h3>
                            <Link
                                href={`/organizer/events/${eventId}/discounts`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Manage Discounts →
                            </Link>
                        </div>
                        <div className="p-6">
                            {discounts.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No discounts configured for this event.</p>
                            ) : (
                                <div className="space-y-4">
                                    {discounts.map((discount) => (
                                        <div key={discount.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900">{discount.name}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    discount.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {discount.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{discount.description}</p>
                                            <div className="flex items-center space-x-4 text-sm">
                                                <span className="text-gray-900">
                                                    {discount.value_type === 'percentage' ? `${discount.value}% off` : `${formatCurrency(discount.value)} off`}
                                                </span>
                                                <span className="text-gray-500">Type: {discount.discount_type}</span>
                                                {discount.code && (
                                                    <span className="text-gray-500">Code: {discount.code}</span>
                                                )}
                                            </div>
                                            {discount.rules && discount.rules.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-500">
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
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Custom Form Fields</h3>
                            <Link
                                href={`/organizer/events/${eventId}/edit`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Edit Event →
                            </Link>
                        </div>
                        <div className="p-6">
                            {customFields.length === 0 ? (
                                <div className="text-center py-8">
                                    <HiDocumentText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">No custom form fields configured for this event.</p>
                                    <p className="text-sm text-gray-400">Custom fields are configured when editing the event.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {customFields.map((field, index) => (
                                        <div key={field.id || index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-gray-900">{field.label}</h4>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        field.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {field.required ? 'Required' : 'Optional'}
                                                    </span>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {field.type}
                                                    </span>
                                                </div>
                                            </div>
                                            {field.description && (
                                                <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                                            )}
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <p><strong>Field Name:</strong> {field.name}</p>
                                                {field.placeholder && (
                                                    <p><strong>Placeholder:</strong> {field.placeholder}</p>
                                                )}
                                                {field.options && field.options.length > 0 && (
                                                    <p><strong>Options:</strong> {field.options.join(', ')}</p>
                                                )}
                                                {field.validation && (
                                                    <div>
                                                        <p><strong>Validation:</strong></p>
                                                        <ul className="ml-4 space-y-1">
                                                            {field.validation.minLength && (
                                                                <li>Min length: {field.validation.minLength}</li>
                                                            )}
                                                            {field.validation.maxLength && (
                                                                <li>Max length: {field.validation.maxLength}</li>
                                                            )}
                                                            {field.validation.min !== undefined && (
                                                                <li>Min value: {field.validation.min}</li>
                                                            )}
                                                            {field.validation.max !== undefined && (
                                                                <li>Max value: {field.validation.max}</li>
                                                            )}
                                                            {field.validation.regex && (
                                                                <li>Pattern: {field.validation.regex}</li>
                                                            )}
                                                        </ul>
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

                {activeTab === 'location' && (
                    <div className="bg-white rounded-lg shadow border">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Event Location</h3>
                            <Link
                                href={`/organizer/events/${eventId}/edit`}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Edit Event →
                            </Link>
                        </div>
                        <div className="p-6">
                            {!event?.location ? (
                                <div className="text-center py-8">
                                    <HiMapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">No location information available for this event.</p>
                                    <p className="text-sm text-gray-400">Add location details when editing the event.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Location Details */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-3">Location Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-start">
                                                <HiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                                                <div>
                                                    <p className="text-gray-900 font-medium">{event.location}</p>
                                                                            {event.location_settings?.details && (
                            <p className="text-sm text-gray-600 mt-1">{event.location_settings.details}</p>
                        )}
                                                </div>
                                            </div>
                                            {event.location_settings?.url && (
                                                <div className="flex items-center mt-3">
                                                    <HiArrowTopRightOnSquare className="h-4 w-4 text-gray-400 mr-2" />
                                                    <a
                                                        href={event.location_settings.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                                    >
                                                        View on Google Maps
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Map */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-3">Map</h4>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            {event.location_settings?.url ? (
                                                <iframe
                                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(event.location)}`}
                                                    width="100%"
                                                    height="400"
                                                    style={{ border: 0 }}
                                                    allowFullScreen
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    title="Event Location"
                                                />
                                            ) : (
                                                <div className="h-96 flex items-center justify-center bg-gray-100">
                                                    <div className="text-center">
                                                        <HiMapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-gray-500">Map preview not available</p>
                                                        <p className="text-sm text-gray-400">Add a location URL to enable map preview</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Directions */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-3">Get Directions</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h5 className="font-medium text-gray-900 mb-2">From Your Location</h5>
                                                <p className="text-sm text-gray-600 mb-3">Get directions from your current location to the event venue.</p>
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
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h5 className="font-medium text-gray-900 mb-2">Share Location</h5>
                                                <p className="text-sm text-gray-600 mb-3">Share the event location with participants and attendees.</p>
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
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                                            <div className="space-y-3">
                                                {event.location_settings?.details && (
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray-700 mb-1">Venue Details</h5>
                                                        <p className="text-sm text-gray-600">{event.location_settings.details}</p>
                                                    </div>
                                                )}
                                                {event.location_settings?.url && (
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray-700 mb-1">External Links</h5>
                                                        <a
                                                            href={event.location_settings.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center"
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
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Event Settings</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-4">General Settings</h4>
                                        <dl className="space-y-3">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Event Status:</dt>
                                                <dd className="text-gray-900">{event.status}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Promoted:</dt>
                                                <dd className="text-gray-900">{event.is_promoted ? 'Yes' : 'No'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-600">Custom Form Fields:</dt>
                                                <dd className="text-gray-900">{event.custom_form_fields?.length || 0} fields</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
                                        <div className="space-y-3">
                                            <Link
                                                href={`/organizer/events/${eventId}/edit`}
                                                className="flex items-center text-indigo-600 hover:text-indigo-500"
                                            >
                                                <HiPencilSquare className="h-4 w-4 mr-2" />
                                                Edit Event Details
                                            </Link>
                                            <button className="flex items-center text-gray-600 hover:text-gray-500">
                                                <HiDocumentDuplicate className="h-4 w-4 mr-2" />
                                                Clone Event
                                            </button>
                                            <button className="flex items-center text-gray-600 hover:text-gray-500">
                                                <HiEnvelope className="h-4 w-4 mr-2" />
                                                Send Marketing Email
                                            </button>
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