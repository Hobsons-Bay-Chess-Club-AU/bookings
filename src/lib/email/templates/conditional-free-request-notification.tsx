import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface ConditionalFreeRequestNotificationEmailData {
  organizerName: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  bookingId: string
  participantCount: number
  customerName: string
  customerEmail: string
  participants?: Array<{
    first_name: string
    middle_name?: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
  }>
  eventId: string
}

function ConditionalFreeRequestNotificationEmail({
  organizerName,
  eventTitle,
  eventDate,
  eventLocation,
  bookingId,
  participantCount,
  customerName,
  customerEmail,
  participants,
  eventId
}: ConditionalFreeRequestNotificationEmailData) {
  return (
    <EmailLayout
      title="Conditional Free Entry Request"
      subtitle="Someone has requested conditional free entry for your event"
      headerColor="#f59e0b"
    >
      <EmailHeading level={2}>Hi {organizerName},</EmailHeading>

      <EmailText>
        You have received a conditional free entry request for your event. This requires your approval before the booking can be confirmed.
      </EmailText>

      <EmailCard backgroundColor="#fffbeb" borderColor="#f59e0b">
        <EmailHeading level={3}>Event Details</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Event:</strong> {eventTitle}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Date:</strong> {new Date(eventDate).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Location:</strong> {eventLocation}
        </EmailText>
      </EmailCard>

      <EmailCard backgroundColor="#eff6ff" borderColor="#3b82f6">
        <EmailHeading level={3}>Request Information</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Booking ID:</strong> {bookingId}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Participants:</strong> {participantCount}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Entry Type:</strong> Conditional Free Entry (Requires Approval)
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Customer:</strong> {customerName} ({customerEmail})
        </EmailText>
      </EmailCard>

      {participants && participants.length > 0 && (
        <EmailCard backgroundColor="#f7fafc" borderColor="#6b7280">
          <EmailHeading level={3}>Participant Details</EmailHeading>
          {participants.map((participant, index) => (
            <div key={index} style={{ marginBottom: '15px' }}>
              <EmailText style={{ marginBottom: '10px' }}>
                <strong>Participant {index + 1}:</strong> {participant.middle_name ? `${participant.first_name} ${participant.middle_name} ${participant.last_name}` : `${participant.first_name} ${participant.last_name}`}
              </EmailText>
              {participant.date_of_birth && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Date of Birth:</strong> {participant.date_of_birth}
                </EmailText>
              )}
              {participant.contact_email && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Contact Email:</strong> {participant.contact_email}
                </EmailText>
              )}
              {participant.contact_phone && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Contact Phone:</strong> {participant.contact_phone}
                </EmailText>
              )}
              {participant.custom_data && Object.entries(participant.custom_data).map(([key, value]) => (
                <EmailText key={key} style={{ marginBottom: '10px' }}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                </EmailText>
              ))}
            </div>
          ))}
        </EmailCard>
      )}

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailButton
          href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/${eventId}/bookings/${bookingId}`}
          backgroundColor="#f59e0b"
        >
          Review & Approve Request
        </EmailButton>
      </EmailSection>

      <EmailSection style={{ textAlign: 'center', marginTop: '20px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          Click the button above to review the request and approve or reject the conditional free entry.
        </EmailText>
      </EmailSection>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          You can also manage all bookings for this event in your organizer dashboard.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderConditionalFreeRequestNotificationEmail(data: ConditionalFreeRequestNotificationEmailData) {
  const html = await render(React.createElement(ConditionalFreeRequestNotificationEmail, data))
  const text = await render(React.createElement(ConditionalFreeRequestNotificationEmail, data), { plainText: true })
  
  return { html, text }
}

export default ConditionalFreeRequestNotificationEmail
