import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ParticipantWithBooking {
    id: string
    first_name: string
    last_name: string
    middle_name?: string
    date_of_birth: string
    bookings: Array<{
        id: string
        event_id: string
        status: string
        booking_date: string
    }>
}

export async function POST(request: NextRequest) {
    try {
        const { eventId, participants } = await request.json()

        if (!eventId || !participants || !Array.isArray(participants)) {
            return NextResponse.json(
                { error: 'Event ID and participants array are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get event settings to check if duplicate prevention is enabled
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('settings')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        // Check if duplicate prevention is enabled (default to true)
        const preventDuplicates = event.settings?.prevent_duplicates ?? true

        const validationErrors: Array<{
            participantIndex: number
            error: string
        }> = []

        // Check each participant for validation issues
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i]

            if (!participant.first_name || !participant.last_name || !participant.date_of_birth) {
                continue
            }

            // 1. Check if participant is banned
            try {
                const { data: isBanned, error: banError } = await supabase.rpc('is_participant_banned', {
                    p_first_name: participant.first_name,
                    p_last_name: participant.last_name,
                    p_date_of_birth: participant.date_of_birth
                })

                if (banError) {
                    console.error('Error checking ban status:', banError)
                    // Continue with other validations if ban check fails
                } else if (isBanned) {
                    validationErrors.push({
                        participantIndex: i,
                        error: 'Sorry, we cannot process your entry right now. Please contact the event organizer.'
                    })
                    continue // Skip duplicate check if banned
                }
            } catch (error) {
                console.error('Error checking ban status:', error)
                // Continue with other validations if ban check fails
            }

            // 2. Check for duplicates if enabled
            if (preventDuplicates) {
                try {
                    // Get ALL participants for this event using a two-step approach
                    // First, get booking IDs for this event with active statuses
                    const { data: activeBookingIds, error: bookingIdsError } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('event_id', eventId)
                        .in('status', ['confirmed', 'verified', 'pending', 'whitelisted', 'pending_approval'])

                    if (bookingIdsError) {
                        console.error('Error getting booking IDs:', bookingIdsError)
                        // Continue if query fails
                    } else {
                        // Then get participants for those bookings
                        const bookingIds = activeBookingIds?.map((b: any) => b.id) || []
                        
                        const { data: allEventParticipants, error: allParticipantsError } = await supabase
                            .from('participants')
                            .select(`
                                id,
                                first_name,
                                last_name,
                                middle_name,
                                date_of_birth,
                                booking_id
                            `)
                            .in('booking_id', bookingIds)

                        if (allParticipantsError) {
                            console.error('Error getting all event participants:', allParticipantsError)
                            // Continue if query fails
                        } else {
                            // Find exact matches in the application logic
                            const exactMatches = (allEventParticipants as any[])?.filter(existing => {
                                // Check if names and DOB match
                                const nameMatch = existing.first_name?.trim() === participant.first_name?.trim() &&
                                                existing.last_name?.trim() === participant.last_name?.trim() &&
                                                existing.date_of_birth === participant.date_of_birth
                                
                                if (!nameMatch) return false
                                
                                // Check middle name match (normalize null/empty)
                                const existingMiddleName = existing.middle_name?.trim() || ''
                                const participantMiddleName = participant.middle_name?.trim() || ''
                                const middleNameMatch = existingMiddleName === participantMiddleName
                                
                                return nameMatch && middleNameMatch
                            }) || []

                            if (exactMatches.length > 0) {
                                const errorMessage = `${participant.first_name} ${participant.last_name} is already registered for this event. Each person can only register once.`
                                validationErrors.push({
                                    participantIndex: i,
                                    error: errorMessage
                                })
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error checking for duplicates:', error)
                    // Continue if duplicate check fails
                }
            }
        }

        return NextResponse.json({ 
            valid: validationErrors.length === 0,
            errors: validationErrors 
        })
    } catch (error) {
        console.error('Error validating participants:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
