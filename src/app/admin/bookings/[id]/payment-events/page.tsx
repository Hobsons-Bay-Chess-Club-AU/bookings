'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import Link from 'next/link'
import JsonView from '@uiw/react-json-view'

interface PaymentEvent {
    id: string
    booking_id: string
    stripe_event_type: string
    stripe_event_id: string
    created_at: string
}

interface Booking {
    id: string
    booking_id: string
    status: string
    total_amount: number
    events: {
        title: string
    } | null
    profiles: {
        full_name: string | null
        email: string
    } | null
}

interface StripeEvent {
    id: string
    type: string
    created: number
    data: Record<string, unknown>
}

export default function PaymentEventsPage() {

    const params = useParams()
    const router = useRouter()
    const bookingId = params.id as string

    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [booking, setBooking] = useState<Booking | null>(null)
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<StripeEvent | null>(null)
    const [loadingEvent, setLoadingEvent] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const supabase = createClient()


    // Modal close handler (must be above useEffect)
    const closeModal = () => {
        setShowEventModal(false)
        setSelectedEvent(null)
    }

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    router.push('/auth/login')
                    return
                }

                setCurrentUser(user)

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError || !profileData) {
                    router.push('/unauthorized')
                    return
                }

                setProfile(profileData)

                // Check if user has permission (admin or customer_support)
                if (!['admin', 'customer_support'].includes(profileData.role)) {
                    router.push('/unauthorized')
                    return
                }

                setAuthLoading(false)
            } catch (error) {
                console.error('Auth check error:', error)
                router.push('/auth/login')
            }
        }
        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session?.user) {
                router.push('/auth/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase.auth, router])









    // Keyboard event handler for modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showEventModal) {
                closeModal()
            }
        }

        if (showEventModal) {
            document.addEventListener('keydown', handleKeyDown)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [showEventModal, closeModal])


    // ...existing code...

    const fetchBookingAndEvents = useCallback(async () => {
        try {
            setLoading(true)

            // Fetch booking details
            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_id,
                    status,
                    total_amount,
                    events (
                        title
                    ),
                    profiles (
                        full_name,
                        email
                    )
                `)
                .eq('id', bookingId)
                .single()

            if (bookingError) throw bookingError
            setBooking(bookingData as unknown as Booking)

            // Fetch payment events
            const { data: eventsData, error: eventsError } = await supabase
                .from('payment_events')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: false })

            if (eventsError) throw eventsError
            setPaymentEvents(eventsData || [])

        } catch (error: unknown) {
            console.error('Error fetching data:', error)
            setError(error instanceof Error ? error.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [supabase, bookingId])

    // Fetch booking and events when dependencies change
    useEffect(() => {
        if (!authLoading && currentUser && profile && bookingId) {
            fetchBookingAndEvents()
        }
    }, [authLoading, currentUser, profile, bookingId, fetchBookingAndEvents, supabase])


    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchStripeEvent = async (eventId: string) => {
        try {
            setLoadingEvent(true)
            const response = await fetch(`/api/stripe/events/${eventId}`)

            if (!response.ok) {
                throw new Error('Failed to fetch Stripe event')
            }

            const eventData = await response.json()
            setSelectedEvent(eventData)
            setShowEventModal(true)
        } catch (error: unknown) {
            console.error('Error fetching Stripe event:', error)
            showToast('Failed to fetch event details: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
        } finally {
            setLoadingEvent(false)
        }
    }

    // Fetch booking and events when dependencies change
    useEffect(() => {
        if (!authLoading && currentUser && profile && bookingId) {
            fetchBookingAndEvents()
        }
    }, [authLoading, currentUser, profile, bookingId, fetchBookingAndEvents, supabase])

    const getEventTypeColor = (eventType: string) => {
        if (eventType.includes('succeeded') || eventType.includes('completed')) {
            return 'bg-green-100 text-green-800'
        } else if (eventType.includes('failed') || eventType.includes('expired') || eventType.includes('dispute')) {
            return 'bg-red-100 text-red-800'
        } else if (eventType.includes('created') || eventType.includes('processing')) {
            return 'bg-blue-100 text-blue-800'
        } else {
            return 'bg-gray-100 text-gray-800'
        }
    }


    const copyToClipboard = async () => {
        if (selectedEvent) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))
                showToast('Event data copied to clipboard', 'success')
            } catch (error) {
                console.error('Failed to copy:', error)
                showToast('Failed to copy to clipboard', 'error')
            }
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Component JSX would go here */}
        </div>
    )
}




