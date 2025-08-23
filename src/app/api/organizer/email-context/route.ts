import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

interface EmailRecipient {
    email: string
    name: string
    type: 'user' | 'participant'
    source: string
}

interface BookingData {
    id: string
    booking_id?: string
    user?: {
        email: string
        full_name?: string
    }
    event?: {
        organizer_id: string
    }
}

interface ParticipantData {
    id: string
    first_name: string
    middle_name?: string
    last_name: string
    contact_email?: string
    booking?: {
        id: string
        booking_id?: string
        event?: {
            organizer_id: string
        }
        user?: {
            email: string
            full_name?: string
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user is organizer or admin
        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { input, contextKey, contextValue } = await request.json()

        // If contextKey and contextValue are provided, use direct lookup
        if (contextKey && contextValue) {
            const trimmedValue = contextValue.trim()
            const supabase = await createClient()

            console.log('[API] Direct lookup - Key:', contextKey, 'Value:', trimmedValue)
            console.log('[API] User profile:', { id: profile.id, role: profile.role })

            try {
                switch (contextKey) {
                    case 'eventId':
                        const { data: event } = await supabase
                            .from('events')
                            .select(`
                                *,
                                organizer:profiles!events_organizer_id_fkey(*)
                            `)
                            .eq('id', trimmedValue)
                            .single()

                        if (event && (event.organizer_id === profile.id || profile.role === 'admin')) {
                            console.log('[API] Found event:', event.id)
                            const recipients = await loadEventRecipients(supabase, trimmedValue)
                            return NextResponse.json({
                                success: true,
                                context: { event },
                                recipients
                            })
                        }
                        break

                    case 'bookingId':
                        const { data: booking } = await supabase
                            .from('bookings')
                            .select(`
                                *,
                                event:events!bookings_event_id_fkey(*),
                                user:profiles!bookings_user_id_fkey(*)
                            `)
                            .eq('id', trimmedValue)
                            .single()

                        if (booking && (booking.event?.organizer_id === profile.id || profile.role === 'admin')) {
                            console.log('[API] Found booking:', booking.id)
                            const recipients = await loadBookingRecipients(supabase, trimmedValue)
                            return NextResponse.json({
                                success: true,
                                context: { booking },
                                recipients
                            })
                        }
                        break

                    case 'participantId':
                        const { data: participant } = await supabase
                            .from('participants')
                            .select(`
                                *,
                                booking:bookings(
                                    *,
                                    event:events!bookings_event_id_fkey(*),
                                    user:profiles!bookings_user_id_fkey(*)
                                )
                            `)
                            .eq('id', trimmedValue)
                            .single()

                        if (participant && (participant.booking?.event?.organizer_id === profile.id || profile.role === 'admin')) {
                            console.log('[API] Found participant:', participant.id)
                            const recipients = loadParticipantRecipients(participant)
                            return NextResponse.json({
                                success: true,
                                context: { participant },
                                recipients
                            })
                        }
                        break

                    default:
                        console.log('[API] Unknown context key, falling back to auto-detection:', contextKey)
                }
            } catch (error) {
                console.error('[API] Error in direct lookup:', error)
                return NextResponse.json({
                    success: true,
                    context: {},
                    recipients: []
                })
            }
        }

        // Fallback to legacy input-based auto-detection
        if (!input || !input.trim()) {
            return NextResponse.json({
                success: true,
                context: {},
                recipients: []
            })
        }

        const trimmedInput = input.trim()
        const supabase = await createClient()

        console.log('[API] Fallback auto-detection for input:', trimmedInput)
        console.log('[API] User profile:', { id: profile.id, role: profile.role })

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        console.log('[API] UUID pattern test:', uuidPattern.test(trimmedInput))
        
        if (uuidPattern.test(trimmedInput)) {
            // Try event first
            const { data: event } = await supabase
                .from('events')
                .select(`
                    *,
                    organizer:profiles!events_organizer_id_fkey(*)
                `)
                .eq('id', trimmedInput)
                .single()

            if (event) {
                // Check if user owns this event or is admin
                if (event.organizer_id === profile.id || profile.role === 'admin') {
                    const recipients = await loadEventRecipients(supabase, trimmedInput)
                    return NextResponse.json({
                        success: true,
                        context: { event },
                        recipients
                    })
                }
            }

            // Try booking
            const { data: booking } = await supabase
                .from('bookings')
                .select(`
                    *,
                    event:events(*),
                    user:profiles!bookings_user_id_fkey(*)
                `)
                .eq('id', trimmedInput)
                .single()

            if (booking) {
                // Check if user owns the event this booking belongs to or is admin
                if (booking.event?.organizer_id === profile.id || profile.role === 'admin') {
                    const recipients = await loadBookingRecipients(supabase, trimmedInput)
                    return NextResponse.json({
                        success: true,
                        context: { booking },
                        recipients
                    })
                }
            }

            // Try participant
            console.log('[API] Trying participant lookup for:', trimmedInput)
            const { data: participant, error: participantError } = await supabase
                .from('participants')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        event:events!bookings_event_id_fkey(*),
                        user:profiles!bookings_user_id_fkey(*)
                    )
                `)
                .eq('id', trimmedInput)
                .single()

            console.log('[API] Participant query result:', { participant, participantError })

            if (participant) {
                console.log('[API] Found participant:', {
                    participantId: participant.id,
                    eventOrganizerID: participant.booking?.event?.organizer_id,
                    currentUserId: profile.id,
                    userRole: profile.role
                })
                
                // Check if user owns the event this participant belongs to or is admin
                if (participant.booking?.event?.organizer_id === profile.id || profile.role === 'admin') {
                    console.log('[API] Authorization passed, generating recipients')
                    const recipients = loadParticipantRecipients(participant)
                    console.log('[API] Generated recipients:', recipients)
                    return NextResponse.json({
                        success: true,
                        context: { participant },
                        recipients
                    })
                } else {
                    console.log('[API] Authorization failed - user does not own this event')
                }
            } else {
                console.log('[API] No participant found')
            }
        }

        // Try booking ID pattern (if different from UUID)
        const { data: bookingByBookingId } = await supabase
            .from('bookings')
            .select(`
                *,
                event:events(*),
                user:profiles!bookings_user_id_fkey(*)
            `)
            .eq('booking_id', trimmedInput)
            .single()

        if (bookingByBookingId) {
            // Check if user owns the event this booking belongs to or is admin
            if (bookingByBookingId.event?.organizer_id === profile.id || profile.role === 'admin') {
                const recipients = await loadBookingRecipients(supabase, bookingByBookingId.id)
                return NextResponse.json({
                    success: true,
                    context: { booking: bookingByBookingId },
                    recipients
                })
            }
        }

        // Try event alias
        const { data: eventByAlias } = await supabase
            .from('events')
            .select(`
                *,
                organizer:profiles!events_organizer_id_fkey(*)
            `)
            .eq('alias', trimmedInput)
            .single()

        if (eventByAlias) {
            // Check if user owns this event or is admin
            if (eventByAlias.organizer_id === profile.id || profile.role === 'admin') {
                const recipients = await loadEventRecipients(supabase, eventByAlias.id)
                return NextResponse.json({
                    success: true,
                    context: { event: eventByAlias },
                    recipients
                })
            }
        }

        // Try email address
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailPattern.test(trimmedInput)) {
            const { data: user } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', trimmedInput)
                .single()

            if (user) {
                return NextResponse.json({
                    success: true,
                    context: { user },
                    recipients: [{
                        email: user.email,
                        name: user.full_name || user.email,
                        type: 'user',
                        source: 'User Profile'
                    }]
                })
            }
        }

        // If nothing found, return empty context
        console.log('[API] No context found for input:', trimmedInput)
        return NextResponse.json({
            success: true,
            context: {},
            recipients: []
        })

    } catch (error) {
        console.error('Error in email-context API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function loadEventRecipients(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string): Promise<EmailRecipient[]> {
    try {
        const { data: bookings } = await supabase
            .from('bookings')
            .select(`
                *,
                user:profiles!bookings_user_id_fkey(email, full_name)
            `)
            .eq('event_id', eventId)
            .in('status', ['confirmed', 'pending', 'whitelisted'])

        const { data: participants } = await supabase
            .from('participants')
            .select(`
                *,
                booking:bookings!participants_booking_id_fkey(
                    event_id,
                    user:profiles!bookings_user_id_fkey(email, full_name)
                )
            `)
            .eq('booking.event_id', eventId)
            .in('status', ['active', 'whitelisted'])

        const recipientSet = new Set<string>()
        const recipients: EmailRecipient[] = []

        // Add booking users
        bookings?.forEach((booking: BookingData) => {
            if (booking.user?.email && !recipientSet.has(booking.user.email)) {
                recipientSet.add(booking.user.email)
                recipients.push({
                    email: booking.user.email,
                    name: booking.user.full_name || booking.user.email,
                    type: 'user',
                    source: `Booking ${booking.booking_id || booking.id}`
                })
            }
        })

        // Add participants
        participants?.forEach((participant: ParticipantData) => {
            const email = participant.contact_email || participant.booking?.user?.email
            if (email && !recipientSet.has(email)) {
                recipientSet.add(email)
                recipients.push({
                    email,
                    name: participant.first_name && participant.last_name 
                        ? `${participant.first_name} ${participant.last_name}`
                        : participant.booking?.user?.full_name || email,
                    type: 'participant',
                    source: `Participant ${participant.id}`
                })
            }
        })

        return recipients
    } catch (error) {
        console.error('Error loading event recipients:', error)
        return []
    }
}

async function loadBookingRecipients(supabase: Awaited<ReturnType<typeof createClient>>, bookingId: string): Promise<EmailRecipient[]> {
    try {
        const { data: booking } = await supabase
            .from('bookings')
            .select(`
                *,
                user:profiles!bookings_user_id_fkey(email, full_name)
            `)
            .eq('id', bookingId)
            .single()

        const { data: participants } = await supabase
            .from('participants')
            .select(`*`)
            .eq('booking_id', bookingId)

        const recipientSet = new Set<string>()
        const recipients: EmailRecipient[] = []

        // Add booking user
        if (booking?.user?.email && !recipientSet.has(booking.user.email)) {
            recipientSet.add(booking.user.email)
            recipients.push({
                email: booking.user.email,
                name: booking.user.full_name || booking.user.email,
                type: 'user',
                source: `Booking ${booking.booking_id || booking.id}`
            })
        }

        // Add participants
        participants?.forEach((participant: ParticipantData) => {
            const email = participant.contact_email || booking?.user?.email
            if (email && !recipientSet.has(email)) {
                recipientSet.add(email)
                recipients.push({
                    email,
                    name: participant.first_name && participant.last_name 
                        ? `${participant.first_name} ${participant.last_name}`
                        : booking?.user?.full_name || email,
                    type: 'participant',
                    source: `Participant ${participant.id}`
                })
            }
        })

        return recipients
    } catch (error) {
        console.error('Error loading booking recipients:', error)
        return []
    }
}

function loadParticipantRecipients(participant: ParticipantData): EmailRecipient[] {
    const email = participant.contact_email || participant.booking?.user?.email
    if (email) {
        return [{
            email,
            name: participant.first_name && participant.last_name 
                ? (participant.middle_name ? `${participant.first_name} ${participant.middle_name} ${participant.last_name}` : `${participant.first_name} ${participant.last_name}`)
                : participant.booking?.user?.full_name || email,
            type: 'participant' as const,
            source: `Participant ${participant.id}`
        }]
    }
    return []
}


