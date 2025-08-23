import React from 'react'
import { render } from '@react-email/render'
import { renderMarkdownForEmail } from '../../utils/markdown'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface WhitelistReleasedEmailData {
  bookingId: string
  eventName: string
  eventDate: string
  eventLocation: string
  eventEndDate?: string
  eventTimezone?: string
  participantCount: number
  totalAmount: number
  organizerName: string
  organizerEmail: string
  eventDescription?: string
  organizerPhone?: string
  sectionName?: string
  participants?: Array<{
    first_name: string
    middle_name?: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
  }>
  dashboardUrl: string
  completePaymentUrl: string
}

function WhitelistReleasedEmail({
  bookingId,
  eventName,
  eventDate,
  eventLocation,
  eventEndDate,
  eventTimezone,
  participantCount,
  totalAmount,
  organizerName,
  organizerEmail,
  organizerPhone,
  eventDescription,
  sectionName,
  participants,
  dashboardUrl,
  completePaymentUrl
}: WhitelistReleasedEmailData) {
  const formattedStart = new Date(eventDate)
  const formattedEnd = eventEndDate ? new Date(eventEndDate) : undefined
  
  return (
    <EmailLayout
      title="Your whitelisted booking is now available for payment!"
      subtitle="Your booking is now available for payment!"
      headerColor="#059669"
    >
      <EmailHeading level={2}>Your booking is now available! 🎉</EmailHeading>

      <EmailCard backgroundColor="#d1fae5" borderColor="#059669">
        <EmailHeading level={3}>Whitelist Released</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          Great news! Your whitelisted booking has been released and is now available for payment. 
          You can complete your booking to secure your spot at this event.
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Booking ID:</strong> {bookingId}
        </EmailText>
      </EmailCard>

      <EmailCard backgroundColor="#f0fdf4" borderColor="#059669">
        <EmailHeading level={3}>Event Details</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Event:</strong> {eventName}
          {sectionName && ` - ${sectionName}`}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Starts:</strong> {formattedStart.toLocaleDateString('en-AU', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
          {eventTimezone && ` (${eventTimezone})`}
        </EmailText>
        {formattedEnd && (
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Ends:</strong> {formattedEnd.toLocaleDateString('en-AU', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
            {eventTimezone && ` (${eventTimezone})`}
          </EmailText>
        )}
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Location:</strong> {eventLocation}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Participants:</strong> {participantCount}
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Total Amount:</strong> ${totalAmount.toFixed(2)} AUD
        </EmailText>
      </EmailCard>

      {eventDescription && (
        <EmailSection>
          <EmailHeading level={3}>Event Description</EmailHeading>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(eventDescription) }} />
        </EmailSection>
      )}

      {participants && participants.length > 0 && (
        <EmailSection>
          <EmailHeading level={3}>Participant Information</EmailHeading>
          {participants.map((participant, index) => (
            <EmailCard key={index} backgroundColor="#f7fafc" borderColor="#3b82f6">
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
            </EmailCard>
          ))}
        </EmailSection>
      )}

      <EmailCard backgroundColor="#f0f9ff" borderColor="#38bdf8">
        <EmailHeading level={3}>Organizer Contact</EmailHeading>
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

      <EmailCard backgroundColor="#d1fae5" borderColor="#059669">
        <EmailHeading level={3}>Complete Your Booking</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          Your spot is reserved and ready for payment. You can either go to your dashboard to manage your bookings or complete payment directly:
        </EmailText>
        <EmailSection style={{ textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <EmailButton
            href={dashboardUrl}
            backgroundColor="#3b82f6"
          >
            Go to Dashboard
          </EmailButton>
          <EmailButton
            href={completePaymentUrl}
            backgroundColor="#059669"
          >
            Complete Payment
          </EmailButton>
        </EmailSection>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginTop: '15px', marginBottom: '0' }}>
          <strong>Important:</strong> Please complete payment within the specified timeframe to maintain your reservation. If you have any questions, please contact the organizer.
        </EmailText>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          Thank you for your patience! We look forward to seeing you at the event.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderWhitelistReleasedEmail(data: WhitelistReleasedEmailData) {
  const html = await render(React.createElement(WhitelistReleasedEmail, data))
  const text = await render(React.createElement(WhitelistReleasedEmail, data), { plainText: true })
  
  return { html, text }
}

export default WhitelistReleasedEmail
