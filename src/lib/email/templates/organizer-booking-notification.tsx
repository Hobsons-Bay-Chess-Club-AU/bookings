import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface OrganizerBookingNotificationEmailData {
  organizerName: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  bookingId: string
  participantCount: number
  totalAmount: number
  customerName: string
  customerEmail: string
  participants?: Array<{
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
  }>
}

function OrganizerBookingNotificationEmail({
  organizerName,
  eventTitle,
  eventDate,
  eventLocation,
  bookingId,
  participantCount,
  totalAmount,
  customerName,
  customerEmail,
  participants
}: OrganizerBookingNotificationEmailData) {
  return (
    <EmailLayout
      title="New Booking Notification"
      subtitle="Someone has booked your event!"
      headerColor="#059669"
    >
      <EmailHeading level={2}>Hi {organizerName},</EmailHeading>

      <EmailText>
        Great news! You have received a new booking for your event.
      </EmailText>

      <EmailCard backgroundColor="#f0fdf4" borderColor="#059669">
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
        <EmailHeading level={3}>Booking Information</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Booking ID:</strong> {bookingId}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Participants:</strong> {participantCount}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Total Amount:</strong> ${totalAmount.toFixed(2)} AUD
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
                <strong>Participant {index + 1}:</strong> {participant.first_name} {participant.last_name}
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
          href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/${eventTitle.toLowerCase().replace(/\s+/g, '-')}/bookings`}
          backgroundColor="#3b82f6"
        >
          View All Bookings
        </EmailButton>
      </EmailSection>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          You can manage this booking and view all bookings for this event in your organizer dashboard.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderOrganizerBookingNotificationEmail(data: OrganizerBookingNotificationEmailData) {
  const html = await render(React.createElement(OrganizerBookingNotificationEmail, data))
  const text = await render(React.createElement(OrganizerBookingNotificationEmail, data), { plainText: true })
  
  return { html, text }
}

export default OrganizerBookingNotificationEmail 