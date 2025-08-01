'use client'

import { useState } from 'react'
import BookingForm from './booking-form'
import { Event, Profile } from '@/lib/types/database'

interface EventLayoutProps {
    event: Event
    profile?: Profile
    children: React.ReactNode // Event details content
}

export default function EventLayout({ event, profile, children }: EventLayoutProps) {
    const [bookingStep, setBookingStep] = useState(1)
    const isBookingActive = bookingStep > 1

    return (
        <div className={`lg:grid lg:gap-8 lg:grid-cols-12`}>
            {/* Event Details */}
            <div className={`${
                isBookingActive 
                    ? 'lg:col-span-5' // 5/12 width when booking active
                    : 'lg:col-span-7' // 7/12 width by default
            }`}>
                {children}
            </div>

            {/* Desktop Booking Section - Hidden on mobile */}
            <div className={`hidden md:block ${
                isBookingActive 
                    ? 'lg:col-span-7' // 7/12 width when booking active
                    : 'lg:col-span-5' // 5/12 width by default
            }`}>
                <div className="bg-white shadow rounded-lg p-6 sticky top-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                        Book Your Spot
                    </h2>
                    <BookingForm 
                        event={event} 
                        user={profile} 
                        onStepChange={setBookingStep}
                    />
                </div>
            </div>
        </div>
    )
}
