'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Event, Participant, Booking, Profile, EventSection } from '@/lib/types/database'
import { HiUsers, HiArrowPath, HiCog6Tooth, HiEye, HiArrowRight } from 'react-icons/hi2'
import Breadcrumb from '@/components/ui/breadcrumb'
import SectionTransferModal from '@/components/events/section-transfer-modal'

interface ParticipantWithBooking extends Participant {
    bookings: (Booking & {
        profiles: Profile
    })
    section?: EventSection
}

interface EventParticipantsPageClientProps {
    event: Event
    participants: ParticipantWithBooking[]
    sections?: EventSection[]
}

export default function EventParticipantsPageClient({
    event,
    participants,
    sections = []
}: EventParticipantsPageClientProps) {
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all')
    const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithBooking | null>(null)
    const [showTransferConfirmation, setShowTransferConfirmation] = useState(false)
    const [transferToSection, setTransferToSection] = useState<string>('')
    const [isTransferring, setIsTransferring] = useState(false)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
    const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId]) {
                const dropdown = dropdownRefs.current[openDropdownId]
                if (dropdown && !dropdown.contains(event.target as Node)) {
                    setOpenDropdownId(null)
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openDropdownId])

    const toggleDropdown = (participantId: string) => {
        setOpenDropdownId(openDropdownId === participantId ? null : participantId)
    }
    // Helper function to render custom field values
    const renderCustomFieldValue = (value: unknown): React.ReactNode => {
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return <span className="text-gray-500 dark:text-gray-400 italic">Not provided</span>
        }

        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-500 dark:text-gray-400 italic">None selected</span>
            }
            return <span>{value.join(', ')}</span>
        }

        // Handle FIDE/ACF player objects
        if (typeof value === 'object' && value !== null) {
            // Check if it's a player object (FIDE or ACF)
            const playerObj = value as Record<string, unknown>
            if (playerObj.id && playerObj.name && ('std_rating' in playerObj || 'quick_rating' in playerObj)) {
                const ratings = []
                if (playerObj.std_rating) ratings.push(`Std: ${playerObj.std_rating}`)
                if (playerObj.rapid_rating) ratings.push(`Rapid: ${playerObj.rapid_rating}`)
                if (playerObj.blitz_rating) ratings.push(`Blitz: ${playerObj.blitz_rating}`)
                if (playerObj.quick_rating) ratings.push(`Quick: ${playerObj.quick_rating}`)

                return (
                    <div className="space-y-1">
                        <div className="font-medium">{String(playerObj.name)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {String(playerObj.id)}
                        </div>
                        {ratings.length > 0 && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Ratings: {ratings.join(', ')}
                            </div>
                        )}
                    </div>
                )
            }

            // Handle other object types
            if (playerObj.name) {
                return <span>{String(playerObj.name)}</span>
            } else if (playerObj.label) {
                return <span>{String(playerObj.label)}</span>
            } else if (playerObj.title) {
                return <span>{String(playerObj.title)}</span>
            } else {
                // Fallback for generic objects - show key-value pairs
                const entries = Object.entries(value)
                    .filter(([, val]) => val !== null && val !== undefined && val !== '')
                    .slice(0, 3) // Limit to first 3 entries

                if (entries.length > 0) {
                    return (
                        <div className="space-y-1">
                            {entries.map(([key, val]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                    <span>{String(val)}</span>
                                </div>
                            ))}
                        </div>
                    )
                }

                return <span className="text-gray-500 dark:text-gray-400 italic">Complex data</span>
            }
        }

        // Handle primitive types
        if (typeof value === 'boolean') {
            return (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    value 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                    {value ? 'Yes' : 'No'}
                </span>
            )
        }

        if (typeof value === 'number') {
            return <span>{value.toLocaleString()}</span>
        }

        // Handle strings
        if (typeof value === 'string') {
            if (value.trim() === '') {
                return <span className="text-gray-500 dark:text-gray-400 italic">Not provided</span>
            }
            return <span>{value}</span>
        }

        // Fallback
        return <span className="text-gray-500 dark:text-gray-400 italic">Unknown data type</span>
    }
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const filteredParticipants = participants.filter(participant => {
        // Section filter
        if (event.has_sections && selectedSectionFilter !== 'all') {
            if (selectedSectionFilter === 'no-section' && participant.section) {
                return false
            }
            if (selectedSectionFilter !== 'no-section' && (!participant.section || participant.section.id !== selectedSectionFilter)) {
                return false
            }
        }

        // Search filter
        if (!searchTerm) return true

        const searchLower = searchTerm.toLowerCase()
        return (
            participant.first_name.toLowerCase().includes(searchLower) ||
            participant.last_name.toLowerCase().includes(searchLower) ||
            participant.contact_email?.toLowerCase().includes(searchLower) ||
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

    const handleTransfer = async () => {
        if (!selectedParticipant || !transferToSection) return

        setIsTransferring(true)
        try {
            const response = await fetch(`/api/events/${event.id}/participants/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participantId: selectedParticipant.id,
                    newSectionId: transferToSection,
                }),
            })

            if (response.ok) {
                // Refresh the page to show updated data
                window.location.reload()
            } else {
                const error = await response.json()
                alert(`Transfer failed: ${error.error}`)
            }
        } catch (error) {
            console.error('Transfer error:', error)
            alert('Transfer failed. Please try again.')
        } finally {
            setIsTransferring(false)
            setShowTransferConfirmation(false)
            setSelectedParticipant(null)
            setTransferToSection('')
        }
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
            'Gender',
            'Contact Email',
            'Contact Phone',
            ...(event.has_sections ? ['Section', 'Section Description'] : []),
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
            p.gender ? p.gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
            p.contact_email || '',
            p.contact_phone || '',
            ...(event.has_sections ? [
                p.section?.title || 'No section assigned',
                p.section?.description || ''
            ] : []),
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
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: event.title, href: `/organizer/events/${event.id}` },
                        { label: 'Participants' }
                    ]} 
                />
            </div>

            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Participants</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">{event?.title}</p>
                    </div>
                    {event.has_sections && sections.length > 0 && (
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <HiArrowPath className="h-4 w-4 mr-2" />
                            Transfer Between Sections
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiUsers className="text-2xl text-gray-400" />
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

                {event.has_sections && sections.length > 0 ? (
                    <>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">🏆</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Sections
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {sections.length}
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
                                        <span className="text-2xl">❓</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Unassigned
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {participants.filter(p => !p.section).length}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">✅</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Confirmed
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {participants.filter(p => p.bookings.status === 'confirmed').length}
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
                                        <span className="text-2xl">⏳</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                                Pending
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                {participants.filter(p => p.bookings.status === 'pending').length}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Section Summary (only for multi-section events) */}
            {event.has_sections && sections.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Section Summary</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sections.map((section) => {
                                const sectionParticipants = participants.filter(p => p.section?.id === section.id)
                                return (
                                    <div key={section.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{section.title}</h4>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {sectionParticipants.length} participant{sectionParticipants.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {section.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                {section.description}
                                            </p>
                                        )}
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {sectionParticipants.length > 0 ? (
                                                <div>
                                                    <div>Confirmed: {sectionParticipants.filter(p => p.bookings.status === 'confirmed').length}</div>
                                                    <div>Pending: {sectionParticipants.filter(p => p.bookings.status === 'pending').length}</div>
                                                </div>
                                            ) : (
                                                <div className="italic">No participants assigned</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {/* Unassigned participants */}
                            {participants.filter(p => !p.section).length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Section Assigned</h4>
                                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                            {participants.filter(p => !p.section).length} participant{participants.filter(p => !p.section).length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                                        These participants need to be assigned to a section
                                    </p>
                                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                        <div>Confirmed: {participants.filter(p => !p.section && p.bookings.status === 'confirmed').length}</div>
                                        <div>Pending: {participants.filter(p => !p.section && p.bookings.status === 'pending').length}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                        {event.has_sections && sections.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <label htmlFor="sectionFilter" className="text-sm text-gray-700 dark:text-gray-300">Section:</label>
                                <select
                                    id="sectionFilter"
                                    value={selectedSectionFilter}
                                    onChange={(e) => {
                                        setSelectedSectionFilter(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">All Sections</option>
                                    <option value="no-section">No Section Assigned</option>
                                    {sections.map((section) => (
                                        <option key={section.id} value={section.id}>
                                            {section.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                        <HiUsers className="text-4xl mb-4 block text-gray-400" />
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
                                        Gender
                                    </th>
                                    {event.has_sections && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Section
                                        </th>
                                    )}
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
                                                {participant.contact_email && (
                                                    <div>{participant.contact_email}</div>
                                                )}
                                                {participant.contact_phone && (
                                                    <div className="text-gray-500 dark:text-gray-400">{participant.contact_phone}</div>
                                                )}
                                                {!participant.contact_email && !participant.contact_phone && (
                                                    <span className="text-gray-400 dark:text-gray-500">No contact info</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                {participant.gender ? (
                                                    <span className="capitalize">{participant.gender.replace('_', ' ')}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">Not specified</span>
                                                )}
                                            </div>
                                        </td>
                                        {event.has_sections && (
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 dark:text-gray-100">
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
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center space-x-2">
                                                    <Link
                                                        href={`/organizer/events/${event.id}/bookings/${participant.bookings.id}`}
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-mono"
                                                    >
                                                        {participant.bookings.booking_id || participant.bookings.id?.slice(0, 8)}
                                                    </Link>
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
                                        <td className="px-6 py-4 text-right text-sm font-medium relative">
                                            <button
                                                onClick={() => toggleDropdown(participant.id!)}
                                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                title="Participant Actions"
                                            >
                                                <HiCog6Tooth className="h-5 w-5" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openDropdownId === participant.id && (
                                                <div
                                                    ref={(el) => { dropdownRefs.current[participant.id!] = el }}
                                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                                                >
                                                    <div className="py-1">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedParticipant(participant)
                                                                setOpenDropdownId(null)
                                                            }}
                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                            data-menu-item
                                                        >
                                                            <HiEye className="mr-2 h-4 w-4" /> View Details
                                                        </button>
                                                        {event.has_sections && sections.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedParticipant(participant)
                                                                    setShowTransferConfirmation(true)
                                                                    setOpenDropdownId(null)
                                                                }}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left"
                                                                data-menu-item
                                                            >
                                                                <HiArrowRight className="mr-2 h-4 w-4" /> Transfer
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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
                                        {selectedParticipant.gender && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
                                                    {selectedParticipant.gender.replace('_', ' ')}
                                                </p>
                                            </div>
                                        )}
                                        {selectedParticipant.contact_email && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.contact_email}</p>
                                            </div>
                                        )}
                                        {selectedParticipant.contact_phone && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phone</label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedParticipant.contact_phone}</p>
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
                                                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                        {renderCustomFieldValue(value)}
                                                    </div>
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
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">AUD ${selectedParticipant.bookings.total_amount}</p>
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

            {/* Transfer Confirmation Modal */}
            {showTransferConfirmation && selectedParticipant && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
                            onClick={() => {
                                if (!isTransferring) {
                                    setShowTransferConfirmation(false)
                                    setSelectedParticipant(null)
                                    setTransferToSection('')
                                }
                            }}
                        />

                        {/* Modal */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 sm:mx-0 sm:h-10 sm:w-10">
                                        <HiArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                            Transfer Participant
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Transfer <strong>{selectedParticipant.first_name} {selectedParticipant.last_name}</strong> to a different section?
                                            </p>
                                            <div className="mt-4">
                                                <label htmlFor="transferSection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Select New Section:
                                                </label>
                                                <select
                                                    id="transferSection"
                                                    value={transferToSection}
                                                    onChange={(e) => setTransferToSection(e.target.value)}
                                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    disabled={isTransferring}
                                                >
                                                    <option value="">Select a section...</option>
                                                    {sections
                                                        .filter(section => section.id !== selectedParticipant.section?.id)
                                                        .map((section) => (
                                                            <option key={section.id} value={section.id}>
                                                                {section.title}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 dark:border-gray-600">
                                <button
                                    type="button"
                                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 ${
                                        isTransferring || !transferToSection ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    onClick={handleTransfer}
                                    disabled={isTransferring || !transferToSection}
                                >
                                    {isTransferring ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Transferring...
                                        </div>
                                    ) : (
                                        'Transfer'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        if (!isTransferring) {
                                            setShowTransferConfirmation(false)
                                            setSelectedParticipant(null)
                                            setTransferToSection('')
                                        }
                                    }}
                                    disabled={isTransferring}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section Transfer Modal */}
            {event.has_sections && sections.length > 0 && (
                <SectionTransferModal
                    isOpen={showTransferModal}
                    onClose={() => setShowTransferModal(false)}
                    eventId={event.id}
                    sections={sections}
                    participants={participants}
                    onTransfer={async (transfers) => {
                        try {
                            const response = await fetch(`/api/events/${event.id}/participants/transfer`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ transfers }),
                            })

                            if (!response.ok) {
                                const errorData = await response.json()
                                throw new Error(errorData.error || 'Failed to transfer participants')
                            }

                            // Refresh the page to show updated data
                            window.location.reload()
                        } catch (error) {
                            console.error('Error transferring participants:', error)
                            alert(error instanceof Error ? error.message : 'Failed to transfer participants')
                        }
                    }}
                />
            )}
        </>
    )
}
