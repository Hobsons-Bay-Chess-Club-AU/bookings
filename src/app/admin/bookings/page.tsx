'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminBookingsPageClient from './page-client'

interface Booking {
    id: string
    booking_id: string
    status: string
    total_amount: number
    created_at: string
    events: {
        id: string
        title: string
    } | null
    profiles: {
        id: string
        full_name: string | null
        email: string
    } | null
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    setLoading(false)
                    return
                }

                const { data: bookingsData, error } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        booking_id,
                        status,
                        total_amount,
                        created_at,
                        events!inner (
                            id,
                            title
                        ),
                        profiles!inner (
                            id,
                            full_name,
                            email
                        )
                    `)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error loading bookings:', error)
                    return
                }

                // Transform the data to match the expected Booking type
                const transformedBookings: Booking[] = (bookingsData || []).map(booking => ({
                    id: booking.id,
                    booking_id: booking.booking_id,
                    status: booking.status,
                    total_amount: booking.total_amount,
                    created_at: booking.created_at,
                    events: Array.isArray(booking.events) ? booking.events[0] || null : booking.events,
                    profiles: Array.isArray(booking.profiles) ? booking.profiles[0] || null : booking.profiles
                }))

                setBookings(transformedBookings)
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
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return <AdminBookingsPageClient bookings={bookings} />
}
