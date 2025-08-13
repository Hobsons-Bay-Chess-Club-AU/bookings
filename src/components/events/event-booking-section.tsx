'use client'

import { useState, useEffect } from 'react'
import { Event, Profile } from '@/lib/types/database'
import MobileBookingModal from './mobile-booking-modal'
import MobileBookingButton from './mobile-booking-button'
import { useBooking } from '@/contexts/BookingContext'

interface EventBookingSectionProps {
    event: Event
    profile?: Profile
    initialStep?: string
    resumeBookingId?: string
    onStartBooking?: () => void
}

export default function EventBookingSection({ event, profile, initialStep, resumeBookingId }: EventBookingSectionProps) {
    const { onStartBooking } = useBooking()
    // Only auto-open modal on mobile devices when resuming
    const [showMobileBooking, setShowMobileBooking] = useState(false)
    
    // Auto-open modal only on mobile when resume parameters are present
    useEffect(() => {
        if ((!!initialStep || !!resumeBookingId) && typeof window !== 'undefined' && window.innerWidth < 768) {
            setShowMobileBooking(true)
        }
    }, [initialStep, resumeBookingId])

    const handleBookingClick = () => {
        console.log('🔍 [EVENT-BOOKING-SECTION] Button clicked!')
        console.log('🔍 [EVENT-BOOKING-SECTION] Window width:', typeof window !== 'undefined' ? window.innerWidth : 'undefined')
        
        // On mobile, show modal
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            console.log('🔍 [EVENT-BOOKING-SECTION] Mobile detected, showing modal')
            setShowMobileBooking(true)
        } else {
            // On desktop, trigger layout change
            console.log('🔍 [EVENT-BOOKING-SECTION] Desktop detected, calling onStartBooking')
            console.log('🔍 [EVENT-BOOKING-SECTION] onStartBooking function:', !!onStartBooking)
            onStartBooking?.()
        }
    }

    return (
        <>
            {/* Book Now Button - Mobile shows modal, Desktop triggers layout change */}
            <MobileBookingButton
                event={event}
                onClick={handleBookingClick}
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
