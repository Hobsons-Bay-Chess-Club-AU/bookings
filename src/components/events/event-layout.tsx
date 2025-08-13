'use client'

import { useState, useEffect, useRef } from 'react'
import BookingForm from './booking-form'
import { Event, Profile } from '@/lib/types/database'
import { useBooking } from '@/contexts/BookingContext'

interface EventLayoutProps {
    event: Event
    profile?: Profile
    children: React.ReactNode // Event details content
    initialStep?: string
    resumeBookingId?: string
}

export default function EventLayout({ event, profile, children, initialStep, resumeBookingId }: EventLayoutProps) {
    const { hasUserInteracted, setHasUserInteracted, bookingStep, setBookingStep } = useBooking()
    
    // Initialize bookingStep from initialStep if provided
    useEffect(() => {
        if (initialStep) {
            setBookingStep(parseInt(initialStep))
        }
    }, [initialStep, setBookingStep])

    // Only consider booking active if user has interacted OR we're resuming a booking
    const isBookingActive = (bookingStep > 0 && hasUserInteracted) || !!resumeBookingId




    
    return (
        <div className={`lg:grid lg:gap-8 lg:grid-cols-12`}>
            {/* Event Details */}
            <div className={`${isBookingActive
                    ? 'lg:col-span-5' // 5/12 width when booking active
                    : 'lg:col-span-12' // Full width by default
                }`}>
                {children}
            </div>

            {/* Desktop Booking Section - Only show when booking is active */}
            {isBookingActive && (
                <div className="hidden md:block lg:col-span-7">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                            {(() => {
                                if (event.has_sections && event.sections && event.sections.length > 0) {
                                    // For multi-section events, check if any sections have whitelist enabled
                                    const hasWhitelistSections = event.sections.some(section => {
                                        const isFull = (section.available_seats ?? 0) === 0
                                        const whitelistEnabled = section.whitelist_enabled || false
                                        return isFull && whitelistEnabled
                                    })
                                    
                                    const allSectionsFull = event.sections.every(section => (section.available_seats ?? 0) === 0)
                                    
                                    if (allSectionsFull && hasWhitelistSections) {
                                        return 'Whitelist Your Spot'
                                    }
                                } else {
                                    // For single events, use the existing logic
                                    if (event.max_attendees != null && event.current_attendees >= event.max_attendees && event.settings?.whitelist_enabled) {
                                        return 'Whitelist Your Spot'
                                    }
                                }
                                return 'Book Your Spot'
                            })()}
                        </h2>
                        <BookingForm
                            event={event}
                            user={profile}
                            onStepChange={(step) => {
                                // Don't override bookingStep when step is 0 and user has interacted
                                // This prevents overriding the context state when user clicks "Start Booking"
                                if (step > 0 || !hasUserInteracted) {
                                    setBookingStep(step)
                                }
                            }}
                            onUserInteraction={() => {
                                setHasUserInteracted(true)
                            }}
                            initialStep={initialStep}
                            resumeBookingId={resumeBookingId}
                            hasUserInteracted={hasUserInteracted}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
