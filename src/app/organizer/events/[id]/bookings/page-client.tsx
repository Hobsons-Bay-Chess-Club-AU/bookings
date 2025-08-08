'use client'

import EventBookingsClient from '@/components/organizer/event-bookings-client'
import Breadcrumb from '@/components/ui/breadcrumb'
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
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: event.title, href: `/organizer/events/${event.id}` },
                        { label: 'Bookings' }
                    ]} 
                />
            </div>

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Bookings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
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
