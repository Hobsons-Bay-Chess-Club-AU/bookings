'use client'

import EventBookingsClient from '@/components/organizer/event-bookings-client'
import { Event, } from '@/lib/types/database'
import { BookingWithProfile } from '@/lib/types/ui'

interface EventBookingsPageClientProps {
    event: Event
    bookings: BookingWithProfile[]
}

export default function EventBookingsPageClient({
    event,
    bookings
}: EventBookingsPageClientProps) {
    return (
        <>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Event Bookings</h1>
                <p className="text-gray-600 mt-2">
                    Manage bookings for <span className="font-medium">{event.title}</span>
                </p>
            </div>

            <EventBookingsClient
                event={event}
                bookings={bookings}
            />
        </>
    )
}
