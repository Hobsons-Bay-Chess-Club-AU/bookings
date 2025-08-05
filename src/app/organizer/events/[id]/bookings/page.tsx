'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event, Booking, Participant } from '@/lib/types/database'
import EventBookingsPageClient from './page-client'
import { BookingWithProfile } from '@/lib/types/ui'

// Interface for participant data as returned from database
interface ParticipantFromDB {
    id: string
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
}

export default function EventBookingsPage() {
    const [event, setEvent] = useState<Event | null>(null)
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
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
                console.log('Fetching event:', eventId, 'for user:', user.id)
                
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .eq('organizer_id', user.id)
                    .single()

                console.log('Event query result:', { eventData, eventError })

                if (eventError || !eventData) {
                    console.error('Error fetching event:', eventError)
                    setLoading(false)
                    return
                }

                setEvent(eventData)

                // Get bookings for this event
                console.log('Fetching bookings for event:', eventId)
                console.log('Current user:', user.id)
                
                const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        user:profiles!user_id(*),
                        participants (
                            id,
                            first_name,
                            last_name,
                            date_of_birth,
                            contact_email,
                            contact_phone,
                            custom_data
                        )
                    `)
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: false })

                console.log('Bookings query result:', { bookingsData, bookingsError })

                if (bookingsError) {
                    console.error('Error fetching bookings:', bookingsError)
                    setBookings([])
                } else {
                    // Transform the data to match BookingWithProfile interface
                    const transformedBookings = (bookingsData || []).map(booking => ({
                        ...booking,
                        profile: booking.user,
                        participants: (booking.participants || []).map((participant: ParticipantFromDB) => ({
                            ...participant,
                            email: participant.contact_email,
                            phone: participant.contact_phone
                        }))
                    }))
                    setBookings(transformedBookings)
                }
            } catch (err) {
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [eventId, supabase])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading event bookings...</p>
                </div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Event not found</h2>
                    <p className="text-gray-600 mt-2">
                        The event you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <EventBookingsPageClient
            event={event}
            bookings={bookings as unknown as BookingWithProfile[]}
        />
    )
}
