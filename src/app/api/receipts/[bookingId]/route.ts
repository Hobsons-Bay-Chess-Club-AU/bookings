import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { ReceiptGenerator } from '@/lib/receipt/receipt-generator'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // Check if the bookingId is a UUID (36 characters) or short booking ID (7 characters)
        const isUUID = bookingId.length === 36 && bookingId.includes('-')

        let query = supabase
            .from('bookings')
            .select(`
                *,
                event:events!bookings_event_id_fkey(*, organizer:profiles(*))
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
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        // Check if user has access to this booking
        const isOwner = booking.user_id === profile.id
        const isOrganizer = booking.event.organizer_id === profile.id
        const isAdmin = profile.role === 'admin'

        if (!isOwner && !isOrganizer && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Get participants for this booking
        const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select(`
                *,
                section:event_sections(*)
            `)
            .eq('booking_id', booking.id)
            .order('created_at', { ascending: true })

        if (participantsError) {
            console.error('Error fetching participants:', participantsError)
            return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
        }

        // Generate receipt
        const receiptBuffer = await ReceiptGenerator.generateReceiptPDF(
            booking.event,
            booking,
            participants || [],
            'Credit Card'
        )

        // Generate filename
        const eventDate = new Date(booking.event.start_date)
        const filename = `receipt_${booking.booking_id || booking.id}_${eventDate.toISOString().slice(0, 10)}.pdf`

        // Return the PDF as a response
        return new NextResponse(receiptBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error) {
        console.error('Error generating receipt:', error)
        return NextResponse.json(
            { error: 'Failed to generate receipt' },
            { status: 500 }
        )
    }
}
