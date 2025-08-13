import { NextRequest, NextResponse } from 'next/server'
import { ReceiptGenerator } from '@/lib/receipt/receipt-generator'
import { Event, Booking, Participant } from '@/lib/types/database'

export async function GET() {
    try {
        // Create mock data for testing
        const mockEvent: Event = {
            id: 'test-event-1',
            title: 'Test Chess Tournament',
            description: 'A test chess tournament',
            start_date: '2024-12-25T10:00:00Z',
            end_date: '2024-12-25T18:00:00Z',
            location: 'Test Chess Club',
            price: 50,
            current_attendees: 10,
            status: 'published',
            organizer_id: 'test-organizer',
            organizer_name: 'Test Organizer',
            organizer_email: 'organizer@test.com',
            timezone: 'Australia/Melbourne',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }

        const mockBooking: Booking = {
            id: 'test-booking-1',
            booking_id: 'BK-12345',
            event_id: 'test-event-1',
            user_id: 'test-user-1',
            quantity: 2,
            total_amount: 100,
            status: 'confirmed',
            refund_status: 'none',
            booking_date: '2024-12-20T10:00:00Z',
            is_multi_section: false,
            created_at: '2024-12-20T10:00:00Z',
            updated_at: '2024-12-20T10:00:00Z'
        }

        const mockParticipants: Participant[] = [
            {
                id: 'participant-1',
                booking_id: 'test-booking-1',
                first_name: 'John',
                last_name: 'Doe',
                contact_email: 'john@example.com',
                created_at: '2024-12-20T10:00:00Z',
                updated_at: '2024-12-20T10:00:00Z'
            },
            {
                id: 'participant-2',
                booking_id: 'test-booking-1',
                first_name: 'Jane',
                last_name: 'Smith',
                contact_email: 'jane@example.com',
                created_at: '2024-12-20T10:00:00Z',
                updated_at: '2024-12-20T10:00:00Z'
            }
        ]

        // Generate receipt
        const receiptBuffer = await ReceiptGenerator.generateReceiptPDF(
            mockEvent,
            mockBooking,
            mockParticipants,
            'Credit Card'
        )

        // Return the PDF as a response
        return new NextResponse(receiptBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="test-receipt.pdf"'
            }
        })
    } catch (error) {
        console.error('Error generating test receipt:', error)
        return NextResponse.json(
            { error: 'Failed to generate receipt' },
            { status: 500 }
        )
    }
}
