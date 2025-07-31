"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Participant } from '@/lib/types/database'

interface ParticipantSearchPopupProps {
    isOpen: boolean
    onClose: () => void
    onSelectParticipant: (participant: Partial<Participant>) => void
    userId: string
}

interface RecentParticipant {
    first_name: string
    last_name: string
    date_of_birth: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, any>
}

export default function ParticipantSearchPopup({
    isOpen,
    onClose,
    onSelectParticipant,
    userId
}: ParticipantSearchPopupProps) {
    const [recentParticipants, setRecentParticipants] = useState<RecentParticipant[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (isOpen && userId) {
            console.log('Opening popup for userId:', userId)
            fetchRecentParticipants()
        }
    }, [isOpen, userId])

    const fetchRecentParticipants = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            
            // First get all booking IDs for this user
            const { data: userBookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (bookingsError) {
                console.error('Error fetching user bookings:', bookingsError)
                return
            }
            
            if (!userBookings || userBookings.length === 0) {
                console.log('No bookings found for user:', userId)
                setRecentParticipants([])
                return
            }

            const bookingIds = userBookings.map(booking => booking.id)

            // Fetch recent participants for this user's bookings
            const { data, error } = await supabase
                .from('participants')
                .select(`
                    first_name,
                    last_name,
                    date_of_birth,
                    contact_email,
                    contact_phone,
                    custom_data,
                    created_at
                `)
                .in('booking_id', bookingIds)
                .order('created_at', { ascending: false })
                .limit(50) // Get more to ensure we have enough unique ones

            if (error) {
                console.error('Error fetching recent participants:', error)
                return
            }

            console.log('Fetched participants:', data)
            console.log('Booking IDs:', bookingIds)

            if (!data || data.length === 0) {
                console.log('No participants found for bookings')
                setRecentParticipants([])
                return
            }

            // Filter to unique participants by first_name + last_name + date_of_birth
            const uniqueParticipants = data.reduce((acc: RecentParticipant[], participant) => {
                const key = `${participant.first_name}-${participant.last_name}-${participant.date_of_birth}`
                const exists = acc.find(p => 
                    `${p.first_name}-${p.last_name}-${p.date_of_birth}` === key
                )
                if (!exists) {
                    acc.push(participant)
                }
                return acc
            }, []).slice(0, 10)

            console.log('Unique participants:', uniqueParticipants)
            setRecentParticipants(uniqueParticipants)
        } catch (error) {
            console.error('Error fetching recent participants:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectParticipant = (participant: RecentParticipant) => {
        onSelectParticipant({
            first_name: participant.first_name,
            last_name: participant.last_name,
            date_of_birth: participant.date_of_birth,
            email: participant.contact_email,
            phone: participant.contact_phone,
            custom_data: participant.custom_data || {}
        })
        onClose()
    }

    const filteredParticipants = recentParticipants.filter(participant =>
        `${participant.first_name} ${participant.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Recent Participants
                            </h3>
                            <p className="text-sm text-gray-600">Select to auto-fill form</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-96">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-sm text-gray-600 font-medium">Loading recent participants...</p>
                            <p className="mt-1 text-xs text-gray-400">Fetching your booking history</p>
                        </div>
                    ) : filteredParticipants.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {searchTerm ? 'No matches found' : 'No recent participants'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {searchTerm 
                                    ? 'Try adjusting your search terms' 
                                    : 'Your previous participants will appear here after making bookings. Visit /admin/create-test-data to create sample data for testing.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredParticipants.map((participant, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectParticipant(participant)}
                                    className="w-full p-6 text-left hover:bg-indigo-50 focus:outline-none focus:bg-indigo-50 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-semibold text-indigo-700">
                                                        {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                                        {participant.first_name} {participant.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Born: {new Date(participant.date_of_birth).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {participant.contact_email && (
                                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{participant.contact_email}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                            <span className="text-sm font-medium">Select</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Select a participant to auto-fill the form</span>
                    </div>
                </div>
            </div>
        </div>
    )
} 