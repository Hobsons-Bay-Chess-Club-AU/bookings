'use client'

import { useBookingJourney } from '@/contexts/BookingJourneyContext'
import ChatWidget from '@/components/messaging/chat-widget'
import { Event, Profile } from '@/lib/types/database'

interface BookingDetailsClientProps {
  event: Event
  organizer: Profile
  bookingId: string
}

// Client component to conditionally render ChatWidget based on booking journey state
export default function BookingDetailsClient({ event, organizer, bookingId }: BookingDetailsClientProps) {
  const { isInBookingJourney } = useBookingJourney()

  // Only render ChatWidget when not in booking journey
  if (isInBookingJourney) {
    return null
  }

  return (
    <ChatWidget 
      event={event}
      organizer={organizer}
      bookingId={bookingId}
    />
  )
} 