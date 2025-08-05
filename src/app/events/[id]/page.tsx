import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/utils/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SocialShare from '@/components/events/social-share'
import EventStructuredData from '@/components/events/event-structured-data'
import EventQRCode from '@/components/events/event-qr-code'
import EventBookingSection from '@/components/events/event-booking-section'
import EventLayout from '@/components/events/event-layout'
import RefundPolicyDisplay from '@/components/events/refund-policy-display'
import ChatWidget from '@/components/messaging/chat-widget'
import EventChatClient from './event-chat-client'
import { Event, Booking, Profile } from '@/lib/types/database'
import MarkdownContent from '@/components/ui/html-content'
import { Metadata } from 'next'
import { HiCalendarDays, HiMapPin, HiUsers, HiCurrencyDollar } from 'react-icons/hi2'
import Image from 'next/image'
import { BookingWithProfile } from '@/lib/types/ui'

async function getEvent(id: string): Promise<Event | null> {
    const supabase = await createClient()

    const { data: event, error } = await supabase
        .from('events')
        .select(`
      *,
      organizer:profiles(id, full_name, email, avatar_url)
    `)
        .eq('id', id)
        .single()

    if (error || !event) {
        return null
    }

    return event
}


async function getEventParticipants(eventId: string): Promise<BookingWithProfile[]> {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            profile:profiles!bookings_user_id_fkey(*),
            participants(*)
        `)
        .eq('event_id', eventId)
        .in('status', ['confirmed', 'verified'])
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching participants:', error)
        return []
    }

    return (bookings || []) as BookingWithProfile[]
}

interface EventPageProps {
    params: Promise<{ id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { id } = await params
    const event = await getEvent(id)

    if (!event) {
        return {
            title: 'Event Not Found',
            description: 'The requested event could not be found.'
        }
    }

    const title = `${event.title} | Hobsons Bay Chess Club Events`
    const description = event.description
        ? event.description.substring(0, 160).replace(/[#*`]/g, '').trim() + (event.description.length > 160 ? '...' : '')
        : `Join us for ${event.title} at ${event.location} on ${new Date(event.start_date).toLocaleDateString()}`

    const eventUrl = event.alias
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/e/${event.alias}`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/events/${event.id}`

    const startDate = new Date(event.start_date).toISOString()
    const endDate = new Date(event.end_date).toISOString()

    return {
        title,
        description,
        keywords: [
            'chess',
            'chess club',
            'hobsons bay',
            'chess tournament',
            'chess event',
            'melbourne chess',
            event.title.toLowerCase(),
            event.location.toLowerCase()
        ].join(', '),
        authors: [{ name: 'Hobsons Bay Chess Club' }],
        creator: 'Hobsons Bay Chess Club',
        publisher: 'Hobsons Bay Chess Club',
        formatDetection: {
            email: false,
            address: false,
            telephone: false,
        },
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'),
        alternates: {
            canonical: eventUrl,
        },
        openGraph: {
            title,
            description,
            url: eventUrl,
            siteName: 'Hobsons Bay Chess Club',
            images: event.image_url ? [
                {
                    url: event.image_url,
                    width: 1200,
                    height: 630,
                    alt: event.title,
                }
            ] : [
                {
                    url: '/og-default.jpg', // You'll need to add a default OG image
                    width: 1200,
                    height: 630,
                    alt: 'Hobsons Bay Chess Club Event',
                }
            ],
            locale: 'en_AU',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            creator: '@HobsonsBayChess', // Update with your actual Twitter handle
            images: event.image_url ? [event.image_url] : ['/og-default.jpg'],
        },
        robots: {
            index: event.status === 'published',
            follow: true,
            googleBot: {
                index: event.status === 'published',
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        other: {
            // Event-specific structured data
            'event:start_time': startDate,
            'event:end_time': endDate,
            'event:location': event.location,
            'event:price': event.price.toString(),
            'event:currency': 'AUD',
        }
    }
}

export default async function EventPage({ params }: EventPageProps) {
    const { id } = await params
    const event = await getEvent(id)
    // User information is fetched but used in child components
    await getCurrentUser()
    const profile = await getCurrentProfile()

    if (!event) {
        notFound()
    }

    const participants = await getEventParticipants(event.id)
    const isEventFull = event.max_attendees ? event.current_attendees >= event.max_attendees : false
    const isEventPast = new Date(event.start_date) < new Date()

    return (
        <div className="bg-gray-50">
            {/* Structured Data for SEO */}
            <EventStructuredData event={event} />

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <EventLayout event={event} profile={profile || undefined}>
                    {/* Event Details */}
                    <div>
                        {event.image_url && (
                            <div className="aspect-w-16 aspect-h-9 mb-8">
                                <Image
                                    className="w-full h-64 object-cover rounded-lg"
                                    src={event.image_url}
                                    alt={event.title}
                                    width={800}
                                    height={400}
                                    priority
                                    style={{ objectFit: 'cover' }}
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

                                <div className="flex justify-between items-start">
                                    <div className="space-y-4 flex-1 mr-6">
                                        <div className="flex items-center">
                                            <HiCalendarDays className="h-5 w-5 text-gray-400 mr-3" />
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
                                            <HiMapPin className="h-5 w-5 text-gray-400 mr-3" />
                                            <p className="text-gray-900">{event.location}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <HiUsers className="h-5 w-5 text-gray-400 mr-3" />
                                            <div className="flex items-center space-x-2">
                                                <p className="text-gray-900">
                                                    {event.max_attendees ?
                                                        `${event.current_attendees} / ${event.max_attendees} attendees` :
                                                        `${event.current_attendees} attendees`
                                                    }
                                                </p>
                                                {event.settings?.show_participants_public && participants.length > 0 && (
                                                    <Link
                                                        href={`/events/${event.id}/participants`}
                                                        className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                                    >
                                                        View List →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <HiCurrencyDollar className="h-5 w-5 text-gray-400 mr-3" />
                                            <p className="text-2xl font-bold text-gray-900">
                                                {event.price === 0 ? 'Free' : `AUD $${event.price.toFixed(2)}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* QR Code and Mobile Book Button */}
                                    <div className="flex-shrink-0">
                                        <EventQRCode event={event} size={120} />

                                        {/* Mobile Book Now Button - Only visible on mobile */}
                                        <div className="md:hidden mt-4">
                                            <EventBookingSection event={event} profile={profile || undefined} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {event.description && (
                                <div className="border-t pt-6">
                                    <MarkdownContent
                                        content={event.description}
                                        className="text-gray-700"
                                    />
                                </div>
                            )}

                            {event.timeline?.refund && (
                                <RefundPolicyDisplay
                                    refundTimeline={event.timeline.refund}
                                    eventStartDate={event.start_date}
                                />
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

                        {/* Social Share Component */}
                        <SocialShare event={event} />
                    </div>
                </EventLayout>
            </div>

            {/* Chat Widget - Only visible when not in booking journey */}
            {event.organizer && (
                <EventChatClient 
                    event={event} 
                    organizer={event.organizer} 
                />
            )}
            
            {/* Simple Chat Test */}
            {/* <SimpleChatTest /> */}
        </div>
    )
}