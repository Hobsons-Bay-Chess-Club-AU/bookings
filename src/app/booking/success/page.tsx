import { createClient } from '@/lib/supabase/server'
import { HiCalendar, HiClock, HiMapPin } from 'react-icons/hi2'
import { getCurrentUser } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Booking, Event, DiscountApplication } from '@/lib/types/database'
import AddToCalendar from '@/components/calendar/add-to-calendar'
import { CalendarEvent } from '@/lib/utils/calendar'

async function getBookingFromSession(sessionId: string): Promise<(Booking & { event: Event; discount_applications?: DiscountApplication[] }) | null> {
    const supabase = await createClient()

    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
            *,
            event:events!bookings_event_id_fkey(*),
            discount_applications(
                *,
                discount:event_discounts(*)
            )
        `)
        .eq('stripe_session_id', sessionId)
        .single()

    if (error || !booking) {
        return null
    }

    return booking as Booking & { event: Event; discount_applications?: DiscountApplication[] }
}

interface SuccessPageProps {
    searchParams: Promise<{ session_id?: string; booking_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
    const { session_id, booking_id } = await searchParams
    const user = await getCurrentUser()

    if (!user) {
        redirect('/auth/login')
    }

    if (!session_id && !booking_id) {
        redirect('/')
    }

    let booking: (Booking & { event: Event; discount_applications?: DiscountApplication[] }) | null = null

    if (session_id) {
        // For paid events with Stripe session
        booking = await getBookingFromSession(session_id)
    } else if (booking_id) {
        // For free events with booking ID
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events!bookings_event_id_fkey(*),
                discount_applications(
                    *,
                    discount:event_discounts(*)
                )
            `)
            .eq('id', booking_id)
            .single()
        
        if (!error && data) {
            booking = data as Booking & { event: Event; discount_applications?: DiscountApplication[] }
        }
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                            Booking Not Found
                        </h2>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-400">
                            We couldn&apos;t find your booking. Please check your email for confirmation.
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
        <div className="bg-gray-50 dark:bg-gray-900">
            <div className="py-2 px-2 md:px-4 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Success Header */}
                        <div className="bg-green-50 dark:bg-green-900/30 px-6 py-4 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                                <svg
                                    className="h-6 w-6 text-green-600 dark:text-green-400"
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
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Booking Confirmed!
                            </h1>
                            <p className="text-lg text-gray-800 dark:text-gray-200">
                                {booking.total_amount === 0 
                                    ? 'Your free event booking is confirmed.' 
                                    : 'Your payment was successful and your booking is confirmed.'
                                }
                            </p>
                        </div>

                        {/* Booking Details */}
                        <div className="px-6 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Event Details */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        Event Details
                                    </h2>
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                                {booking.event.title}
                                            </h3>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-800 dark:text-gray-300">
                                            <HiCalendar className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                                            <span>
                                                {new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-800 dark:text-gray-300">
                                            <HiClock className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
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
                                        <div className="flex items-center text-sm text-gray-800 dark:text-gray-300">
                                            <HiMapPin className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                                            <span>{booking.event.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Summary */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        Booking Summary
                                    </h2>
                                    <div className="space-y-3 text-gray-800 dark:text-gray-300">
                                        <div className="flex justify-between">
                                            <span className="text-gray-800 dark:text-gray-300">Booking ID:</span>
                                            <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{booking.booking_id || booking.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800 dark:text-gray-300">Tickets:</span>
                                            <span className="text-gray-900 dark:text-gray-100">{booking.quantity}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800 dark:text-gray-300">Price per ticket:</span>
                                            <span className="text-gray-900 dark:text-gray-100">{booking.total_amount === 0 ? 'Free' : `AUD $${(booking.total_amount / booking.quantity).toFixed(2)}`}</span>
                                        </div>
                                        
                                        {/* Discount Information */}
                                        {booking.discount_applications && booking.discount_applications.length > 0 && (
                                            <>
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-800 dark:text-gray-300">Subtotal:</span>
                                                        <span className="text-gray-900 dark:text-gray-100">AUD ${booking.total_amount.toFixed(2)}</span>
                                                    </div>
                                                    
                                                    {booking.discount_applications.map((discountApp, index) => (
                                                        <div key={index} className="flex justify-between text-green-600 dark:text-green-400">
                                                            <span className="text-sm">
                                                                {discountApp.discount?.name || 'Discount'}
                                                                {discountApp.discount?.discount_type === 'participant_based' && 
                                                                    ` (participant-based)`
                                                                }
                                                            </span>
                                                            <span className="text-sm font-medium">
                                                                -AUD ${discountApp.applied_value.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    
                                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                                        <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                                                            <span>Total Paid:</span>
                                                            <span className="text-gray-900 dark:text-gray-100">AUD ${booking.total_amount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* No discounts applied */}
                                        {(!booking.discount_applications || booking.discount_applications.length === 0) && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                                                    <span>{booking.total_amount === 0 ? 'Total:' : 'Total Paid:'}</span>
                                                    <span className="text-gray-900 dark:text-gray-100">{booking.total_amount === 0 ? 'Free' : `AUD $${booking.total_amount.toFixed(2)}`}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between">
                                            <span className="text-gray-800 dark:text-gray-300">Status:</span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                ✓ Confirmed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Integration */}
                            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-medium text-purple-900 dark:text-purple-200">Add to Your Calendar</h3>
                                    <AddToCalendar event={calendarEvent} />
                                </div>
                                <p className="text-sm text-purple-800 dark:text-purple-300">
                                    Don&apos;t miss your event! Add it to your calendar to get reminders.
                                </p>
                            </div>

                            {/* Next Steps */}
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">What&apos;s Next?</h3>
                                <ul className="text-sm text-blue-900 dark:text-blue-300 space-y-1">
                                    <li>• You&apos;ll receive a confirmation email shortly</li>
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
                                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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