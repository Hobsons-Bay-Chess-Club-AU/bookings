'use client'

import OrganizerEventsClient, { EventWithBookings } from '@/components/organizer/organizer-events-client'
import Link from 'next/link'

interface OrganizerPageClientProps {
    events: unknown[]
    totalRevenue: number
    totalBookings: number
}

export default function OrganizerPageClient({
    events,
    totalRevenue,
    totalBookings
}: OrganizerPageClientProps) {
    return (
        <div>
            {/* Page Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
                    <p className="text-gray-600 mt-2">Manage your events and bookings</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                    <Link
                        href="/organizer/html-to-markdown"
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        HTML to Markdown
                    </Link>
                    <Link
                        href="/organizer/custom-fields"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Custom Fields
                    </Link>
                    <Link
                        href="/organizer/events/new"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Create Event
                    </Link>
                </div>
            </div>

            <OrganizerEventsClient
                events={events as unknown as EventWithBookings[]} 
                totalRevenue={totalRevenue}
                totalBookings={totalBookings}
            />
        </div>
    )
}
