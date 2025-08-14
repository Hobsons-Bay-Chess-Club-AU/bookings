'use client'

import { useState } from 'react'
import { Event, } from '@/lib/types/database'
import { BookingWithProfile } from '@/lib/types/ui'
import { HiLockClosed, HiMagnifyingGlass, HiXMark, HiUsers, HiTicket, HiCalendar, HiCurrencyDollar, HiIdentification } from 'react-icons/hi2'

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
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                <HiLockClosed className="text-4xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Participant List Private
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                    The organizer has chosen to keep the participant list private for this event.
                </p>
            </div>
        )
    }

    // Filter to only confirmed/verified participants for public view, show all for private view
    const confirmedBookings = isPublic 
        ? bookings.filter(b => b.status === 'confirmed' || b.status === 'verified')
        : bookings.filter(b => ['confirmed', 'verified', 'cancelled'].includes(b.status))

    // Filter by search term
    const filteredBookings = confirmedBookings.filter(booking => {
        const searchableText = [
            booking.profile.full_name || '',
            booking.profile.email || ''
        ].join(' ').toLowerCase()

        return searchableText.includes(searchTerm.toLowerCase())
    })    // Helper function to get field value
    const getFieldValue = (booking: BookingWithProfile, fieldId: string): string => {
        // Handle custom fields and their sub-fields
        if (fieldId.startsWith('custom_')) {
            // Check if booking has participants with custom data
            if (booking.participants && booking.participants.length > 0) {
                const participant = booking.participants[0] // For now, get first participant

                // Check if it's a sub-field (e.g., custom_fide_id_name, custom_fide_id_std_rating, custom_acf_id_quick_rating)
                if (fieldId.includes('_name') || fieldId.includes('_id') || fieldId.includes('_std_rating') ||
                    fieldId.includes('_rapid_rating') || fieldId.includes('_blitz_rating') || fieldId.includes('_quick_rating')) {

                    // Extract base field name and sub-field more accurately
                    let baseFieldName: string
                    let subField: string

                    if (fieldId.endsWith('_std_rating')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_std_rating', '')
                        subField = 'std_rating'
                    } else if (fieldId.endsWith('_rapid_rating')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_rapid_rating', '')
                        subField = 'rapid_rating'
                    } else if (fieldId.endsWith('_blitz_rating')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_blitz_rating', '')
                        subField = 'blitz_rating'
                    } else if (fieldId.endsWith('_quick_rating')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_quick_rating', '')
                        subField = 'quick_rating'
                    } else if (fieldId.endsWith('_name')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_name', '')
                        subField = 'name'
                    } else if (fieldId.endsWith('_id')) {
                        baseFieldName = fieldId.replace('custom_', '').replace('_id', '')
                        subField = 'id'
                    } else {
                        return '-'
                    }

                    const customValue = participant.custom_data?.[baseFieldName]

                    if (!customValue || typeof customValue !== 'object') {
                        return '-'
                    }

                    // Handle FIDE/ACF player object sub-fields
                    if (customValue.id && customValue.name && ('std_rating' in customValue || 'quick_rating' in customValue)) {
                        switch (subField) {
                            case 'name':
                                return (customValue.name as string) || '-'
                            case 'id':
                                return (customValue.id as string) || '-'
                            case 'std_rating':
                                return customValue.std_rating ? customValue.std_rating.toString() : '-'
                            case 'rapid_rating':
                                return customValue.rapid_rating ? customValue.rapid_rating.toString() : '-'
                            case 'blitz_rating':
                                return customValue.blitz_rating ? customValue.blitz_rating.toString() : '-'
                            case 'quick_rating':
                                return customValue.quick_rating ? customValue.quick_rating.toString() : '-'
                            default:
                                return '-'
                        }
                    }

                    return '-'
                }

                // Regular custom field (not a sub-field)
                const customFieldName = fieldId.replace('custom_', '')
                const customValue = participant.custom_data?.[customFieldName]

                // Handle null/undefined values
                if (!customValue) return '-'

                // Handle arrays
                if (Array.isArray(customValue)) {
                    return customValue.join(', ')
                }

                // Handle FIDE/ACF player objects
                if (typeof customValue === 'object') {
                    // Check if it's a player object (FIDE or ACF)
                    if (customValue.id && customValue.name && ('std_rating' in customValue || 'quick_rating' in customValue)) {
                        const ratings = []
                        if (customValue.std_rating) ratings.push(`Std: ${customValue.std_rating}`)

                        // FIDE has rapid and blitz ratings
                        if (customValue.rapid_rating) ratings.push(`Rapid: ${customValue.rapid_rating}`)
                        if (customValue.blitz_rating) ratings.push(`Blitz: ${customValue.blitz_rating}`)

                        // ACF has quick rating
                        if (customValue.quick_rating) ratings.push(`Quick: ${customValue.quick_rating}`)

                        return `${customValue.name} (ID: ${customValue.id})${ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''}`
                    }

                    // Handle other object types - try to display meaningful information
                    if (customValue.name) {
                        return customValue.name as string
                        // } else if (customValue.label as string) {
                        //     return customValue.label as string
                        // } else if (customValue.title) {
                        //     return customValue.title as string
                    } else {
                        // Fallback for generic objects - show key-value pairs
                        const entries = Object.entries(customValue)
                            .filter(([, value]) => value !== null && value !== undefined && value !== '')
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
            case 'gender':
                if (booking.participants && booking.participants.length > 0) {
                    return booking.participants[0].gender ? 
                        booking.participants[0].gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'
                }
                return '-'
            default:
                return '-'
        }
    }

    // Helper function to get field label
    const getFieldLabel = (fieldId: string): string => {
        // Handle custom fields and their sub-fields
        if (fieldId.startsWith('custom_')) {
            // Check if it's a sub-field (e.g., custom_fide_id_name, custom_fide_id_std_rating, custom_acf_id_quick_rating)
            if (fieldId.includes('_name') || fieldId.includes('_id') || fieldId.includes('_std_rating') ||
                fieldId.includes('_rapid_rating') || fieldId.includes('_blitz_rating') || fieldId.includes('_quick_rating')) {

                // Extract base field name and sub-field using same logic as getFieldValue
                let baseFieldName: string
                let subField: string

                if (fieldId.endsWith('_std_rating')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_std_rating', '')
                    subField = 'std_rating'
                } else if (fieldId.endsWith('_rapid_rating')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_rapid_rating', '')
                    subField = 'rapid_rating'
                } else if (fieldId.endsWith('_blitz_rating')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_blitz_rating', '')
                    subField = 'blitz_rating'
                } else if (fieldId.endsWith('_quick_rating')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_quick_rating', '')
                    subField = 'quick_rating'
                } else if (fieldId.endsWith('_name')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_name', '')
                    subField = 'name'
                } else if (fieldId.endsWith('_id')) {
                    baseFieldName = fieldId.replace('custom_', '').replace('_id', '')
                    subField = 'id'
                } else {
                    return fieldId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                }

                // Try to find the base custom field definition
                let baseLabel = baseFieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                if (event.custom_form_fields) {
                    const customField = event.custom_form_fields.find(field => field.name === baseFieldName)
                    if (customField) {
                        baseLabel = customField.label
                    }
                }

                // Return appropriate sub-field label
                switch (subField) {
                    case 'name':
                        return `${baseLabel} - Name`
                    case 'id':
                        return `${baseLabel} - ID`
                    case 'std_rating':
                        return `${baseLabel} - Standard Rating`
                    case 'rapid_rating':
                        return `${baseLabel} - Rapid Rating`
                    case 'blitz_rating':
                        return `${baseLabel} - Blitz Rating`
                    case 'quick_rating':
                        return `${baseLabel} - Quick Rating`
                    default:
                        return `${baseLabel} - ${subField.replace(/\b\w/g, l => l.toUpperCase())}`
                }
            }

            // Regular custom field (not a sub-field)
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
            case 'gender': return 'Gender'
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
    const cancelledBookings = confirmedBookings.filter(b => b.status === 'cancelled').length

    return (
        <div id="participants-container" className="bg-white dark:bg-gray-800 shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {isPublic ? 'Event Participants' : 'Participants List'}
                        </h2>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} from {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
                                {!isPublic && cancelledBookings > 0 && (
                                    <span className="text-red-600 dark:text-red-400 ml-2">
                                        ({cancelledBookings} cancelled)
                                    </span>
                                )}
                            </p>
                            {totalPages > 1 && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <HiMagnifyingGlass className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search participants..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm text-gray-900 dark:text-gray-100"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <HiXMark className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {/* Items per page */}
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="block pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="block pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                    <HiUsers className="text-4xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {searchTerm ? 'No participants found' : 'No participants yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchTerm
                            ? 'Try adjusting your search terms.'
                            : 'Participants will appear here once bookings are confirmed.'
                        }
                    </p>
                </div>
            ) : isPublic ? (
                // Public table view with configurable fields
                <>
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        #
                                    </th>
                                    {displayFields.map((fieldId) => (
                                        <th key={fieldId} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {getFieldLabel(fieldId)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedBookings.map((booking, index) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {startIndex + index + 1}
                                        </td>
                                        {displayFields.map((fieldId) => (
                                            <td key={fieldId} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                <div className="max-w-xs" title={getFieldValue(booking, fieldId)}>
                                                    {(() => {
                                                        // Special handling for FIDE ID sub-fields (only FIDE gets links, not ACF)
                                                        if (fieldId.includes('_id') && fieldId.includes('fide')) {
                                                            const value = getFieldValue(booking, fieldId)
                                                            if (value && value !== '-') {
                                                                return (
                                                                    <a
                                                                        href={`https://ratings.fide.com/profile/${value}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                                                    >
                                                                        {value}
                                                                    </a>
                                                                )
                                                            }
                                                            return value
                                                        }

                                                        const value = getFieldValue(booking, fieldId)
                                                        // Handle long values by truncating but showing full value in tooltip
                                                        if (value.length > 50) {
                                                            return (
                                                                <span className="block truncate">
                                                                    {value}
                                                                </span>
                                                            )
                                                        }
                                                        return value
                                                    })()}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                // Private detailed card view
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedBookings.map((booking, index) => (
                        <div key={booking.id} className={`p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            booking.status === 'cancelled' ? 'opacity-60' : ''
                        }`}>
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    {/* Avatar/Initial */}
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-200">
                                                {(booking.profile.full_name || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Participant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3">
                                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {booking.profile.full_name || 'Unknown Participant'}
                                            </p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                booking.status === 'cancelled' 
                                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                    : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                            }`}>
                                                {booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center">
                                                <HiTicket className="mr-1 h-4 w-4" />
                                                {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center">
                                                <HiCalendar className="mr-1 h-4 w-4" />
                                                Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}
                                            </span>
                                            {showPrivateInfo && (
                                                <>
                                                    <span className="flex items-center">
                                                        <HiCurrencyDollar className="mr-1 h-4 w-4" />
                                                        AUD ${booking.total_amount.toFixed(2)}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <HiIdentification className="mr-1 h-4 w-4" />
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
                                    <div className="text-2xl font-bold text-gray-400 dark:text-gray-600">
                                        #{startIndex + index + 1}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-200">
                                                    {(booking.profile.full_name || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {booking.profile.full_name || 'Unknown Participant'}
                                            </p>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                                booking.status === 'cancelled' 
                                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                    : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                            }`}>
                                                {booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-gray-400 dark:text-gray-600">
                                            #{startIndex + index + 1}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center">
                                        <HiTicket className="mr-2 h-4 w-4" />
                                        <span>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <HiCalendar className="mr-2 h-4 w-4" />
                                        <span>Booked {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {showPrivateInfo && (
                                        <>
                                            <div className="flex items-center">
                                                <HiCurrencyDollar className="mr-2 h-4 w-4" />
                                                <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <HiIdentification className="mr-2 h-4 w-4" />
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
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                ? 'bg-indigo-600 text-white dark:bg-indigo-700 dark:text-white'
                                                : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer with stats */}
            {sortedBookings.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {Math.min(paginatedBookings.length, totalItems)} of {totalBookings} confirmed booking{totalBookings !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Total: {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
                            {!isPublic && cancelledBookings > 0 && (
                                <span className="text-sm font-normal text-red-600 dark:text-red-400 ml-2">
                                    ({cancelledBookings} cancelled)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
