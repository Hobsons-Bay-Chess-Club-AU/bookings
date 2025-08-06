'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event, Participant, Booking, Profile } from '@/lib/types/database'
import EventParticipantsPageClient from './page-client'

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
    const params = useParams()
    const eventId = params.id as string
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    setLoading(false)
                    return
                }

                // Get event data (filtering by organizer_id ensures access control)
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .eq('organizer_id', user.id)
                    .single()

                if (eventError || !eventData) {
                    console.error('Error fetching event:', eventError)
                    setLoading(false)
                    return
                }

                setEvent(eventData)

                // Get participants for this event via API
                try {
                    const response = await fetch(`/api/events/${eventId}/participants`)
                    if (response.ok) {
                        const participantsData = await response.json()
                        setParticipants(participantsData || [])
                    } else {
                        console.error('Failed to fetch participants')
                        setParticipants([])
                    }
                } catch (apiError) {
                    console.error('Error fetching participants:', apiError)
                    setParticipants([])
                }
            } catch (err) {
                console.error('Error fetching data:', err)
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [eventId, supabase])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading participants...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {error || 'Event not found'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {error || 'The event you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <EventParticipantsPageClient
            event={event}
            participants={participants}
        />
    )
}
