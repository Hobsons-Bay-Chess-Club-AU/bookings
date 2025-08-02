import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Booking, Event } from '@/lib/types/database'
import AddToCalendar from '@/components/calendar/add-to-calendar'
import { CalendarEvent } from '@/lib/utils/calendar'

async function getBookingFromSession(sessionId: string): Promise<(Booking & { event: Event }) | null> {
    const supabase = await createClient()

    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
      *,
      event:events(*)
    `)
        .eq('stripe_session_id', sessionId)
        .single()

    if (error || !booking) {
        return null
    }

    return booking as Booking & { event: Event }
}

interface SuccessPageProps {
    searchParams: Promise<{ session_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
    const { session_id } = await searchParams
    const user = await getCurrentUser()

    if (!user) {
        redirect('/auth/login')
    }

    if (!session_id) {
        redirect('/')
    }

    const booking = await getBookingFromSession(session_id)

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Booking Not Found
                        </h2>
                        <p className="mt-2 text-sm text-gray-800">
                            We couldn't find your booking. Please check your email for confirmation.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Back to Events
                    </Link>
                </div>
            </div>
        )
    }

    // Prepare calendar event data
    const calendarEvent: CalendarEvent = {
        title: booking.event.title,
        description: `${booking.event.description || ''}\n\nBooking ID: ${booking.booking_id || booking.id}\nTickets: ${booking.quantity}`,
        location: booking.event.location,
        startDate: new Date(booking.event.start_date),
        endDate: new Date(booking.event.end_date)
    }

    return (
        <div className="bg-gray-50">
            <div className="py-2 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        {/* Success Header */}
                        <div className="bg-green-50 px-6 py-4 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <svg
                                    className="h-6 w-6 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Booking Confirmed!
                            </h1>
                            <p className="text-lg text-gray-800">
                                Your payment was successful and your booking is confirmed.
                            </p>
                        </div>

                        {/* Booking Details */}
                        <div className="px-6 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Event Details */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Event Details
                                    </h2>
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-medium text-gray-900">
                                                {booking.event.title}
                                            </h3>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-800">
                                            <span className="mr-2">📅</span>
                                            <span>
                                                {new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-800">
                                            <span className="mr-2">🕒</span>
                                            <span>
                                                {new Date(booking.event.start_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} - {new Date(booking.event.end_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-800">
                                            <span className="mr-2">📍</span>
                                            <span>{booking.event.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Summary */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Booking Summary
                                    </h2>
                                    <div className="space-y-3 text-gray-800">
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Booking ID:</span>
                                            <span className="font-mono text-sm font-bold">{booking.booking_id || booking.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Tickets:</span>
                                            <span>{booking.quantity}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Price per ticket:</span>
                                            <span>AUD ${booking.event.price.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t pt-3">
                                            <div className="flex justify-between font-semibold text-gray-800">
                                                <span>Total Paid:</span>
                                                <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Status:</span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                ✓ Confirmed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Integration */}
                            <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-medium text-purple-900">Add to Your Calendar</h3>
                                    <AddToCalendar event={calendarEvent} />
                                </div>
                                <p className="text-sm text-purple-800">
                                    Don't miss your event! Add it to your calendar to get reminders.
                                </p>
                            </div>

                            {/* Next Steps */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
                                <ul className="text-sm text-blue-900 space-y-1">
                                    <li>• You'll receive a confirmation email shortly</li>
                                    <li>• Save this page or take a screenshot for your records</li>
                                    <li>• Arrive at the venue 15 minutes before the event starts</li>
                                    <li>• Bring a valid ID for entry</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/dashboard"
                                    className="flex-1 bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    View My Bookings
                                </Link>
                                <Link
                                    href="/"
                                    className="flex-1 bg-white border border-gray-300 rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Browse More Events
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}