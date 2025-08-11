'use client'

import { useState, useEffect } from 'react'
import { Event, Profile } from '@/lib/types/database'
import MobileBookingModal from './mobile-booking-modal'
import MobileBookingButton from './mobile-booking-button'

interface EventBookingSectionProps {
    event: Event
    profile?: Profile
    initialStep?: string
    resumeBookingId?: string
}

export default function EventBookingSection({ event, profile, initialStep, resumeBookingId }: EventBookingSectionProps) {
    // Only auto-open modal on mobile devices when resuming
    const [showMobileBooking, setShowMobileBooking] = useState(false)
    
    // Auto-open modal only on mobile when resume parameters are present
    useEffect(() => {
        if ((!!initialStep || !!resumeBookingId) && typeof window !== 'undefined' && window.innerWidth < 768) {
            setShowMobileBooking(true)
        }
    }, [initialStep, resumeBookingId])

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
                initialStep={initialStep}
                resumeBookingId={resumeBookingId}
            />
        </>
    )
}
