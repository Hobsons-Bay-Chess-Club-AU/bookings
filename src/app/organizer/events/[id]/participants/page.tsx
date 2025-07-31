'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Event, Participant, Booking, Profile, FormField } from '@/lib/types/database'

interface ParticipantWithBooking extends Participant {
    bookings: (Booking & {
        profiles: Profile
    })
}

export default function EventParticipantsPage() {
    const [event, setEvent] = useState<Event | null>(null)
    const [participants, setParticipants] = useState<ParticipantWithBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithBooking | null>(null)
    
    const params = useParams()
    const eventId = params.id as string
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                // Fetch event details
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single()

                if (eventError) {
                    throw new Error('Event not found')
                }

                setEvent(eventData)

                // Fetch participants for this event
                const response = await fetch(`/api/events/${eventId}/participants`)
                if (!response.ok) {
                    throw new Error('Failed to fetch participants')
                }

                const participantsData = await response.json()
                setParticipants(participantsData)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [eventId])

    const filteredParticipants = participants.filter(participant => {
        const searchLower = searchTerm.toLowerCase()
        return (
            participant.first_name.toLowerCase().includes(searchLower) ||
            participant.last_name.toLowerCase().includes(searchLower) ||
            participant.contact_email?.toLowerCase().includes(searchLower) ||
            participant.bookings.profiles.email.toLowerCase().includes(searchLower)
        )
    })

    const exportToCsv = () => {
        if (participants.length === 0) return

        // Get all unique custom field names
        const customFieldNames = new Set<string>()
        participants.forEach(p => {
            Object.keys(p.custom_data || {}).forEach(key => customFieldNames.add(key))
        })

        // Create CSV headers
        const headers = [
            'First Name',
            'Last Name',
            'Date of Birth',
            'Contact Email',
            'Contact Phone',
            'Booking Date',
            'Booking Status',
            'Ticket Quantity',
            'Amount Paid',
            'Booker Name',
            'Booker Email',
            ...Array.from(customFieldNames)
        ]

        // Create CSV rows
        const rows = participants.map(p => [
            p.first_name,
            p.last_name,
            p.date_of_birth || '',
            p.contact_email || '',
            p.contact_phone || '',
            `${new Date(p.bookings.created_at).toLocaleDateString()} at ${new Date(p.bookings.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })}`,
            p.bookings.status,
            p.bookings.quantity,
            `$${p.bookings.total_amount}`,
            p.bookings.profiles.full_name || '',
            p.bookings.profiles.email,
            ...Array.from(customFieldNames).map(fieldName => 
                p.custom_data?.[fieldName] || ''
            )
        ])

        // Convert to CSV string
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n')

        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${event?.title || 'event'}-participants.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading participants...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <p className="text-red-600">{error}</p>
                        <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Event Participants</h1>
                            <p className="text-gray-600">{event?.title}</p>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href={`/organizer/events/${eventId}/bookings`}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                View Bookings
                            </Link>
                            <Link
                                href="/organizer"
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Participants
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {participants.length}
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
                                    <span className="text-2xl">📧</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            With Contact Email
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {participants.filter(p => p.contact_email).length}
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
                                    <span className="text-2xl">📱</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            With Phone Number
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {participants.filter(p => p.contact_phone).length}
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
                                    <span className="text-2xl">📋</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Unique Bookings
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {new Set(participants.map(p => p.booking_id)).size}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white shadow rounded-lg mb-6 text-gray-900">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 max-w-lg">
                                <input
                                    type="text"
                                    placeholder="Search participants..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                onClick={exportToCsv}
                                disabled={participants.length === 0}
                                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Participants List */}
                <div className="bg-white shadow rounded-lg">
                    {filteredParticipants.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">👥</span>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                                {participants.length === 0 ? 'No participants yet' : 'No participants match your search'}
                            </h4>
                            <p className="text-gray-600">
                                {participants.length === 0 
                                    ? 'Participant information will appear here once people book your event.'
                                    : 'Try adjusting your search criteria.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Participant
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booking Info
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booked By
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredParticipants.map((participant) => (
                                        <tr key={participant.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-indigo-700">
                                                                {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {participant.first_name} {participant.last_name}
                                                        </div>
                                                        {participant.date_of_birth && (
                                                            <div className="text-sm text-gray-500">
                                                                DOB: {new Date(participant.date_of_birth).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {participant.contact_email && (
                                                        <div>{participant.contact_email}</div>
                                                    )}
                                                    {participant.contact_phone && (
                                                        <div className="text-gray-500">{participant.contact_phone}</div>
                                                    )}
                                                    {!participant.contact_email && !participant.contact_phone && (
                                                        <span className="text-gray-400">No contact info</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            participant.bookings.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                            participant.bookings.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            participant.bookings.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {participant.bookings.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-500 text-xs mt-1">
                                                        {new Date(participant.bookings.created_at).toLocaleDateString()} at {new Date(participant.bookings.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    <div>{participant.bookings.profiles.full_name || 'Unknown'}</div>
                                                    <div className="text-gray-500">{participant.bookings.profiles.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedParticipant(participant)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Participant Details Modal */}
            {selectedParticipant && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Participant Details
                                </h3>
                                <button
                                    onClick={() => setSelectedParticipant(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedParticipant.first_name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedParticipant.last_name}</p>
                                        </div>
                                        {selectedParticipant.date_of_birth && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {new Date(selectedParticipant.date_of_birth).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {selectedParticipant.contact_email && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                                                <p className="mt-1 text-sm text-gray-900">{selectedParticipant.contact_email}</p>
                                            </div>
                                        )}
                                        {selectedParticipant.contact_phone && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                                                <p className="mt-1 text-sm text-gray-900">{selectedParticipant.contact_phone}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Fields */}
                                {selectedParticipant.custom_data && Object.keys(selectedParticipant.custom_data).length > 0 && (
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                                        <div className="space-y-3">
                                            {Object.entries(selectedParticipant.custom_data).map(([key, value]) => (
                                                <div key={key}>
                                                    <label className="block text-sm font-medium text-gray-700 capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </label>
                                                    <p className="mt-1 text-sm text-gray-900">
                                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Booking Info */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Booking Information</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    selectedParticipant.bookings.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    selectedParticipant.bookings.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    selectedParticipant.bookings.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {selectedParticipant.bookings.status}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Booking Date</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {new Date(selectedParticipant.bookings.created_at).toLocaleDateString()} at {new Date(selectedParticipant.bookings.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                                <p className="mt-1 text-sm text-gray-900">{selectedParticipant.bookings.quantity}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                                                <p className="mt-1 text-sm text-gray-900">$AUD {selectedParticipant.bookings.total_amount}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end mt-6">
                                <button
                                    onClick={() => setSelectedParticipant(null)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}