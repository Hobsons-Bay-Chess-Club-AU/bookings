import { createServiceClient } from '@/lib/supabase/server'
import { Event } from '@/lib/types/database'
import EventCard from '@/components/events/EventCard'
import { HiMagnifyingGlass } from 'react-icons/hi2'

function filterUpcoming(events: Event[]) {
  const now = new Date()
  return events.filter(event => {
    if (!event.end_date) return true
    return new Date(event.end_date) >= new Date(now.toDateString())
  })
}

async function searchEvents(keyword: string): Promise<Event[]> {
  if (!keyword) return []
  try {
    const supabase = createServiceClient()
    const { data: events, error } = await supabase
      .from('events')
      .select(`*, organizer:profiles(full_name, email)`)
      .in('status', ['published', 'entry_closed'])
      .order('start_date', { ascending: true })
    if (error) {
      console.error('Error searching events:', error)
      return []
    }
    const lower = keyword.toLowerCase()
    return filterUpcoming((events || []).filter(event =>
      (event.title && event.title.toLowerCase().includes(lower)) ||
      (event.description && event.description.toLowerCase().includes(lower))
    ))
  } catch (error) {
    console.error('Error in searchEvents:', error)
    return []
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ keyword?: string }> }) {
  const params = await searchParams
  const keyword = params.keyword || ''
  const events = keyword ? await searchEvents(keyword) : []
  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="max-w-9xl mx-auto py-12 px-1 md:px-4">
        <form
          action="/search"
          method="get"
          className="mb-12 flex flex-col items-center w-full"
        >
          <div className="relative w-full">
            <input
              type="text"
              name="keyword"
              defaultValue={keyword}
              placeholder="Search events by title or description..."
              className="w-full text-2xl md:text-3xl px-5 py-5 md:px-8 md:py-8 rounded-2xl border-0 shadow-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-500 pr-20 font-semibold"
              style={{ minWidth: 0 }}
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Search"
            >
              <HiMagnifyingGlass className="h-7 w-7" />
            </button>
          </div>
        </form>
        {keyword && (
          <div className="mb-6 text-center text-gray-500 dark:text-gray-400">
            Showing results for <span className="font-semibold">{keyword}</span>
          </div>
        )}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No events found.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}