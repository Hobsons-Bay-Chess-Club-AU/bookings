import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatParticipantName } from '@/lib/utils/name-formatting'
import { HiDocumentText, HiReceiptRefund, HiArrowLeft, HiArrowDownTray } from 'react-icons/hi2'

interface DownloadPageProps {
    params: Promise<{ bookingId: string }>
}

export default async function DownloadPage({ params }: DownloadPageProps) {
    const { bookingId } = await params
    
    console.log('Download page accessed with bookingId:', bookingId)
    const supabase = await createClient()
    const profile = await getCurrentProfile()

    // Check if user is authenticated first
    if (!profile) {
        // Redirect to login with return URL to come back to this download page
        const returnUrl = encodeURIComponent(`/downloads/${bookingId}`)
        redirect(`/auth/login?redirectTo=${returnUrl}`)
    }

    // Get booking with event and participants
    // Check if the bookingId is a UUID (36 characters) or short booking ID (7 characters)
    const isUUID = bookingId.length === 36 && bookingId.includes('-')

    let query = supabase
        .from('bookings')
        .select(`
            *,
            events!bookings_event_id_fkey (*, organizer:profiles(*))
        `)

    if (isUUID) {
        // If it's a UUID, search by id
        query = query.eq('id', bookingId)
    } else {
        // If it's a short booking ID, search by booking_id
        query = query.eq('booking_id', bookingId.toUpperCase())
    }

    const { data: booking, error: bookingError } = await query.single()

    if (bookingError || !booking) {
        console.error('Booking not found:', { 
            bookingId: bookingId, 
            isUUID,
            error: bookingError 
        })
        notFound()
    }

    console.log('Booking found:', { 
        bookingId: booking.id, 
        shortId: booking.booking_id,
        eventTitle: booking.events?.title,
        userId: booking.user_id 
    })

    // Get participants for this booking
    console.log('🔍 [DOWNLOAD-PAGE] Fetching participants for booking:', booking.id)
    
    const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
            *,
            section:event_sections(*)
        `)
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

    console.log('🔍 [DOWNLOAD-PAGE] Participants query result:', {
        data: participants,
        error: participantsError,
        count: participants?.length || 0
    })

    if (participantsError) {
        console.error('❌ [DOWNLOAD-PAGE] Error fetching participants:', participantsError)
    }

    // Allow access if user is the booking owner, event organizer, or admin
    const isOwner = booking.user_id === profile.id
    const isOrganizer = booking.events.organizer_id === profile.id
    const isAdmin = profile.role === 'admin'

    if (!isOwner && !isOrganizer && !isAdmin) {
        console.log('Access denied - redirecting to unauthorized')
        redirect('/unauthorized')
    }

    // Check booking status - only allow verified or confirmed bookings
    if (booking.status !== 'verified' && booking.status !== 'confirmed') {
        console.log('Invalid booking status for download page access:', {
            bookingId: booking.id,
            status: booking.status,
            user: profile.id
        })
        
        // Redirect to booking details page with error message
        redirect(`/booking/${booking.id}?error=invalid_status`)
    }

    const event = booking.events
    const participantsList = participants || []

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                Downloads
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Download your tickets and receipt for {event.title}
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                            <HiArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Event Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                {event.title}
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date & Time:</span>
                                    <p className="text-gray-900 dark:text-gray-100">{formatDate(event.start_date)}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Location:</span>
                                    <p className="text-gray-900 dark:text-gray-100">{event.location}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Booking ID:</span>
                                    <p className="text-gray-900 dark:text-gray-100 font-mono">{booking.booking_id || booking.id}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        booking.status === 'verified' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    }`}>
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Participants ({participantsList.length})
                            </h3>
                            <div className="space-y-2">
                                {participantsList.map((participant, index) => (
                                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {formatParticipantName(participant)}
                                                {participant.section ? ` - ${participant.section.title}` : ''}
                                            </p>
                                            {participant.date_of_birth && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    DOB: {participant.date_of_birth}
                                                </p>
                                            )}
                                            {participant.section && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(participant.section.start_date).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    {participant.section.end_date ? ` - ${new Date(participant.section.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            Ticket {index + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Download Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Tickets Download */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <div className="text-center">
                            <div className="mb-6">
                                <HiDocumentText className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Event Tickets
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Download tickets for all participants with QR codes for entry verification.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <a
                                    target='_blank'
                                    href={`/api/tickets/${booking.id}`}
                                    className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl w-full justify-center"
                                >
                                    <HiArrowDownTray className="w-5 h-5 mr-2" />
                                    Download Tickets (PDF)
                                </a>

                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <p>• Each ticket includes a unique QR code</p>
                                    <p>• Print tickets and bring them to the event</p>
                                    <p>• Terms & conditions included</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Download */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <div className="text-center">
                            <div className="mb-6">
                                <HiReceiptRefund className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Payment Receipt
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Download a detailed receipt for your payment records and tax purposes.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <a
                                    target='_blank'
                                    href={`/api/receipts/${booking.id}`}
                                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl w-full justify-center"
                                >
                                    <HiArrowDownTray className="w-5 h-5 mr-2" />
                                    Download Receipt (PDF)
                                </a>

                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <p>• Professional receipt format</p>
                                    <p>• Includes all payment details</p>
                                    <p>• Suitable for tax records</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms & Conditions */}
                {event.terms_conditions && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Event Terms & Conditions
                        </h3>
                        <div className="prose dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                {event.terms_conditions}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
