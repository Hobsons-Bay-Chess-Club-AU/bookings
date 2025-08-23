import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailHeading, EmailText, EmailSection, EmailCard, EmailButton } from '../layout/EmailLayout'

interface ParticipantDataChangeEmailData {
    bookingId: string
    eventName: string
    eventDate: string
    eventLocation: string
    participantName: string
    changedFields: string[]
    organizerName: string
    organizerEmail: string
    dashboardUrl: string
}

export function ParticipantDataChangeEmail({
    bookingId,
    eventName,
    eventDate,
    eventLocation,
    participantName,
    changedFields,
    organizerName,
    organizerEmail,
    dashboardUrl
}: ParticipantDataChangeEmailData) {
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
                Participant Details Updated
            </EmailHeading>
            
            <EmailText style={{ marginBottom: '20px' }}>
                The event organizer has updated some details for a participant in your booking for &quot;{eventName}&quot;.
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

            {/* Participant Information */}
            <EmailCard backgroundColor="#f0f9ff" borderColor="#3b82f6">
                <EmailHeading level={3}>Participant Information</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Participant:</strong> {participantName}
                </EmailText>
                <EmailText style={{ marginBottom: '0' }}>
                    <strong>Updated Fields:</strong> {changedFields.join(', ')}
                </EmailText>
            </EmailCard>

            {/* Organizer Information */}
            <EmailCard backgroundColor="#fef3c7" borderColor="#f59e0b">
                <EmailHeading level={3}>Organizer Contact</EmailHeading>
                <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Organizer:</strong> {organizerName}
                </EmailText>
                {organizerEmail && (
                    <EmailText style={{ marginBottom: '0' }}>
                        <strong>Email:</strong> {organizerEmail}
                    </EmailText>
                )}
            </EmailCard>

            {/* Action Required */}
            <EmailCard backgroundColor="#dcfce7" borderColor="#22c55e">
                <EmailHeading level={3}>What This Means</EmailHeading>
                <EmailText style={{ marginBottom: '15px' }}>
                    The event organizer has updated participant details for your booking. These changes have been made to ensure accurate information for the event.
                </EmailText>
                <EmailText style={{ marginBottom: '0' }}>
                    <strong>No action required from you</strong> - this is just an informational update. If you have any questions about these changes, please contact the event organizer.
                </EmailText>
            </EmailCard>

            {/* Dashboard Link */}
            <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                <EmailButton
                    href={dashboardUrl}
                    backgroundColor="#8b5cf6"
                >
                    View Booking Details
                </EmailButton>
            </EmailSection>

            <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
                <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
                    This is an automated notification to keep you informed of changes to your booking.
                </EmailText>
            </EmailSection>
        </EmailLayout>
    )
}

export async function renderParticipantDataChangeEmail(data: ParticipantDataChangeEmailData) {
    const html = await render(React.createElement(ParticipantDataChangeEmail, data))
    const text = await render(React.createElement(ParticipantDataChangeEmail, data), { plainText: true })
    
    return { html, text }
}

export default ParticipantDataChangeEmail
