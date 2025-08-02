'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event, EventPricing } from '@/lib/types/database'
import EventPricingPageClient from './page-client'

export default function EventPricingPage() {
    const [event, setEvent] = useState<Event | null>(null)
    const [pricing, setPricing] = useState<EventPricing[]>([])
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
                    setError('Event not found or access denied')
                    setLoading(false)
                    return
                }

                setEvent(eventData)

                // Get pricing tiers for this event
                const { data: pricingData, error: pricingError } = await supabase
                    .from('event_pricing')
                    .select('*')
                    .eq('event_id', eventId)
                    .order('start_date', { ascending: true })

                if (pricingError) {
                    console.error('Error fetching pricing:', pricingError)
                    setPricing([])
                } else {
                    setPricing(pricingData || [])
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading event pricing...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {error || 'Event not found'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {error || 'The event you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <EventPricingPageClient
            event={event}
            pricing={pricing}
        />
    )
}
