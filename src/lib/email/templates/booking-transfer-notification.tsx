import React from 'react'

interface BookingTransferNotificationEmailProps {
    userName: string
    userEmail: string
    bookingId: string
    quantity: number
    totalAmount: number
    fromEventTitle: string
    fromEventDate: string
    fromEventLocation: string
    toEventTitle: string
    toEventDate: string
    toEventLocation: string
    transferReason: string
    transferNotes?: string
    adminName: string
    transferredAt: string
}

export default function BookingTransferNotificationEmail({
    userName,
    userEmail,
    bookingId,
    quantity,
    totalAmount,
    fromEventTitle,
    fromEventDate,
    fromEventLocation,
    toEventTitle,
    toEventDate,
    toEventLocation,
    transferReason,
    transferNotes,
    adminName,
    transferredAt
}: BookingTransferNotificationEmailProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <div style={{ backgroundColor: '#1f2937', color: 'white', padding: '30px', textAlign: 'center' }}>
                <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>🎫 Booking Transfer Confirmation</h1>
                <p style={{ margin: '10px 0 0 0', opacity: '0.9' }}>Your booking has been successfully transferred</p>
            </div>

            {/* Main Content */}
            <div style={{ backgroundColor: 'white', padding: '40px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginBottom: '20px' }}>
                    Hello {userName},
                </p>

                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginBottom: '20px' }}>
                    Your booking has been transferred to a different event. Here are the details of the change:
                </p>

                {/* Transfer Summary */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>📋 Transfer Summary</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#374151' }}>Booking ID:</strong>
                        <span style={{ color: '#6b7280', marginLeft: '10px', fontFamily: 'monospace' }}>
                            {bookingId}
                        </span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#374151' }}>Tickets:</strong>
                        <span style={{ color: '#6b7280', marginLeft: '10px' }}>
                            {quantity} ticket{quantity > 1 ? 's' : ''}
                        </span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#374151' }}>Total Amount:</strong>
                        <span style={{ color: '#6b7280', marginLeft: '10px' }}>
                            AUD ${totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Event Transfer Details */}
                <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft: '4px solid #3b82f6' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1e40af', fontSize: '18px' }}>🔄 Event Transfer Details</h3>
                    
                    {/* From Event */}
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#dc2626', fontSize: '16px' }}>From Event:</h4>
                        <div style={{ color: '#374151' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{fromEventTitle}</div>
                            <div style={{ fontSize: '14px', marginBottom: '3px' }}>📅 {formatDate(fromEventDate)}</div>
                            <div style={{ fontSize: '14px', marginBottom: '3px' }}>🕒 {formatTime(fromEventDate)}</div>
                            <div style={{ fontSize: '14px' }}>📍 {fromEventLocation}</div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div style={{ textAlign: 'center', margin: '15px 0', fontSize: '24px' }}>⬇️</div>

                    {/* To Event */}
                    <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '6px', borderLeft: '4px solid #22c55e' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#16a34a', fontSize: '16px' }}>To Event:</h4>
                        <div style={{ color: '#374151' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{toEventTitle}</div>
                            <div style={{ fontSize: '14px', marginBottom: '3px' }}>📅 {formatDate(toEventDate)}</div>
                            <div style={{ fontSize: '14px', marginBottom: '3px' }}>🕒 {formatTime(toEventDate)}</div>
                            <div style={{ fontSize: '14px' }}>📍 {toEventLocation}</div>
                        </div>
                    </div>
                </div>

                {/* Transfer Reason */}
                <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#92400e', fontSize: '18px' }}>💡 Transfer Reason</h3>
                    <p style={{ margin: '0', color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                        {transferReason}
                    </p>
                    {transferNotes && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                            <strong style={{ color: '#92400e' }}>Additional Notes:</strong>
                            <p style={{ margin: '5px 0 0 0', color: '#374151', fontSize: '14px' }}>
                                {transferNotes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <a 
                        href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`}
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '12px 24px',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            marginRight: '15px'
                        }}
                    >
                        View My Bookings
                    </a>
                    <a 
                        href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${toEventTitle.toLowerCase().replace(/\s+/g, '-')}`}
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: '12px 24px',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold'
                        }}
                    >
                        View New Event
                    </a>
                </div>

                {/* Important Notice */}
                <div style={{ backgroundColor: '#fef2f2', padding: '15px', borderRadius: '6px', marginBottom: '30px', borderLeft: '4px solid #ef4444' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#dc2626', fontSize: '16px' }}>⚠️ Important Notice</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#374151', fontSize: '14px' }}>
                        <li>Your booking is now confirmed for the new event</li>
                        <li>No additional payment is required</li>
                        <li>Please update your calendar with the new event details</li>
                        <li>Contact us if you have any questions about the transfer</li>
                    </ul>
                </div>

                {/* Footer Information */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginTop: '30px' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                        <strong>Transferred by:</strong> {adminName}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                        <strong>Transfer date:</strong> {new Date(transferredAt).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
                        If you did not expect this transfer or have any concerns, please contact our support team immediately.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div style={{ backgroundColor: '#f3f4f6', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                    This is an automated notification from the booking system.
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
                    Please do not reply to this email.
                </p>
            </div>
        </div>
    )
} 