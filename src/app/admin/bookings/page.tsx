'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminBookingsPageClient from './page-client'
import { HiExclamationCircle } from 'react-icons/hi'

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
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        // If query params include id or booking_id, resolve and redirect to booking details
        const resolveAndRedirect = async () => {
            const idParam = searchParams?.get('id')
            const bookingCodeParam = searchParams?.get('booking_id')
            const qParam = searchParams?.get('q')
            const input = (idParam || bookingCodeParam || qParam || '').trim()
            if (!input) return

            try {
                setLoading(true)
                type Lookup = { id: string; booking_id: string; event_id: string }
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)
                let data: Lookup | null = null
                let error: unknown = null
                if (isUuid) {
                    const res = await supabase
                        .from('bookings')
                        .select('id, booking_id, event_id')
                        .eq('id', input)
                        .single()
                    data = res.data as Lookup | null
                    error = res.error
                } else {
                    const codeUpper = input.toUpperCase()
                    const res = await supabase
                        .from('bookings')
                        .select('id, booking_id, event_id')
                        .eq('booking_id', codeUpper)
                        .single()
                    data = res.data as Lookup | null
                    error = res.error
                }
                if (error || !data) {
                    setError('Booking not found')
                    return
                }
                const found = data as unknown as Lookup
                router.replace(`/organizer/events/${found.event_id}/bookings/${found.booking_id}`)
            } catch (e) {
                console.error('Error resolving booking by query:', e)
                setError('Failed to resolve booking by query')
            } finally {
                setLoading(false)
            }
        }

        resolveAndRedirect()
    }, [searchParams, supabase, router])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(null)
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
                        events!bookings_event_id_fkey (
                            id,
                            title
                        ),
                        profiles!bookings_user_id_fkey (
                            id,
                            full_name,
                            email
                        )
                    `)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error loading bookings:', error)
                    setError(`Failed to load bookings: ${error.message}`)
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
                setError('An unexpected error occurred while loading bookings')
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

    if (error) {
        return (
            <>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Bookings</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        View and manage all event bookings and their payment events
                    </p>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <HiExclamationCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                                Error Loading Bookings
                            </h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                                <p>{error}</p>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return <AdminBookingsPageClient bookings={bookings} />
}
