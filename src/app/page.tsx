import { createServiceClient } from '@/lib/supabase/server'
import { Event } from '@/lib/types/database'
import MarkdownContent from '@/components/ui/html-content'
import CopyButton from '@/components/ui/copy-button'
import Header from '@/components/layout/header'
import Link from 'next/link'

async function getPublishedEvents(): Promise<Event[]> {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured')
      return []
    }

    const supabase = createServiceClient()

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles(full_name, email)
      `)
      .in('status', ['published', 'entry_closed'])
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching events:', error)
      return []
    }

    return events || []
  } catch (error) {
    console.error('Error in getPublishedEvents:', error)
    return []
  }
}

export default async function HomePage() {
  const events = await getPublishedEvents()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <div className="bg-indigo-700">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              Discover Amazing Events
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-indigo-200 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Find and book tickets for the best events in your area. From concerts to conferences, we've got you covered.
            </p>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Upcoming Events
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Browse our selection of upcoming events and secure your spot today.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events available at the moment.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for new events!</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div key={event.id} className="bg-white overflow-hidden shadow rounded-lg">
                {event.image_url && (
                  <div className="h-48 bg-gray-200">
                    <img
                      className="h-full w-full object-cover"
                      src={event.image_url}
                      alt={event.title}
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <p className="text-sm font-medium text-indigo-600">
                          {new Date(event.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">
                          {new Date(event.start_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {event.status === 'entry_closed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Entry Closed
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {event.title}
                    </h3>
                    <MarkdownContent 
                      content={event.description || ''}
                      className="mt-1 text-sm text-gray-500 line-clamp-3"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      📍 {event.location}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-lg font-bold text-gray-900">
                        $AUD {event.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.max_attendees ?
                          `${event.current_attendees}/${event.max_attendees} spots` :
                          `${event.current_attendees} attending`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <Link
                      href={event.alias ? `/e/${event.alias}` : `/events/${event.id}`}
                      className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Details & Book
                    </Link>
                    
                    {event.alias && (
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                        <span>🔗</span>
                        <span className="font-mono">localhost:3000/e/{event.alias}</span>
                        <CopyButton text={`localhost:3000/e/${event.alias}`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
