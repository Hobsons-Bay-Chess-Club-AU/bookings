import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailHeading, EmailText, EmailSection, EmailCard, EmailButton } from '../layout/EmailLayout'

interface OrganizerParticipantWithdrawalEmailData {
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
    bookerName: string
    bookerEmail: string
    remainingParticipants?: Array<{
        first_name: string
        last_name: string
    }>
    managementUrl?: string
}

export function OrganizerParticipantWithdrawalEmail({
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
    bookerName,
    bookerEmail,
    remainingParticipants = [],
    managementUrl
}: OrganizerParticipantWithdrawalEmailData) {
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
                    ? `A booking for your event &quot;${eventName}&quot; has been cancelled due to participant withdrawal.`
                    : `A participant has been withdrawn from a booking for your event &quot;${eventName}&quot;.`
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

            {/* Booker Information */}
            <EmailCard backgroundColor="#f0f9ff" borderColor="#3b82f6">
                <EmailHeading level={3}>Booker Information</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Booker:</strong> {bookerName}
                </EmailText>
                <EmailText style={{ marginBottom: '0' }}>
                    <strong>Email:</strong> {bookerEmail}
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
                        {refundPercentage && refundPercentage > 0 && (
                            <EmailText style={{ marginBottom: '0' }}>
                                <strong>Refund Percentage:</strong> {refundPercentage}%
                            </EmailText>
                        )}
                    </>
                )}
            </EmailCard>

            {/* Booking Status */}
            {bookingCancelled ? (
                <EmailCard backgroundColor="#fee2e2" borderColor="#ef4444">
                    <EmailHeading level={3}>Booking Cancelled</EmailHeading>
                    <EmailText style={{ marginBottom: '15px' }}>
                        Since this was the only participant in the booking, the entire booking has been cancelled.
                    </EmailText>
                    <EmailText style={{ marginBottom: '0' }}>
                        The booker has been notified and {refundAmount && refundAmount > 0 ? 'a refund will be processed' : 'no refund is applicable'} according to your event&apos;s refund policy.
                    </EmailText>
                </EmailCard>
            ) : remainingParticipants && remainingParticipants.length > 0 ? (
                <EmailCard backgroundColor="#dcfce7" borderColor="#22c55e">
                    <EmailHeading level={3}>Remaining Participants</EmailHeading>
                    <EmailText style={{ marginBottom: '15px' }}>
                        The booking remains active with {remainingParticipants.length} participant{remainingParticipants.length !== 1 ? 's' : ''}:
                    </EmailText>
                    {remainingParticipants.map((participant, index) => (
                        <EmailText key={index} style={{ marginBottom: '5px' }}>
                            • {participant.first_name} {participant.last_name}
                        </EmailText>
                    ))}
                </EmailCard>
            ) : null}

            {/* Impact Summary */}
            <EmailCard backgroundColor="#f3e8ff" borderColor="#8b5cf6">
                <EmailHeading level={3}>Impact Summary</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Attendance Change:</strong> {bookingCancelled ? 'Booking cancelled' : `Reduced by 1 participant`}
                </EmailText>
                {refundAmount && refundAmount > 0 && (
                    <EmailText style={{ marginBottom: '10px' }}>
                        <strong>Revenue Impact:</strong> -${refundAmount.toFixed(2)}
                    </EmailText>
                )}
                <EmailText style={{ marginBottom: '0' }}>
                    <strong>Action Required:</strong> {bookingCancelled ? 'None - booking cancelled' : 'Update your attendee records if needed'}
                </EmailText>
            </EmailCard>

            {/* Management Actions */}
            {managementUrl && (
                <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                    <EmailButton
                        href={managementUrl}
                        backgroundColor="#8b5cf6"
                    >
                        Manage Event Bookings
                    </EmailButton>
                </EmailSection>
            )}

            <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
                    This is an automated notification to keep you informed of changes to your event bookings.
                </EmailText>
            </EmailSection>
        </EmailLayout>
    )
}

export async function renderOrganizerParticipantWithdrawalEmail(data: OrganizerParticipantWithdrawalEmailData) {
    const html = await render(React.createElement(OrganizerParticipantWithdrawalEmail, data))
    const text = await render(React.createElement(OrganizerParticipantWithdrawalEmail, data), { plainText: true })
    
    return { html, text }
}

export default OrganizerParticipantWithdrawalEmail
