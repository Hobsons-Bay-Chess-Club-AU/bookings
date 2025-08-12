'use client'

import { useState } from 'react'
import BookingForm from './booking-form'
import { Event, Profile } from '@/lib/types/database'

interface EventLayoutProps {
    event: Event
    profile?: Profile
    children: React.ReactNode // Event details content
    initialStep?: string
    resumeBookingId?: string
}

export default function EventLayout({ event, profile, children, initialStep, resumeBookingId }: EventLayoutProps) {
    const [bookingStep, setBookingStep] = useState(initialStep ? parseInt(initialStep) : 1)
    const isBookingActive = bookingStep > 0 || !!resumeBookingId

    return (
        <div className={`lg:grid lg:gap-8 lg:grid-cols-12`}>
            {/* Event Details */}
            <div className={`${isBookingActive
                    ? 'lg:col-span-5' // 5/12 width when booking active
                    : 'lg:col-span-7' // 7/12 width by default
                }`}>
                {children}
            </div>

            {/* Desktop Booking Section - Hidden on mobile */}
            <div className={`hidden md:block ${isBookingActive
                    ? 'lg:col-span-7' // 7/12 width when booking active
                    : 'lg:col-span-5' // 5/12 width by default
                }`}>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                        {event.max_attendees != null && event.current_attendees >= event.max_attendees && event.settings?.whitelist_enabled
                            ? 'Whitelist Your Spot'
                            : 'Book Your Spot'}
                    </h2>
                    <BookingForm
                        event={event}
                        user={profile}
                        onStepChange={setBookingStep}
                        initialStep={initialStep}
                        resumeBookingId={resumeBookingId}
                    />
                </div>
            </div>
        </div>
    )
}
