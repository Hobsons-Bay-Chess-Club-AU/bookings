import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Booking, Event, DiscountApplication } from '@/lib/types/database'
import AddToCalendar from '@/components/calendar/add-to-calendar'
import { CalendarEvent } from '@/lib/utils/calendar'
import MarkdownContent from '@/components/ui/html-content'
import RefundPolicyDisplay from '@/components/events/refund-policy-display'
import RefundRequestButton from '@/components/dashboard/refund-request-button'
import ContactOrganizerButton from '@/components/messaging/contact-organizer-button'
import ChatWidget from '@/components/messaging/chat-widget'
import EventLocationMap from '@/components/events/event-location-map'

async function getBooking(bookingId: string, userId: string): Promise<(Booking & { event: Event; discount_applications?: DiscountApplication[] }) | null> {
    const supabase = await createClient()

    // Check if the bookingId is a UUID (36 characters) or short booking ID (7 characters)
    const isUUID = bookingId.length === 36 && bookingId.includes('-')

    let query = supabase
        .from('bookings')
        .select(`
            *,
            event:events!bookings_event_id_fkey(*, timeline, organizer:profiles(id, full_name, email, avatar_url)),
            discount_applications(
                *,
                discount:event_discounts(*)
            )
        `)
        .eq('user_id', userId) // Ensure user can only view their own bookings

    if (isUUID) {
        // If it's a UUID, search by id
        query = query.eq('id', bookingId)
    } else {
        // If it's a short booking ID, search by booking_id
        query = query.eq('booking_id', bookingId.toUpperCase())
    }

    const { data: booking, error } = await query.single()

    if (error || !booking) {
        return null
    }

    return booking as Booking & { event: Event; discount_applications?: DiscountApplication[] }
}

interface BookingDetailsPageProps {
    params: Promise<{ id: string }>
}

export default async function BookingDetailsPage({ params }: BookingDetailsPageProps) {
    const { id } = await params
    const profile = await getCurrentProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    const booking = await getBooking(id, profile.id)

    if (!booking) {
        notFound()
    }

    // Prepare calendar event data
    const calendarEvent: CalendarEvent = {
        title: booking.event.title,
        description: `${booking.event.description || ''}\n\nBooking ID: ${booking.booking_id || booking.id}\nTickets: ${booking.quantity}`,
        location: booking.event.location,
        startDate: new Date(booking.event.start_date),
        endDate: new Date(booking.event.end_date)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return 'bg-green-100 text-green-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'refunded':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return '✓'
            case 'pending':
                return '⏳'
            case 'cancelled':
                return '❌'
            case 'refunded':
                return '💰'
            default:
                return '❓'
        }
    }

    // Fetch participants for the booking
    const supabase = await createClient()
    const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

    return (
        <div className="bg-gray-50">
            {/* Breadcrumb */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-4">
                                <li>
                                    <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
                                        <span className="sr-only">Dashboard</span>
                                        🏠
                                    </Link>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2">/</span>
                                        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                                            My Bookings
                                        </Link>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mx-2">/</span>
                                        <span className="text-gray-900 font-medium truncate max-w-xs">
                                            {booking.booking_id || booking.id.slice(0, 8)}
                                        </span>
                                    </div>
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>

            <div className="py-4 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-indigo-50 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                        Booking Details
                                    </h1>
                                    <p className="text-lg text-gray-800">
                                        View your booking information and event details
                                    </p>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                                    {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="px-6 py-8">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                {/* Event Details */}
                                <div className="lg:col-span-3">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Event Details
                                    </h2>
                                    <div className="space-y-3">
                                        <div>
                                            <Link
                                                href={`/events/${booking.event.id}`}
                                                className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                                            >
                                                {booking.event.title}
                                            </Link>
                                            {booking.event.description && (
                                                <MarkdownContent
                                                    content={booking.event.description}
                                                    className="text-sm text-gray-800 mt-1"
                                                />
                                            )}
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
                                <div className="lg:col-span-1">
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
                                            <span>AUD ${(booking.total_amount / booking.quantity).toFixed(2)}</span>
                                        </div>
                                        
                                        {/* Discount Information */}
                                        {booking.discount_applications && booking.discount_applications.length > 0 && (
                                            <>
                                                <div className="border-t pt-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-800">Subtotal:</span>
                                                        <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                                    </div>
                                                    
                                                    {booking.discount_applications.map((discountApp, index) => (
                                                        <div key={index} className="flex justify-between text-green-600">
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
                                                    
                                                    <div className="border-t pt-2 mt-2">
                                                        <div className="flex justify-between font-semibold text-gray-800">
                                                            <span>Total Paid:</span>
                                                            <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* No discounts applied */}
                                        {(!booking.discount_applications || booking.discount_applications.length === 0) && (
                                            <div className="border-t pt-3">
                                                <div className="flex justify-between font-semibold text-gray-800">
                                                    <span>Total Paid:</span>
                                                    <span>AUD ${booking.total_amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Booking Date:</span>
                                            <span className="text-sm">
                                                {new Date(booking.booking_date || booking.created_at).toLocaleDateString()} at {new Date(booking.booking_date || booking.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location Map */}
                                    <div className="mt-6">
                                        <EventLocationMap 
                                            location={booking.event.location} 
                                            locationSettings={booking.event.location_settings}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Refund Information - Only show if refund policy exists */}
                            {booking.event.timeline?.refund && booking.event.timeline.refund.length > 0 && (
                                <div className="mt-10">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund Information</h2>
                                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                        {/* Refund Status */}
                                        <div className="mb-6">
                                            <h3 className="font-medium text-gray-900 mb-3">Current Refund Status</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Status:</span>
                                                    <span className={`font-medium ${booking.refund_status === 'none' ? 'text-gray-800' :
                                                        booking.refund_status === 'requested' ? 'text-yellow-600' :
                                                            booking.refund_status === 'processing' ? 'text-blue-600' :
                                                                booking.refund_status === 'completed' ? 'text-green-600' :
                                                                    'text-red-600'
                                                        }`}>
                                                        {booking.refund_status === 'none' ? 'No refund requested' :
                                                            booking.refund_status === 'requested' ? 'Refund requested' :
                                                                booking.refund_status === 'processing' ? 'Refund processing' :
                                                                    booking.refund_status === 'completed' ? 'Refund completed' :
                                                                        'Refund failed'}
                                                    </span>
                                                </div>
                                                {booking.refund_amount && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Refund Amount:</span>
                                                        <span className="font-medium text-gray-800">
                                                            AUD ${booking.refund_amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                {booking.refund_requested_at && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Requested At:</span>
                                                        <span className="text-gray-800">
                                                            {new Date(booking.refund_requested_at).toLocaleDateString()} at {new Date(booking.refund_requested_at).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Refund Policy Display */}
                                        <div className="mb-6">
                                            <RefundPolicyDisplay
                                                refundTimeline={booking.event.timeline.refund}
                                                eventStartDate={booking.event.start_date}
                                            />
                                        </div>

                                        {/* Refund Request Button */}
                                        <div className="pt-4 border-t border-gray-200">
                                            <RefundRequestButton booking={booking} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Participant Information */}
                            {participants && participants.length > 0 && (
                                <div className="mt-10">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Participant Information</h2>
                                    <div className="space-y-6">
                                        {participants.map((p, idx) => (
                                            <div key={p.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex items-center mb-2">
                                                    <span className="font-semibold text-gray-800 mr-2">Participant {idx + 1}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
                                                    <div><span className="font-medium">First Name:</span> {p.first_name}</div>
                                                    <div><span className="font-medium">Last Name:</span> {p.last_name}</div>
                                                    {p.date_of_birth && <div><span className="font-medium">Date of Birth:</span> {p.date_of_birth}</div>}
                                                    {p.contact_email && <div><span className="font-medium">Contact Email:</span> {p.contact_email}</div>}
                                                    {p.contact_phone && <div><span className="font-medium">Contact Phone:</span> {p.contact_phone}</div>}
                                                    {/* Custom fields */}
                                                    {p.custom_data && Object.entries(p.custom_data).map(([key, value]) => {
                                                        let displayValue: string

                                                        // Type guard for FIDE/ACF player object
                                                        function isPlayerObject(val: unknown): val is { id: string, name: string, std_rating?: number, rapid_rating?: number, blitz_rating?: number } {
                                                            return (
                                                                typeof val === 'object' && val !== null &&
                                                                'id' in val && typeof (val as { id: unknown }).id === 'string' &&
                                                                'name' in val && typeof (val as { name: unknown }).name === 'string' &&
                                                                'std_rating' in val
                                                            )
                                                        }

                                                        if (Array.isArray(value)) {
                                                            displayValue = value.join(', ')
                                                        } else if (isPlayerObject(value)) {
                                                            const ratings = []
                                                            if (value.std_rating) ratings.push(`Std: ${value.std_rating}`)
                                                            if (value.rapid_rating) ratings.push(`Rapid: ${value.rapid_rating}`)
                                                            if (value.blitz_rating) ratings.push(`Blitz: ${value.blitz_rating}`)
                                                            displayValue = `${value.name} (ID: ${value.id})${ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''}`
                                                        } else if (typeof value === 'object' && value !== null) {
                                                            displayValue = JSON.stringify(value)
                                                        } else {
                                                            displayValue = String(value)
                                                        }

                                                        return (
                                                            <div key={key}>
                                                                <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                                                                {/* Special handling for FIDE/ACF player objects with links */}
                                                                {isPlayerObject(value) ? (
                                                                    <span>
                                                                        {value.name} (ID:{' '}
                                                                        {key.toLowerCase().includes('fide') ? (
                                                                            <a
                                                                                href={`https://ratings.fide.com/profile/${value.id}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-600 hover:text-blue-800 underline"
                                                                            >
                                                                                {value.id}
                                                                            </a>
                                                                        ) : (
                                                                            value.id
                                                                        )}
                                                                        )
                                                                        {(() => {
                                                                            const ratings = []
                                                                            if (value.std_rating) ratings.push(`Std: ${value.std_rating}`)
                                                                            if (value.rapid_rating) ratings.push(`Rapid: ${value.rapid_rating}`)
                                                                            if (value.blitz_rating) ratings.push(`Blitz: ${value.blitz_rating}`)
                                                                            return ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''
                                                                        })()}
                                                                    </span>
                                                                ) : (
                                                                    displayValue
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Calendar Integration */}
                            {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium text-purple-900">Add to Your Calendar</h3>
                                        <AddToCalendar event={calendarEvent} />
                                    </div>
                                    <p className="text-sm text-purple-800">
                                        Don&apos;t miss your event! Add it to your calendar to get reminders.
                                    </p>
                                </div>
                            )}

                            {/* Event Guidelines */}
                            {(booking.status === 'confirmed' || booking.status === 'verified') && (
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <h3 className="font-medium text-blue-900 mb-2">Event Guidelines</h3>
                                    <ul className="text-sm text-blue-900 space-y-1">
                                        <li>• Arrive at the venue 15 minutes before the event starts</li>
                                        <li>• Bring a valid ID for entry verification</li>
                                        <li>• Keep this booking information handy for reference</li>
                                        <li>• Contact support if you need to make changes</li>
                                    </ul>
                                </div>
                            )}

                            {/* Pending Payment Notice */}
                            {booking.status === 'pending' && (
                                <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                                    <h3 className="font-medium text-yellow-900 mb-2">Payment Pending</h3>
                                    <p className="text-sm text-yellow-900">
                                        Your booking is pending payment confirmation. If you&apos;ve already paid,
                                        the status will update automatically once payment is processed.
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-8 space-y-3">
                                <Link
                                    href="/dashboard"
                                    className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    ← Back to My Bookings
                                </Link>
                                
                                {/* Contact Organizer Button */}
                                {booking.event.organizer && (
                                    <ContactOrganizerButton 
                                        event={booking.event}
                                        organizer={booking.event.organizer}
                                        bookingId={booking.id}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Widget - Only visible when not in booking journey */}
            {booking.event.organizer && (
                <ChatWidget 
                    event={booking.event}
                    organizer={booking.event.organizer}
                    bookingId={booking.id}
                />
            )}
        </div>
    )
}