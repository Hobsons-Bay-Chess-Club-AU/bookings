'use client'

import PricingManager from '@/components/events/pricing-manager'
import { Event, EventPricing } from '@/lib/types/database'

interface EventPricingPageClientProps {
    event: Event
    pricing: EventPricing[]
}

export default function EventPricingPageClient({
    event,
    pricing
}: EventPricingPageClientProps) {
    return (
        <div>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Event Pricing</h1>
                <p className="text-gray-600 mt-2">
                    Manage pricing tiers for <span className="font-medium">{event.title}</span>
                </p>
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
        </div>
    )
}
