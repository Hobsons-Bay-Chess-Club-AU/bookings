import EmailLayout from '../layout/EmailLayout'

interface BookingCancellationEmailProps {
    eventTitle: string
    eventDate: string
    participantName: string
    bookingId: string
    reason: string
}

export default function BookingCancellationEmail({
    eventTitle,
    eventDate,
    participantName,
    bookingId,
    reason
}: BookingCancellationEmailProps) {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <EmailLayout>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#dc2626', margin: '0', fontSize: '24px' }}>
                    Booking Cancelled
                </h1>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.5' }}>
                    We regret to inform you that your booking for the following event has been cancelled:
                </p>
            </div>

            <div style={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '20px', 
                marginBottom: '20px' 
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#111827' }}>
                    {eventTitle}
                </h2>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>
                    <strong>Date:</strong> {formattedDate}
                </p>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>
                    <strong>Participant:</strong> {participantName}
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                    <strong>Booking ID:</strong> {bookingId}
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.5' }}>
                    <strong>Reason:</strong> {reason}
                </p>
            </div>

            <div style={{ 
                backgroundColor: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '15px', 
                marginBottom: '20px' 
            }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#991b1b', lineHeight: '1.5' }}>
                    <strong>Important:</strong> If you have already made a payment, please contact the event organizer for information about refunds.
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                    If you have any questions about this cancellation, please contact the event organizer directly.
                </p>
            </div>

            <div style={{ 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '20px', 
                marginTop: '30px',
                textAlign: 'center' 
            }}>
                <p style={{ margin: '0', fontSize: '12px', color: '#9ca3af' }}>
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </EmailLayout>
    )
}
