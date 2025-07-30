import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/utils/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BookingForm from '@/components/events/booking-form'
import { Event, Booking } from '@/lib/types/database'
import MarkdownContent from '@/components/ui/html-content'

async function getEvent(id: string): Promise<Event | null> {
    const supabase = await createClient()

    const { data: event, error } = await supabase
        .from('events')
        .select(`
      *,
      organizer:profiles(full_name, email)
    `)
        .eq('id', id)
        .single()

    if (error || !event) {
        return null
    }

    return event
}

async function getUserBooking(eventId: string, userId: string): Promise<Booking | null> {
    const supabase = await createClient()

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

    if (error || !booking) {
        return null
    }

    return booking
}

interface EventPageProps {
    params: Promise<{ id: string }>
}

export default async function EventPage({ params }: EventPageProps) {
    const { id } = await params
    const event = await getEvent(id)
    const user = await getCurrentUser()
    const profile = await getCurrentProfile()

    if (!event) {
        notFound()
    }

    const userBooking = user ? await getUserBooking(event.id, user.id) : null
    const isEventFull = event.max_attendees ? event.current_attendees >= event.max_attendees : false
    const isEventPast = new Date(event.start_date) < new Date()
    const isBookable = event.status === 'published' && !isEventFull && !isEventPast && event.status !== 'entry_closed'

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <Link href="/" className="text-indigo-600 hover:text-indigo-500">
                            ← Back to Events
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                    {/* Event Details */}
                    <div>
                        {event.image_url && (
                            <div className="aspect-w-16 aspect-h-9 mb-8">
                                <img
                                    className="w-full h-64 object-cover rounded-lg"
                                    src={event.image_url}
                                    alt={event.title}
                                />
                            </div>
                        )}

                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                    {event.title}
                                </h1>

                                <div className="flex items-center text-sm text-gray-500 mb-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        {event.status}
                                    </span>
                                    {isEventPast && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            Past Event
                                        </span>
                                    )}
                                    {isEventFull && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Sold Out
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-3">📅</span>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {new Date(event.start_date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(event.start_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} - {new Date(event.end_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-3">📍</span>
                                        <p className="text-gray-900">{event.location}</p>
                                    </div>

                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-3">👥</span>
                                        <p className="text-gray-900">
                                            {event.max_attendees ?
                                                `${event.current_attendees} / ${event.max_attendees} attendees` :
                                                `${event.current_attendees} attendees`
                                            }
                                        </p>
                                    </div>

                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-3">💰</span>
                                        <p className="text-2xl font-bold text-gray-900">
                                            $AUD {event.price.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {event.description && (
                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        About this event
                                    </h3>
                                    <MarkdownContent 
                                        content={event.description}
                                        className="text-gray-700"
                                    />
                                </div>
                            )}

                            {event.organizer && (
                                <div className="border-t pt-6 mt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        Organizer
                                    </h3>
                                    <p className="text-gray-700">
                                        {event.organizer.full_name || event.organizer.email}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Booking Section */}
                    <div>
                        <div className="bg-white shadow rounded-lg p-6 sticky top-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">
                                Book Your Spot
                            </h2>

                            {!user ? (
                                <div className="text-center">
                                    <p className="text-gray-600 mb-4">
                                        Please sign in to book this event
                                    </p>
                                    <div className="space-y-3">
                                        <Link
                                            href={`/auth/login?redirectTo=/events/${event.id}`}
                                            className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/auth/signup"
                                            className="w-full bg-white border border-gray-300 rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Create Account
                                        </Link>
                                    </div>
                                </div>
                            ) : userBooking ? (
                                <div>
                                    <div className="text-center mb-6">
                                        <div className="mb-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                userBooking.status === 'confirmed' || userBooking.status === 'verified'
                                                    ? 'bg-green-100 text-green-800'
                                                    : userBooking.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                {userBooking.status === 'confirmed' ? '✓ Confirmed' :
                                                    userBooking.status === 'verified' ? '✅ Verified' :
                                                    userBooking.status === 'pending' ? '⏳ Pending' :
                                                        '❌ ' + userBooking.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-2">
                                            You have booked {userBooking.quantity} ticket{userBooking.quantity > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-lg font-bold text-gray-900">
                                            Total: ${userBooking.total_amount.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Booked on {new Date(userBooking.booking_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    
                                    <div className="border-t pt-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-3 text-center">
                                            Book Additional Tickets
                                        </h3>
                                        {!isBookable ? (
                                            <div className="text-center py-8">
                                                {event.status === 'entry_closed' ? (
                                                    <p className="text-xl text-gray-800 font-semibold">Entries for this event are now closed by the organizer.</p>
                                                ) : isEventFull ? (
                                                    <p className="text-xl text-gray-800 font-semibold">This event is sold out.</p>
                                                ) : isEventPast ? (
                                                    <p className="text-xl text-gray-800 font-semibold">This event has already ended.</p>
                                                ) : event.status !== 'published' ? (
                                                    <p className="text-xl text-gray-800 font-semibold">This event is not open for booking.</p>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <BookingForm event={event} user={profile!} />
                                        )}
                                    </div>
                                </div>
                            ) : !isBookable ? (
                                <div className="text-center py-8">
                                    {event.status === 'entry_closed' ? (
                                        <p className="text-xl text-gray-800 font-semibold">Entries for this event are now closed by the organizer.</p>
                                    ) : isEventFull ? (
                                        <p className="text-xl text-gray-800 font-semibold">This event is sold out.</p>
                                    ) : isEventPast ? (
                                        <p className="text-xl text-gray-800 font-semibold">This event has already ended.</p>
                                    ) : event.status !== 'published' ? (
                                        <p className="text-xl text-gray-800 font-semibold">This event is not open for booking.</p>
                                    ) : null}
                                </div>
                            ) : (
                                <BookingForm event={event} user={profile!} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}