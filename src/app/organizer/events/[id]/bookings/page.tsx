'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event, Booking } from '@/lib/types/database'
import EventBookingsPageClient from './page-client'

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

                // Get bookings for this event
                const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        participants (
                            id,
                            name,
                            email
                        )
                    `)
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: false })

                if (bookingsError) {
                    console.error('Error fetching bookings:', bookingsError)
                    setBookings([])
                } else {
                    setBookings(bookingsData || [])
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
                        The event you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <EventBookingsPageClient
            event={event}
            bookings={bookings}
        />
    )
}
