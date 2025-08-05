'use client'

import { useBookingJourney } from '@/contexts/BookingJourneyContext'
import ChatWidget from '@/components/messaging/chat-widget'
import { Event, Profile } from '@/lib/types/database'

interface EventChatClientProps {
  event: Event
  organizer: Profile
}

export default function EventChatClient({ event, organizer }: EventChatClientProps) {
  const { isInBookingJourney } = useBookingJourney()

  // Only render ChatWidget when not in booking journey
  if (isInBookingJourney) {
    return null
  }

  return (
    <ChatWidget 
      event={event}
      organizer={organizer}
    />
  )
} 