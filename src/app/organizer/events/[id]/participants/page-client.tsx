'use client'

import { useState } from 'react'
import { Event, Participant, Booking, Profile } from '@/lib/types/database'

interface ParticipantWithBooking extends Participant {
    bookings: (Booking & {
        profiles: Profile
    })
}

interface EventParticipantsPageClientProps {
    event: Event
    participants: ParticipantWithBooking[]
}

export default function EventParticipantsPageClient({
    event,
    participants
}: EventParticipantsPageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithBooking | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const filteredParticipants = participants.filter(participant => {
        if (!searchTerm) return true

        const searchLower = searchTerm.toLowerCase()
        return (
            participant.first_name.toLowerCase().includes(searchLower) ||
            participant.last_name.toLowerCase().includes(searchLower) ||
            participant.email?.toLowerCase().includes(searchLower) ||
            participant.bookings.profiles.email.toLowerCase().includes(searchLower)
        )
    })

    // Pagination calculations
    const totalItems = filteredParticipants.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex)

    // Reset to first page when search changes
    const handleSearchChange = (term: string) => {
        setSearchTerm(term)
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top of participants list
        document.getElementById('participants-list')?.scrollIntoView({ behavior: 'smooth' })
    }

    const exportToCsv = () => {
        if (filteredParticipants.length === 0) return

        // Get all unique custom field names from filtered participants
        const customFieldNames = new Set<string>()
        filteredParticipants.forEach(p => {
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

        // Create CSV rows from filtered participants
        const rows = filteredParticipants.map(p => [
            p.first_name,
            p.last_name,
            p.date_of_birth || '',
            p.email || '',
            p.phone || '',
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

    return (
        <>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Participants</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{event?.title}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">👥</span>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                        Total Participants
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {participants.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">📧</span>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                        With Contact Email
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {participants.filter(p => p.email).length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">📱</span>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                        With Phone Number
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {participants.filter(p => p.phone).length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">📋</span>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                        Unique Bookings
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {new Set(participants.map(p => p.booking_id)).size}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Indicator */}
            {searchTerm && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <span className="text-blue-600 dark:text-blue-400 mr-2">🔍</span>
                            <span className="text-sm text-blue-800 dark:text-blue-300">
                                Showing {filteredParticipants.length} of {participants.length} participant{filteredParticipants.length !== 1 ? 's' : ''} matching &quot;{searchTerm}&quot;
                            </span>
                        </div>
                        <button
                            onClick={() => handleSearchChange('')}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                        >
                            Clear search
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 text-gray-900 dark:text-gray-100">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or booker info..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 dark:text-gray-500">🔍</span>
                                </div>
                                {searchTerm && (
                                    <button
                                        onClick={() => handleSearchChange('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="itemsPerPage" className="text-sm text-gray-700 dark:text-gray-300">Show:</label>
                                <select
                                    id="itemsPerPage"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value))
                                        setCurrentPage(1)
                                    }}
                                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
                            </div>
                            <button
                                onClick={exportToCsv}
                                disabled={participants.length === 0}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Export CSV ({filteredParticipants.length})
                            </button>
                        </div>
                    </div>
                    {searchTerm && filteredParticipants.length < participants.length && (
                        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                <span className="font-medium">Note:</span> Export will include all {filteredParticipants.length} filtered results, not just the current page.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Participants List */}
            <div id="participants-list" className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Participants ({filteredParticipants.length})
                        </h2>
                        {totalPages > 1 && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                            </div>
                        )}
                    </div>
                </div>
                {filteredParticipants.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-4 block">👥</span>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {participants.length === 0 ? 'No participants yet' : 'No participants match your search'}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                            {participants.length === 0
                                ? 'Participant information will appear here once people book your event.'
                                : 'Try adjusting your search criteria.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Participant
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Booking Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Booked By
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedParticipants.map((participant) => (
                                    <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                                            {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {participant.first_name} {participant.last_name}
                                                    </div>
                                                    {participant.date_of_birth && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            DOB: {new Date(participant.date_of_birth).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                {participant.email && (
                                                    <div>{participant.email}</div>
                                                )}
                                                {participant.phone && (
                                                    <div className="text-gray-500 dark:text-gray-400">{participant.phone}</div>
                                                )}
                                                {!participant.email && !participant.phone && (
                                                    <span className="text-gray-400 dark:text-gray-500">No contact info</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${participant.bookings.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                        participant.bookings.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                            participant.bookings.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                                'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                                        }`}>
                                                        {participant.bookings.status}
                                                    </span>
                                                </div>
                                                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                                    {new Date(participant.bookings.created_at).toLocaleDateString()} at {new Date(participant.bookings.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <div>{participant.bookings.profiles.full_name || 'Unknown'}</div>
                                                <div className="text-gray-500 dark:text-gray-400">{participant.bookings.profiles.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedParticipant(participant)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex space-x-1">
                                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                                let pageNumber
                                                if (totalPages <= 7) {
                                                    pageNumber = i + 1
                                                } else if (currentPage <= 4) {
                                                    pageNumber = i + 1
                                                } else if (currentPage >= totalPages - 3) {
                                                    pageNumber = totalPages - 6 + i
                                                } else {
                                                    pageNumber = currentPage - 3 + i
                                                }

                                                const isActive = pageNumber === currentPage
                                                return (
                                                    <button
                                                        key={pageNumber}
                                                        onClick={() => handlePageChange(pageNumber)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${isActive
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Participant Details Modal */}
            {selectedParticipant && (
                <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Participant Details
                                </h3>
                                <button
                                    onClick={() => setSelectedParticipant(null)}
                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.first_name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.last_name}</p>
                                        </div>
                                        {selectedParticipant.date_of_birth && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                    {new Date(selectedParticipant.date_of_birth).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {selectedParticipant.email && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.email}</p>
                                            </div>
                                        )}
                                        {selectedParticipant.phone && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phone</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.phone}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Fields */}
                                {selectedParticipant.custom_data && Object.keys(selectedParticipant.custom_data).length > 0 && (
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Additional Information</h4>
                                        <div className="space-y-3">
                                            {Object.entries(selectedParticipant.custom_data).map(([key, value]) => (
                                                <div key={key}>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Booking Info */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Booking Information</h4>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedParticipant.bookings.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                    selectedParticipant.bookings.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                        selectedParticipant.bookings.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                            'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                                    }`}>
                                                    {selectedParticipant.bookings.status}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Booking Date</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                    {new Date(selectedParticipant.bookings.created_at).toLocaleDateString()} at {new Date(selectedParticipant.bookings.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.bookings.quantity}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">$AUD {selectedParticipant.bookings.total_amount}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end mt-6">
                                <button
                                    onClick={() => setSelectedParticipant(null)}
                                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
