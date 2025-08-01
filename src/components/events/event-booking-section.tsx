'use client'

import { useState } from 'react'
import { Event, Profile } from '@/lib/types/database'
import MobileBookingModal from './mobile-booking-modal'
import MobileBookingButton from './mobile-booking-button'

interface EventBookingSectionProps {
    event: Event
    profile?: Profile
}

export default function EventBookingSection({ event, profile }: EventBookingSectionProps) {
    const [showMobileBooking, setShowMobileBooking] = useState(false)

    return (
        <>
            {/* Mobile Book Now Button */}
            <MobileBookingButton 
                event={event}
                onClick={() => setShowMobileBooking(true)}
            />

            {/* Mobile Booking Modal */}
            <MobileBookingModal
                event={event}
                user={profile}
                isOpen={showMobileBooking}
                onClose={() => setShowMobileBooking(false)}
            />
        </>
    )
}
