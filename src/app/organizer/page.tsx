'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/lib/types/database'
import OrganizerPageClient from '@/app/organizer/page-client'

interface EventWithBookings extends Event {
    totalBookings: number
    confirmedBookings: number
    revenue: number
}

export default function OrganizerPage() {
    const [events, setEvents] = useState<EventWithBookings[]>([])
    const [totalRevenue, setTotalRevenue] = useState(0)
    const [totalBookings, setTotalBookings] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get current user (AdminLayout already ensures user is authenticated)
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    // AdminLayout should have handled this, but just in case
                    setLoading(false)
                    return
                }

                // Fetch organizer events
                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('organizer_id', user.id)
                    .order('created_at', { ascending: false })

                if (eventsError) {
                    console.error('Error fetching events:', eventsError)
                    setLoading(false)
                    return
                }

                // Get booking counts for each event
                const eventsWithBookings: EventWithBookings[] = []
                let totalRev = 0
                let totalBookingCount = 0

                for (const event of eventsData || []) {
                    const { data: bookings, error: bookingError } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('event_id', event.id)

                    if (bookingError) {
                        console.error('Error fetching bookings:', bookingError)
                        continue
                    }

                    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'verified') || []
                    const revenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0)

                    eventsWithBookings.push({
                        ...event,
                        totalBookings: bookings?.length || 0,
                        confirmedBookings: confirmedBookings.length,
                        revenue: revenue
                    })

                    totalRev += revenue
                    totalBookingCount += confirmedBookings.length
                }

                setEvents(eventsWithBookings)
                setTotalRevenue(totalRev)
                setTotalBookings(totalBookingCount)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [supabase])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading events...</p>
                </div>
            </div>
        )
    }

    return (
        <OrganizerPageClient
            events={events}
            totalRevenue={totalRevenue}
            totalBookings={totalBookings}
        />
    )
}