'use client'


import { Event, Profile } from '@/lib/types/database'
import { BookingProvider } from '@/contexts/BookingContext'
import EventLayout from '@/components/events/event-layout'
import { ReactNode } from 'react'

interface EventPageClientProps {
    event: Event
    profile?: Profile
    initialStep?: string
    resumeBookingId?: string
    children: ReactNode
}

export default function EventPageClient({ event, profile, initialStep, resumeBookingId, children }: EventPageClientProps) {
    const handleStartBooking = () => {
        console.log('🔍 [EVENT-PAGE-CLIENT] Start booking clicked!')
        console.log('🔍 [EVENT-PAGE-CLIENT] About to call onStartBooking callback')
    }

    return (
        <BookingProvider onStartBooking={handleStartBooking}>
            <EventLayout 
                event={event} 
                profile={profile}
                initialStep={initialStep}
                resumeBookingId={resumeBookingId}
            >
                {children}
            </EventLayout>
        </BookingProvider>
    )
}
