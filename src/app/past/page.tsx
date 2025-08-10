import { createServiceClient } from '@/lib/supabase/server'
import { Event } from '@/lib/types/database'
import EventCard from '@/components/events/EventCard'
import Link from 'next/link'
import { HiCalendarDays } from 'react-icons/hi2'

async function getPastEvents(): Promise<Event[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured')
      return []
    }
    const supabase = createServiceClient()
    const { data: events, error } = await supabase
      .from('events')
      .select(`*, organizer:profiles(full_name, email)`)
      .in('status', ['published', 'entry_closed', 'completed'])
      .order('end_date', { ascending: false })
    if (error) {
      console.error('Error fetching events:', error)
      return []
    }
    // Show completed events regardless of date, or events whose end_date is in the past
    const now = new Date()
    return (events || []).filter(event => {
      // If status is completed, show it regardless of date
      if (event.status === 'completed') return true
      
      // For other statuses, only show if end_date is in the past
      if (!event.end_date) return false
      return new Date(event.end_date) < new Date(now.toDateString())
    })
  } catch (error) {
    console.error('Error in getPastEvents:', error)
    return []
  }
}

export default async function PastEventsPage() {
  const events = await getPastEvents()
  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto py-2 md:py-12 px-2 md:px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Past Events
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
            Browse our archive of past events. Booking is not available for these events.
          </p>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">No past events found.</p>
            <Link
              href="/"
              className="inline-flex items-center px-8 py-4 text-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
            >
              <HiCalendarDays className="mr-3 h-6 w-6" />
              View Current Events
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} hideBooking />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}