'use client'

import { useState } from 'react'
import { Booking, Event, Profile } from '@/lib/types/database'

interface BookingWithProfile extends Booking {
    profile: Profile
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

    // Filter to only confirmed/verified participants
    const confirmedBookings = bookings.filter(b => 
        b.status === 'confirmed' || b.status === 'verified'
    )

    // Filter by search term
    const filteredBookings = confirmedBookings.filter(booking => {
        const searchableText = [
            booking.profile.full_name || '',
            booking.profile.id || ''
        ].join(' ').toLowerCase()
        
        return searchableText.includes(searchTerm.toLowerCase())
    })

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

    const totalParticipants = confirmedBookings.reduce((sum, booking) => sum + booking.quantity, 0)
    const totalBookings = confirmedBookings.length

    return (
        <div className="bg-white shadow rounded-lg">
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
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="date">Sort by Booking Date</option>
                            <option value="tickets">Sort by Tickets</option>
                        </select>
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
            ) : (
                <div className="divide-y divide-gray-200">
                    {sortedBookings.map((booking, index) => (
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
                                        #{index + 1}
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
                                            #{index + 1}
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

            {/* Footer with stats */}
            {sortedBookings.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm text-gray-600">
                            Showing {sortedBookings.length} of {totalBookings} confirmed booking{totalBookings !== 1 ? 's' : ''}
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
