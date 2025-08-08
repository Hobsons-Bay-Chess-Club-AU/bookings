import { createServiceClient } from '@/lib/supabase/server'
import { Event } from '@/lib/types/database'
import EventCard from '@/components/events/EventCard'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const title = 'Hobsons Bay Chess Club Bookings'
  const description = 'Bookings for Hobsons Bay Chess Club events'
  const imageUrl = `${siteUrl}/api/og/home`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: siteUrl,
      siteName: 'Hobsons Bay Chess Club',
      title,
      description,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: siteUrl,
    },
  }
}

async function getPublishedEvents(): Promise<Event[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured')
      return []
    }
    const supabase = createServiceClient()
    const { data: events, error } = await supabase
      .from('events')
      .select(`*, organizer:profiles(full_name, email)`)
      .in('status', ['published', 'entry_closed'])
      .order('is_promoted', { ascending: false })
      .order('start_date', { ascending: true })
    if (error) {
      console.error('Error fetching events:', error)
      return []
    }
    // Only show events whose end_date is today or in the future
    const now = new Date()
    return (events || []).filter(event => {
      if (!event.end_date) return true
      return new Date(event.end_date) >= new Date(now.toDateString())
    })
  } catch (error) {
    console.error('Error in getPublishedEvents:', error)
    return []
  }
}

export default async function HomePage() {
  const events = await getPublishedEvents()
  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <div className="bg-indigo-700">
        <div className="max-w-7xl mx-auto py-16 px-1 md:px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              Discover Amazing Events
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-indigo-200 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Find and book tickets for the best events in your area. From concerts to conferences, we&apos;ve got you covered.
            </p>
          </div>
        </div>
      </div>
      {/* Events Section */}
      <div className="max-w-7xl mx-auto py-12 px-1 md:px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Upcoming Events
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
            Browse our selection of upcoming events and secure your spot today.
          </p>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No events available at the moment.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Check back soon for new events!</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
