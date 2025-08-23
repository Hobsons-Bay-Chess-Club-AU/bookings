import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailHeading, EmailText, EmailSection, EmailCard, EmailButton } from '../layout/EmailLayout'

interface ParticipantWithdrawalEmailData {
    bookingId: string
    eventName: string
    eventDate: string
    eventLocation: string
    participantName: string
    withdrawnBy: 'user' | 'organizer'
    reason?: string
    refundAmount?: number
    refundPercentage?: number
    bookingCancelled: boolean
    remainingParticipants?: Array<{
        first_name: string
        last_name: string
    }>
    organizerName: string
    organizerEmail: string
    organizerPhone?: string
    dashboardUrl?: string
}

export function ParticipantWithdrawalEmail({
    bookingId,
    eventName,
    eventDate,
    eventLocation,
    participantName,
    withdrawnBy,
    reason,
    refundAmount,
    refundPercentage,
    bookingCancelled,
    remainingParticipants = [],
    organizerName,
    organizerEmail,
    organizerPhone,
    dashboardUrl
}: ParticipantWithdrawalEmailData) {
    const eventDateFormatted = new Date(eventDate).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <EmailLayout>
            <EmailHeading level={1}>
                {bookingCancelled ? 'Booking Cancelled' : 'Participant Withdrawn'}
            </EmailHeading>
            
            <EmailText style={{ marginBottom: '20px' }}>
                {bookingCancelled 
                    ? `We're writing to inform you that your booking for ${eventName} has been cancelled due to participant withdrawal.`
                    : `We're writing to inform you that a participant has been withdrawn from your booking for ${eventName}.`
                }
            </EmailText>

            {/* Event Details */}
            <EmailCard backgroundColor="#f9fafb" borderColor="#e5e7eb">
                <EmailHeading level={3}>Event Details</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Event:</strong> {eventName}
                </EmailText>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Date & Time:</strong> {eventDateFormatted}
                </EmailText>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Location:</strong> {eventLocation}
                </EmailText>
                <EmailText style={{ marginBottom: '0' }}>
                    <strong>Booking ID:</strong> {bookingId}
                </EmailText>
            </EmailCard>

            {/* Withdrawal Details */}
            <EmailCard backgroundColor="#fef3c7" borderColor="#f59e0b">
                <EmailHeading level={3}>Withdrawal Details</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Withdrawn Participant:</strong> {participantName}
                </EmailText>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Withdrawn By:</strong> {withdrawnBy === 'user' ? 'Participant/Booker' : 'Event Organizer'}
                </EmailText>
                {reason && (
                    <EmailText style={{ marginBottom: '10px' }}>
                        <strong>Reason:</strong> {reason}
                    </EmailText>
                )}
                {refundAmount && refundAmount > 0 && (
                    <>
                        <EmailText style={{ marginBottom: '10px' }}>
                            <strong>Refund Amount:</strong> ${refundAmount.toFixed(2)}
                        </EmailText>
                        {refundPercentage && (
                            <EmailText style={{ marginBottom: '0' }}>
                                <strong>Refund Percentage:</strong> {refundPercentage}%
                            </EmailText>
                        )}
                    </>
                )}
            </EmailCard>

            {/* Remaining Participants or Cancellation Notice */}
            {bookingCancelled ? (
                <EmailCard backgroundColor="#fee2e2" borderColor="#ef4444">
                    <EmailHeading level={3}>Booking Cancelled</EmailHeading>
                    <EmailText style={{ marginBottom: '15px' }}>
                        Since this was the only participant in your booking, the entire booking has been cancelled.
                    </EmailText>
                    {refundAmount && refundAmount > 0 && (
                        <EmailText style={{ marginBottom: '0' }}>
                            A refund of <strong>${refundAmount.toFixed(2)}</strong> will be processed according to our refund policy.
                        </EmailText>
                    )}
                </EmailCard>
            ) : remainingParticipants && remainingParticipants.length > 0 ? (
                <EmailCard backgroundColor="#dcfce7" borderColor="#22c55e">
                    <EmailHeading level={3}>Remaining Participants</EmailHeading>
                    <EmailText style={{ marginBottom: '15px' }}>
                        Your booking is still active with the following participants:
                    </EmailText>
                    {remainingParticipants.map((participant, index) => (
                        <EmailText key={index} style={{ marginBottom: '5px' }}>
                            • {participant.first_name} {participant.last_name}
                        </EmailText>
                    ))}
                </EmailCard>
            ) : null}

            {/* Refund Information */}
            {refundAmount && refundAmount > 0 && refundPercentage && refundPercentage > 0 && (
                <EmailCard backgroundColor="#f0f9ff" borderColor="#3b82f6">
                    <EmailHeading level={3}>Refund Information</EmailHeading>
                    <EmailText style={{ marginBottom: '15px' }}>
                        <strong>Refund Amount:</strong> ${refundAmount.toFixed(2)}
                        {refundPercentage && ` (${refundPercentage}%)`}
                    </EmailText>
                    <EmailText style={{ marginBottom: '15px' }}>
                        The refund will be processed back to your original payment method within 5-10 business days.
                    </EmailText>
                    <EmailText style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
                        <strong>Note:</strong> You will receive a separate confirmation email once the refund has been processed.
                    </EmailText>
                </EmailCard>
            )}

            {/* Organizer Contact */}
            <EmailCard backgroundColor="#e6fffa" borderColor="#0d9488">
                <EmailHeading level={3}>Organizer Contact</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    If you have any questions about this withdrawal, please contact the event organizer:
                </EmailText>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Organizer:</strong> {organizerName}
                </EmailText>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Email:</strong> {organizerEmail}
                </EmailText>
                {organizerPhone && (
                    <EmailText style={{ marginBottom: '0' }}>
                        <strong>Phone:</strong> {organizerPhone}
                    </EmailText>
                )}
            </EmailCard>

            {/* Action Button */}
            {dashboardUrl && !bookingCancelled && (
                <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                    <EmailButton
                        href={dashboardUrl}
                        backgroundColor="#3b82f6"
                    >
                        View My Bookings
                    </EmailButton>
                </EmailSection>
            )}

            <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
                    {bookingCancelled 
                        ? 'We apologize for any inconvenience caused. Thank you for your understanding.'
                        : 'Thank you for keeping your booking information up to date.'
                    }
                </EmailText>
            </EmailSection>
        </EmailLayout>
    )
}

export async function renderParticipantWithdrawalEmail(data: ParticipantWithdrawalEmailData) {
    const html = await render(React.createElement(ParticipantWithdrawalEmail, data))
    const text = await render(React.createElement(ParticipantWithdrawalEmail, data), { plainText: true })
    
    return { html, text }
}

export default ParticipantWithdrawalEmail
