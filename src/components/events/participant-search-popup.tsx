"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Participant, CustomDataValue } from '@/lib/types/database'
import { 
    HiUsers, 
    HiXMark, 
    HiMagnifyingGlass, 
    HiEnvelope, 
    HiChevronRight, 
    HiInformationCircle 
} from 'react-icons/hi2'

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
    custom_data?: Record<string, CustomDataValue>
}

export default function ParticipantSearchPopup({
    isOpen,
    onClose,
    onSelectParticipant,
    userId
}: ParticipantSearchPopupProps) {
    const [participants, setParticipants] = useState<RecentParticipant[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const supabase = createClient()

    const fetchRecentParticipants = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch recent bookings for this user
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    events!bookings_event_id_fkey (
                        id,
                        title
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10)

            if (bookingsError) {
                console.error('Error fetching bookings:', bookingsError)
                return
            }

            // Fetch participants from these bookings
            const participantPromises = bookings.map(async (booking) => {
                const { data: participants, error: participantsError } = await supabase
                    .from('participants')
                    .select(`
                        first_name,
                        last_name,
                        date_of_birth,
                        contact_email,
                        contact_phone,
                        custom_data
                    `)
                    .eq('booking_id', booking.id)

                if (participantsError) {
                    console.error('Error fetching participants:', participantsError)
                    return []
                }

                return participants || []
            })

            const allParticipants = await Promise.all(participantPromises)
            const flatParticipants = allParticipants.flat()

            // Remove duplicates based on name and date of birth
            const uniqueParticipants = flatParticipants.filter((participant, index, self) =>
                index === self.findIndex(p => 
                    p.first_name === participant.first_name &&
                    p.last_name === participant.last_name &&
                    p.date_of_birth === participant.date_of_birth
                )
            )

            setParticipants(uniqueParticipants)
        } catch (error) {
            console.error('Error fetching recent participants:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase, userId])

    useEffect(() => {
        if (isOpen && userId) {
            fetchRecentParticipants()
        }
    }, [isOpen, userId, fetchRecentParticipants])

    const filteredParticipants = participants.filter(participant =>
        `${participant.first_name} ${participant.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    )

    const handleSelectParticipant = (participant: RecentParticipant) => {
        onSelectParticipant({
            first_name: participant.first_name,
            last_name: participant.last_name,
            date_of_birth: participant.date_of_birth,
            email: participant.contact_email,
            phone: participant.contact_phone,
            custom_data: participant.custom_data
        })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <HiUsers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Recent Participants
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Select to auto-fill form</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <HiXMark className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <HiMagnifyingGlass className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-96">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-700 border-t-indigo-600 dark:border-t-indigo-400 mx-auto"></div>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium">Loading recent participants...</p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Fetching your booking history</p>
                        </div>
                    ) : filteredParticipants.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <HiUsers className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {searchTerm ? 'No matches found' : 'No recent participants'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {searchTerm
                                    ? 'Try adjusting your search terms'
                                    : 'Your previous participants will appear here after making bookings. Visit /admin/create-test-data to create sample data for testing.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredParticipants.map((participant, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectParticipant(participant)}
                                    className="w-full p-6 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                        {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                                        {participant.first_name} {participant.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Born: {new Date(participant.date_of_birth).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {participant.contact_email && (
                                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <HiEnvelope className="w-4 h-4" />
                                                    <span>{participant.contact_email}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            <span className="text-sm font-medium">Select</span>
                                            <HiChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <HiInformationCircle className="w-4 h-4" />
                        <span>Select a participant to auto-fill the form</span>
                    </div>
                </div>
            </div>
        </div>
    )
}