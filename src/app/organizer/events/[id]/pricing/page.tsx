import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect, notFound } from 'next/navigation'
import { Event, EventPricing } from '@/lib/types/database'
import AdminLayout from '@/components/layout/admin-layout'
import PricingManager from '@/components/events/pricing-manager'

async function getEventWithPricing(eventId: string, organizerId: string): Promise<{
    event: Event
    pricing: EventPricing[]
} | null> {
    const supabase = await createClient()

    // First verify the event belongs to this organizer
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .single()

    if (eventError || !event) {
        return null
    }

    // Get pricing tiers for this event
    const { data: pricing, error: pricingError } = await supabase
        .from('event_pricing')
        .select('*')
        .eq('event_id', eventId)
        .order('start_date', { ascending: true })

    if (pricingError) {
        console.error('Error fetching pricing:', pricingError)
        return { event, pricing: [] }
    }

    return {
        event,
        pricing: pricing || []
    }
}

interface EventPricingPageProps {
    params: Promise<{ id: string }>
}

export default async function EventPricingPage({ params }: EventPricingPageProps) {
    const { id } = await params
    const profile = await getCurrentProfile()

    if (!profile || !['admin', 'organizer'].includes(profile.role)) {
        redirect('/unauthorized')
    }

    const data = await getEventWithPricing(id, profile.id)

    if (!data) {
        notFound()
    }

    const { event, pricing } = data

    return (
        <AdminLayout requiredRole="organizer">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
                <p className="text-gray-600 mt-2">{event.title}</p>
            </div>

            {/* Event Info */}
            <div className="bg-white shadow rounded-lg mb-8 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Event Details</h2>
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                                <span className="mr-2">📅</span>
                                <span>
                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">🕒</span>
                                <span>
                                    {new Date(event.start_date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })} - {new Date(event.end_date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">📍</span>
                                <span>{event.location}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-2">👥</span>
                                <span>
                                    {event.max_attendees
                                        ? `${event.current_attendees} / ${event.max_attendees} attendees`
                                        : `${event.current_attendees} attendees`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Overview</h2>
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Active Pricing Tiers:</span>
                                <span className="font-medium text-gray-900">{pricing.filter(p => p.is_active).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Pricing Tiers:</span>
                                <span className="font-medium text-gray-900">{pricing.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Price Range:</span>
                                <span className="font-medium text-gray-900">
                                    {pricing.length > 0
                                        ? `AUD $${Math.min(...pricing.map(p => p.price)).toFixed(2)} - AUD $${Math.max(...pricing.map(p => p.price)).toFixed(2)}`
                                        : 'No pricing set'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Manager Component */}
            <PricingManager eventId={event.id} initialPricing={pricing} />
        </AdminLayout>
    )
}