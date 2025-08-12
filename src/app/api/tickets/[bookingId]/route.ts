import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TicketGenerator } from '@/lib/tickets/ticket-generator'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params
        console.log('Ticket API accessed with bookingId:', bookingId)
        const supabase = await createClient()
        const profile = await getCurrentProfile()

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
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            )
        }

        // Check if user has permission to access this booking
        if (!profile) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Allow access if user is the booking owner, event organizer, or admin
        const isOwner = booking.user_id === profile.id
        const isOrganizer = booking.events.organizer_id === profile.id
        const isAdmin = profile.role === 'admin'

        if (!isOwner && !isOrganizer && !isAdmin) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            )
        }

        // Check booking status - only allow verified or confirmed bookings
        if (booking.status !== 'verified' && booking.status !== 'confirmed') {
            console.log('Invalid booking status for ticket generation:', {
                bookingId: booking.id,
                status: booking.status,
                user: profile.id
            })
            
            console.log('Generating error PDF')
            // Generate error PDF instead of returning error response
            const errorPdfBuffer = await TicketGenerator.generateErrorPDF(
                'Tickets Not Available',
                `Tickets cannot be generated for this booking because it has a status of "${booking.status}". Tickets are only available for verified or confirmed bookings. Please contact the event organizer if you believe this is an error.`,
                booking.booking_id || booking.id
            )

            return new NextResponse(errorPdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="ticket-error-${booking.booking_id || booking.id}.pdf"`,
                    'Content-Length': errorPdfBuffer.length.toString()
                }
            })
        }

        // Get participants for this booking
        console.log('🔍 [TICKET-API] Fetching participants for booking:', booking.id)
        console.log('🔍 [TICKET-API] Booking details:', {
            id: booking.id,
            booking_id: booking.booking_id,
            status: booking.status,
            is_multi_section: booking.is_multi_section,
            quantity: booking.quantity
        })
        
        const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select(`
                *,
                section:event_sections(*)
            `)
            .eq('booking_id', booking.id)
            .order('created_at', { ascending: true })

        console.log('🔍 [TICKET-API] Participants query result:', {
            data: participants,
            error: participantsError,
            count: participants?.length || 0
        })

        if (participantsError) {
            console.error('❌ [TICKET-API] Error fetching participants:', participantsError)
            return NextResponse.json(
                { error: 'Failed to fetch participants' },
                { status: 500 }
            )
        }
        
        if (!participants || participants.length === 0) {
            console.log('❌ [TICKET-API] No participants found for booking:', booking.id)
            
            // Let's also check if there are any participants at all for this booking
            const { data: allParticipants, error: allParticipantsError } = await supabase
                .from('participants')
                .select('*')
                .eq('booking_id', booking.id)
            
            console.log('🔍 [TICKET-API] All participants check:', {
                allParticipants: allParticipants,
                allParticipantsError: allParticipantsError,
                count: allParticipants?.length || 0
            })
            
            return NextResponse.json(
                { error: 'No participants found for this booking' },
                { status: 404 }
            )
        }
        
        console.log('✅ [TICKET-API] Found participants:', participants.length, 'for booking:', booking.id)
        console.log('🔍 [TICKET-API] Participant details:', participants.map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            section_id: p.section_id,
            section: p.section
        })))
        
        // Generate PDF with all tickets
        const pdfBuffer = await TicketGenerator.generateAllTicketsPDF(
            booking.events,
            booking,
            participants,
            {
                includeTermsConditions: true,
                signatureLine: true
            }
        )

        // Return PDF as response
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="tickets-${booking.booking_id || booking.id}.pdf"`,
                'Content-Length': pdfBuffer.length.toString()
            }
        })

    } catch (error) {
        console.error('Error generating tickets:', error)
        return NextResponse.json(
            { error: 'Failed to generate tickets' },
            { status: 500 }
        )
    }
} 