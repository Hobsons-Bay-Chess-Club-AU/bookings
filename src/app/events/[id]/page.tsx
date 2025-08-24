import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/utils/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SocialShare from '@/components/events/social-share'
import EventStructuredData from '@/components/events/event-structured-data'
import EventQRCode from '@/components/events/event-qr-code'
import EventBookingSection from '@/components/events/event-booking-section'
import RefundPolicyDisplay from '@/components/events/refund-policy-display'
import EventLocationMap from '@/components/events/event-location-map'
import EventSectionsDisplay from '@/components/events/event-sections-display'
import EventChatClient from './event-chat-client'
import { Event } from '@/lib/types/database'
import MarkdownContent from '@/components/ui/html-content'
import { Metadata } from 'next'
import { HiCalendarDays, HiMapPin, HiUsers, HiCurrencyDollar } from 'react-icons/hi2'
import Image from 'next/image'
import { BookingWithProfile } from '@/lib/types/ui'
import { formatInTimezone } from '@/lib/utils/timezone'
import EventPageClient from './event-page-client'

class TimeoutError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TimeoutError'
    }
}

async function raceWithTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new TimeoutError(`Timed out after ${timeoutMs}ms`)), timeoutMs)
        Promise.resolve(promiseLike).then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (err) => {
                clearTimeout(timer)
                reject(err)
            }
        )
    })
}

async function getEvent(id: string): Promise<Event | null> {
    const supabase = await createClient()

    const TIMEOUT_MS = 5000
    const fetchQuery = () =>
        supabase
            .from('events')
            .select(`
                *,
                sections:event_sections(
                    *,
                    pricing:section_pricing(*)
                )
            `)
            .eq('id', id)
            .single()

    type EventQueryResp = { data: Event | null; error: { message?: string } | null }

    // Try once with timeout, then retry once if timed out
    try {
        const resp = (await raceWithTimeout(fetchQuery(), TIMEOUT_MS)) as EventQueryResp
        if (!resp || resp.error || !resp.data) {
            return null
        }
        
        // Calculate available seats for each section
        const event = resp.data
        if (event.sections) {
            event.sections = event.sections.map(section => ({
                ...section,
                available_seats: section.max_seats - section.current_seats
            }))
        }
        
        return event
    } catch (err) {
        if (err instanceof TimeoutError) {
            try {
                const resp = (await raceWithTimeout(fetchQuery(), TIMEOUT_MS)) as EventQueryResp
                if (!resp || resp.error || !resp.data) {
                    return null
                }
                
                // Calculate available seats for each section
                const event = resp.data
                if (event.sections) {
                    event.sections = event.sections.map(section => ({
                        ...section,
                        available_seats: section.max_seats - section.current_seats
                    }))
                }
                
                return event
            } catch {
                return null
            }
        }
        return null
    }
}


async function getEventParticipants(eventId: string): Promise<BookingWithProfile[]> {
    const supabase = await createClient()

    const TIMEOUT_MS = 5000
    const fetchQuery = () =>
        supabase
            .from('bookings')
            .select(`
                *,
                profile:profiles!bookings_user_id_fkey(*),
                participants(*)
            `)
            .eq('event_id', eventId)
            .in('status', ['confirmed', 'verified'])
            .order('created_at', { ascending: false })

    type ParticipantsQueryResp = { data: BookingWithProfile[] | null; error: { message?: string } | null }

    try {
        const resp = (await raceWithTimeout(fetchQuery(), TIMEOUT_MS)) as ParticipantsQueryResp
        if (!resp || resp.error) {
            return []
        }
        return (resp.data || []) as BookingWithProfile[]
    } catch (err) {
        if (err instanceof TimeoutError) {
            try {
                const resp = (await raceWithTimeout(fetchQuery(), TIMEOUT_MS)) as ParticipantsQueryResp
                if (!resp || resp.error) {
                    return []
                }
                return (resp.data || []) as BookingWithProfile[]
            } catch {
                return []
            }
        }
        return []
    }
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

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const eventUrl = event.alias
        ? `${siteUrl}/e/${event.alias}`
        : `${siteUrl}/events/${event.id}`



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
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical: eventUrl,
        },
        openGraph: {
            title,
            description,
            url: eventUrl,
            siteName: 'Hobsons Bay Chess Club',
            images: [
                {
                    url: `${siteUrl}/api/public/og/poster?title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(event.event_summary || event.description?.substring(0, 200) || '')}&date=${encodeURIComponent(new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}&time=${encodeURIComponent(`${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}&location=${encodeURIComponent(event.location)}&organizer=${encodeURIComponent(event.organizer_name || '')}&phone=${encodeURIComponent(event.organizer_phone || '')}&email=${encodeURIComponent(event.organizer_email || '')}&close=${encodeURIComponent(event.entry_close_date ? new Date(event.entry_close_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '')}&url=${encodeURIComponent(eventUrl)}&mapUrl=${encodeURIComponent(event.location_settings?.map_url || '')}`,
                    width: 1200,
                    height: 630,
                    alt: event.title,
                }
            ],
            locale: 'en_AU',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`${siteUrl}/api/public/og/poster?title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(event.event_summary || event.description?.substring(0, 200) || '')}&date=${encodeURIComponent(new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}&time=${encodeURIComponent(`${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}&location=${encodeURIComponent(event.location)}&organizer=${encodeURIComponent(event.organizer_name || '')}&phone=${encodeURIComponent(event.organizer_phone || '')}&email=${encodeURIComponent(event.organizer_email || '')}&close=${encodeURIComponent(event.entry_close_date ? new Date(event.entry_close_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '')}&url=${encodeURIComponent(eventUrl)}&mapUrl=${encodeURIComponent(event.location_settings?.map_url || '')}`],
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

export default async function EventPage({ params, searchParams }: EventPageProps & { searchParams: Promise<{ step?: string; resume?: string }> }) {
    const { id } = await params
    const { step, resume } = await searchParams
    const event = await getEvent(id)
    // User information is fetched but used in child components
    await getCurrentUser()
    const profile = await getCurrentProfile()

    if (!event) {
        notFound()
    }

    const participants = await getEventParticipants(event.id)

    // Fetch pricing range for display
    let priceDisplay: string = ''
    try {
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        const res = await fetch(`${siteUrl}/api/public/events/${event.id}/pricing?membership_type=all`, { cache: 'no-store' })
        if (res.ok) {
            const pricing: Array<{ price: number }> = await res.json()
            if (pricing && pricing.length > 0) {
                const prices = pricing.map(p => p.price).filter((p) => typeof p === 'number')
                if (prices.length > 0) {
                    const min = Math.min(...prices)
                    const max = Math.max(...prices)
                    priceDisplay = min === max ? (min === 0 ? 'Free' : `AUD $${min.toFixed(2)}`) : `From AUD $${min.toFixed(2)} - $${max.toFixed(2)}`
                }
            }
        }
    } catch {
        // ignore and fall back to base price below
    }
    if (!priceDisplay) {
        priceDisplay = event.price === 0 ? 'Contact organizer' : `AUD $${event.price.toFixed(2)}`
    }
    // For multi-section events, check if all sections are full
    const isEventFull = event.has_sections && event.sections && event.sections.length > 0
        ? event.sections.every(section => (section.available_seats ?? 0) === 0)
        : (event.max_attendees ? event.current_attendees >= event.max_attendees : false)
    const isEventPast = new Date(event.start_date) < new Date()

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            {/* Structured Data for SEO */}
            <EventStructuredData event={event} />

            <div className="max-w-9xl mx-auto py-2 md:py-12 px-2 md:px-4 sm:px-6 lg:px-8">
                <EventPageClient 
                    event={event} 
                    profile={profile || undefined}
                    initialStep={step}
                    resumeBookingId={resume}
                >
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

                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                    {event.title}
                                </h1>

                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                                        {event.status}
                                    </span>
                                    {isEventPast && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                            Past Event
                                        </span>
                                    )}
                                    {isEventFull && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                            Sold Out
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="space-y-4 flex-1 mr-6">
                                        <div className="flex items-center">
                                            <HiCalendarDays className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {formatInTimezone(event.start_date, event.timezone, 'EEEE, MMMM d, yyyy')}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatInTimezone(event.start_date, event.timezone, 'h:mm a')} - {formatInTimezone(event.end_date, event.timezone, 'h:mm a')} ({formatInTimezone(event.start_date, event.timezone, 'zzz')})
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <HiMapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                                            <p className="text-gray-900 dark:text-gray-100">{event.location}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <HiUsers className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                                            <div className="flex items-center space-x-2">
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {event.max_attendees ?
                                                        `${event.current_attendees} / ${event.max_attendees} attendees` :
                                                        `${event.current_attendees} attendees`
                                                    }
                                                </p>
                                                {event.settings?.show_participants_public && participants.length > 0 && (
                                                    <Link
                                                        href={`/events/${event.id}/participants`}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
                                                    >
                                                        View List →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <HiCurrencyDollar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                {priceDisplay}
                                            </p>
                                        </div>
                                    </div>

                                    {/* QR Code and Mobile Book Button */}
                                    <div className="flex-shrink-0">
                                        <EventQRCode event={event} size={120} />

                                        {/* Mobile Book Now Button - Only visible on mobile */}
                                        <div className="md:hidden mt-4">
                                            <EventBookingSection 
                                                event={event} 
                                                profile={profile || undefined} 
                                                initialStep={step}
                                                resumeBookingId={resume}
                                            />
                                        </div>

                                        {/* Desktop Book Now Button - Only visible on desktop */}
                                        <div className="hidden md:block mt-4">
                                            <EventBookingSection 
                                                event={event} 
                                                profile={profile || undefined} 
                                                initialStep={step}
                                                resumeBookingId={resume}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {isEventFull && event.settings?.whitelist_enabled && (
                                <div className="py-3 w-full text-xs text-amber-700 dark:text-amber-300 text-center px-2 leading-relaxed break-words">
                                    Event is full. New registrations will be placed on the whitelist.
                                </div>
                            )}
                            {event.description && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <MarkdownContent
                                        content={event.description}
                                        className="text-gray-700 dark:text-gray-300"
                                    />
                                </div>
                            )}

                            {/* Event Sections */}
                            {event.has_sections && event.sections && (
                                <EventSectionsDisplay 
                                    sections={event.sections} 
                                    eventTimezone={event.timezone}
                                />
                            )}

                            {/* Location Map */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                <EventLocationMap 
                                    location={event.location} 
                                    locationSettings={event.location_settings}
                                />
                            </div>

                            {event.timeline?.refund && (
                                <RefundPolicyDisplay
                                    refundTimeline={event.timeline.refund}
                                    eventStartDate={event.start_date}
                                />
                            )}

                            {(event.organizer_name || event.organizer_email || event.organizer_phone) && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                                        Organizer
                                    </h3>
                                    <div className="space-y-2">
                                        {event.organizer_name && (
                                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                                                {event.organizer_name}
                                            </p>
                                        )}
                                        {event.organizer_email && (
                                            <p className="text-gray-700 dark:text-gray-300">
                                                <span className="text-gray-500 dark:text-gray-400">Email:</span>{' '}
                                                <a 
                                                    href={`mailto:${event.organizer_email}`}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                                >
                                                    {event.organizer_email}
                                                </a>
                                            </p>
                                        )}
                                        {event.organizer_phone && (
                                            <p className="text-gray-700 dark:text-gray-300">
                                                <span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                                                <a 
                                                    href={`tel:${event.organizer_phone}`}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                                >
                                                    {event.organizer_phone}
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social Share Component */}
                        <SocialShare event={event} />
                    </div>
                </EventPageClient>
            </div>

            {/* Chat Widget - Only visible when not in booking journey */}
            {(event.organizer_name || event.organizer_email) && (
                <EventChatClient 
                    event={event} 
                    organizer={{
                        id: event.organizer_id,
                        full_name: event.organizer_name || '',
                        email: event.organizer_email || '',
                        phone: event.organizer_phone || undefined,
                        avatar_url: undefined,
                        role: 'organizer' as const,
                        created_at: '',
                        updated_at: ''
                    }} 
                />
            )}
            
            {/* Simple Chat Test */}
            {/* <SimpleChatTest /> */}
        </div>
    )
}