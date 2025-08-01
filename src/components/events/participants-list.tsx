'use client'

import { useState } from 'react'
import { Booking, Event, Profile } from '@/lib/types/database'

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

interface ParticipantsListProps {
    event: Event
    bookings: BookingWithProfile[]
    isPublic?: boolean
    showPrivateInfo?: boolean
}

type SortOption = 'name' | 'date' | 'tickets'

export default function ParticipantsList({
    event,
    bookings,
    isPublic = false,
    showPrivateInfo = false
}: ParticipantsListProps) {
    const [sortBy, setSortBy] = useState<SortOption>('name')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Get display fields from event settings for public view
    const displayFields = isPublic
        ? (event.settings?.participant_display_fields || ['first_name', 'last_name'])
        : ['first_name', 'last_name', 'contact_email', 'contact_phone'] // Show all for private view

    // Check if participants should be shown publicly
    const shouldShowPublicParticipants = isPublic ? (event.settings?.show_participants_public || false) : true

    // Don't show anything if public view is disabled
    if (isPublic && !shouldShowPublicParticipants) {
        return (
            <div className="bg-white shadow rounded-lg p-8 text-center">
                <span className="text-4xl mb-4 block">🔒</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Participant List Private
                </h3>
                <p className="text-gray-600">
                    The organizer has chosen to keep the participant list private for this event.
                </p>
            </div>
        )
    }

    // Filter to only confirmed/verified participants
    const confirmedBookings = bookings.filter(b =>
        b.status === 'confirmed' || b.status === 'verified'
    )

    // Filter by search term
    const filteredBookings = confirmedBookings.filter(booking => {
        const searchableText = [
            booking.profile.full_name || '',
            booking.profile.email || ''
        ].join(' ').toLowerCase()
        
        return searchableText.includes(searchTerm.toLowerCase())
    })    // Helper function to get field value
    const getFieldValue = (booking: BookingWithProfile, fieldId: string): string => {
        // Handle custom fields
        if (fieldId.startsWith('custom_')) {
            const customFieldName = fieldId.replace('custom_', '')
            // Check if booking has participants with custom data
            if (booking.participants && booking.participants.length > 0) {
                const participant = booking.participants[0] // For now, get first participant
                const customValue = participant.custom_data?.[customFieldName]
                
                // Handle null/undefined values
                if (!customValue) return '-'
                
                // Handle arrays
                if (Array.isArray(customValue)) {
                    return customValue.join(', ')
                }
                
                // Handle FIDE/ACF player objects
                if (typeof customValue === 'object') {
                    // Check if it's a FIDE player object
                    if (customValue.id && customValue.name && 'std_rating' in customValue) {
                        const ratings = []
                        if (customValue.std_rating) ratings.push(`Std: ${customValue.std_rating}`)
                        if (customValue.rapid_rating) ratings.push(`Rapid: ${customValue.rapid_rating}`)
                        if (customValue.blitz_rating) ratings.push(`Blitz: ${customValue.blitz_rating}`)
                        
                        return `${customValue.name} (ID: ${customValue.id})${ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''}`
                    }
                    
                    // Check if it's an ACF player object (similar structure)
                    if (customValue.id && customValue.name) {
                        const ratings = []
                        if (customValue.std_rating) ratings.push(`Std: ${customValue.std_rating}`)
                        if (customValue.rapid_rating) ratings.push(`Rapid: ${customValue.rapid_rating}`)
                        if (customValue.blitz_rating) ratings.push(`Blitz: ${customValue.blitz_rating}`)
                        
                        return `${customValue.name} (ID: ${customValue.id})${ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''}`
                    }
                    
                    // Handle other object types - try to display meaningful information
                    if (customValue.name) {
                        return customValue.name
                    } else if (customValue.label) {
                        return customValue.label
                    } else if (customValue.title) {
                        return customValue.title
                    } else {
                        // Fallback for generic objects - show key-value pairs
                        const entries = Object.entries(customValue)
                            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                            .slice(0, 3) // Limit to first 3 entries to avoid too long text
                        
                        if (entries.length > 0) {
                            return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
                        }
                        
                        return '[Complex Data]'
                    }
                }
                
                // Handle primitive values
                return customValue?.toString() || '-'
            }
            return '-'
        }

        // Handle built-in fields
        switch (fieldId) {
            case 'first_name':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].first_name || 'Unknown'
                }
                return booking.profile.full_name?.split(' ')[0] || 'Unknown'
            case 'last_name':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].last_name || 'Player'
                }
                return booking.profile.full_name?.split(' ').slice(1).join(' ') || 'Player'
            case 'date_of_birth':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].date_of_birth ? 
                        new Date(booking.participants[0].date_of_birth).toLocaleDateString() : '-'
                }
                return '-'
            case 'contact_email':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].email || booking.profile.email || '-'
                }
                return booking.profile.email || '-'
            case 'contact_phone':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].phone || booking.profile.phone || '-'
                }
                return booking.profile.phone || '-'
            default:
                return '-'
        }
    }

    // Helper function to get field label
    const getFieldLabel = (fieldId: string): string => {
        // Handle custom fields
        if (fieldId.startsWith('custom_')) {
            const customFieldName = fieldId.replace('custom_', '')
            // Try to find the custom field definition in the event
            if (event.custom_form_fields) {
                const customField = event.custom_form_fields.find(field => field.name === customFieldName)
                if (customField) {
                    return customField.label
                }
            }
            // Fallback to formatted field name
            return customFieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        // Handle built-in fields
        switch (fieldId) {
            case 'first_name': return 'First Name'
            case 'last_name': return 'Last Name'
            case 'date_of_birth': return 'Date of Birth'
            case 'contact_email': return 'Email'
            case 'contact_phone': return 'Phone'
            default: return fieldId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
    }

    // Sort bookings
    const sortedBookings = [...filteredBookings].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                const nameA = a.profile.full_name || 'Unknown'
                const nameB = b.profile.full_name || 'Unknown'
                return nameA.localeCompare(nameB)
            case 'date':
                return new Date(a.booking_date || a.created_at).getTime() -
                    new Date(b.booking_date || b.created_at).getTime()
            case 'tickets':
                return b.quantity - a.quantity
            default:
                return 0
        }
    })

    // Pagination calculations
    const totalItems = sortedBookings.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedBookings = sortedBookings.slice(startIndex, endIndex)

    // Reset to first page when search changes
    const handleSearchChange = (term: string) => {
        setSearchTerm(term)
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top of participants list
        document.getElementById('participants-container')?.scrollIntoView({ behavior: 'smooth' })
    }

    const totalParticipants = confirmedBookings.reduce((sum, booking) => sum + booking.quantity, 0)
    const totalBookings = confirmedBookings.length

    return (
        <div id="participants-container" className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isPublic ? 'Event Participants' : 'Participants List'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} from {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Search participants..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {/* Items per page */}
                            {!isPublic && (
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value))
                                        setCurrentPage(1)
                                    }}
                                    className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value={5}>5 per page</option>
                                    <option value={10}>10 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>
                            )}

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                <option value="name">Sort by Name</option>
                                <option value="date">Sort by Booking Date</option>
                                <option value="tickets">Sort by Tickets</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participants List */}
            {sortedBookings.length === 0 ? (
                <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">👥</span>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No participants found' : 'No participants yet'}
                    </h3>
                    <p className="text-gray-500">
                        {searchTerm
                            ? 'Try adjusting your search terms.'
                            : 'Participants will appear here once bookings are confirmed.'
                        }
                    </p>
                </div>
            ) : isPublic ? (
                // Public table view with configurable fields
                <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                </th>
                                {displayFields.map((fieldId) => (
                                    <th key={fieldId} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {getFieldLabel(fieldId)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedBookings.map((booking, index) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {startIndex + index + 1}
                                    </td>
                                    {displayFields.map((fieldId) => (
                                        <td key={fieldId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getFieldValue(booking, fieldId)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Private detailed card view
                <div className="divide-y divide-gray-200">
                    {paginatedBookings.map((booking, index) => (
                        <div key={booking.id} className="p-4 sm:p-6 hover:bg-gray-50">
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    {/* Avatar/Initial */}
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="text-sm font-medium text-indigo-700">
                                                {(booking.profile.full_name || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Participant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3">
                                            <p className="text-lg font-medium text-gray-900 truncate">
                                                {booking.profile.full_name || 'Unknown Participant'}
                                            </p>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Confirmed
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center">
                                                <span className="mr-1">🎫</span>
                                                {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center">
                                                <span className="mr-1">📅</span>
                                                Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}
                                            </span>
                                            {showPrivateInfo && (
                                                <>
                                                    <span className="flex items-center">
                                                        <span className="mr-1">💰</span>
                                                        AUD ${booking.total_amount.toFixed(2)}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <span className="mr-1">🆔</span>
                                                        <span className="font-mono text-xs">
                                                            {booking.id.slice(0, 8)}
                                                        </span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Participant Number */}
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-2xl font-bold text-gray-400">
                                        #{startIndex + index + 1}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <span className="text-sm font-medium text-indigo-700">
                                                    {(booking.profile.full_name || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">
                                                {booking.profile.full_name || 'Unknown Participant'}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                Confirmed
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-gray-400">
                                            #{startIndex + index + 1}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <span className="mr-2">🎫</span>
                                        <span>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2">📅</span>
                                        <span>Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {showPrivateInfo && (
                                        <>
                                            <div className="flex items-center">
                                                <span className="mr-2">💰</span>
                                                <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">🆔</span>
                                                <span className="font-mono text-xs">{booking.id.slice(0, 8)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer with stats */}
            {sortedBookings.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm text-gray-600">
                            Showing {Math.min(paginatedBookings.length, totalItems)} of {totalBookings} confirmed booking{totalBookings !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                            Total: {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
