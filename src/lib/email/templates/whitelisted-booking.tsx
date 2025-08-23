import React from 'react'
import { render } from '@react-email/render'
import { renderMarkdownForEmail } from '../../utils/markdown'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface WhitelistedBookingEmailData {
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
  participants?: Array<{
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
    section?: {
      id: string
      title: string
      start_date: string
      end_date?: string
      description?: string
    }
  }>
  dashboardUrl: string
  isMultiSectionEvent?: boolean
}

function WhitelistedBookingEmail({
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
  participants,
  dashboardUrl,
  isMultiSectionEvent
}: WhitelistedBookingEmailData) {
  const formattedStart = new Date(eventDate)
  const formattedEnd = eventEndDate ? new Date(eventEndDate) : undefined
  
  return (
    <EmailLayout
      title="Whitelisted Booking"
      subtitle="Your booking has been reserved on the whitelist!"
      headerColor="#f59e0b"
    >
      <EmailHeading level={2}>Your booking has been reserved! ⏱️</EmailHeading>

      <EmailCard backgroundColor="#fef3c7" borderColor="#f59e0b">
        <EmailHeading level={3}>Whitelist Status</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          Great news! Your booking has been successfully added to the whitelist for this event. 
          This means we&apos;ve reserved your spot while you complete the payment process.
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Booking ID:</strong> {bookingId}
        </EmailText>
      </EmailCard>

      <EmailCard backgroundColor="#f0fdf4" borderColor="#059669">
        <EmailHeading level={3}>Event Details</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Event:</strong> {eventName}
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

      <EmailCard backgroundColor="#e0f2fe" borderColor="#0284c7">
        <EmailHeading level={3}>How the Whitelist Process Works</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          Here&apos;s what happens next:
        </EmailText>
        <div style={{ marginBottom: '15px' }}>
          <EmailText style={{ marginBottom: '8px' }}>
            <strong>1. Spot Reserved:</strong> Your booking is now reserved with one spot available.
          </EmailText>
          <EmailText style={{ marginBottom: '8px' }}>
            <strong>2. Payment Required:</strong> You&apos;ll receive a separate email with payment instructions to secure your booking.
          </EmailText>
          <EmailText style={{ marginBottom: '8px' }}>
            <strong>3. Confirmation:</strong> Once payment is completed, your booking will be confirmed and you&apos;ll receive your tickets.
          </EmailText>
          <EmailText style={{ marginBottom: '0' }}>
            <strong>4. Time Limit:</strong> Please complete payment within the timeframe specified in the payment email to maintain your reservation.
          </EmailText>
        </div>
      </EmailCard>

      {eventDescription && (
        <EmailSection>
          <EmailHeading level={3}>Event Description</EmailHeading>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(eventDescription) }} />
        </EmailSection>
      )}

      {participants && participants.length > 0 && (
        <EmailSection>
          <EmailHeading level={3}>
            {isMultiSectionEvent ? 'Participant & Section Information' : 'Participant Information'}
          </EmailHeading>
          {participants.map((participant, index) => (
            <EmailCard key={index} backgroundColor="#f7fafc" borderColor="#3b82f6">
              <EmailText style={{ marginBottom: '10px' }}>
                <strong>Participant {index + 1}:</strong> {participant.first_name} {participant.last_name}
                {participant.section && (
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>
                    {' '}- {participant.section.title}
                  </span>
                )}
              </EmailText>
              
              {participant.section && (
                <>
                  <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Section:</strong> {participant.section.title}
                  </EmailText>
                  <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Section Schedule:</strong> {new Date(participant.section.start_date).toLocaleString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {participant.section.end_date && ` - ${new Date(participant.section.end_date).toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  </EmailText>
                  {participant.section.description && (
                    <EmailText style={{ marginBottom: '10px' }}>
                      <strong>Section Description:</strong> {participant.section.description}
                    </EmailText>
                  )}
                </>
              )}
              
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

      <EmailCard backgroundColor="#fef3c7" borderColor="#f59e0b">
        <EmailHeading level={3}>Next Steps</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          To complete your booking and secure your spot:
        </EmailText>
        <EmailSection style={{ textAlign: 'center' }}>
          <EmailButton
            href={dashboardUrl}
            backgroundColor="#f59e0b"
          >
            View My Bookings
          </EmailButton>
        </EmailSection>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginTop: '15px', marginBottom: '0' }}>
          <strong>Important:</strong> Keep an eye on your email for payment instructions. Your spot is reserved but not confirmed until payment is completed.
        </EmailText>
      </EmailCard>

      <EmailCard backgroundColor="#f0f9ff" borderColor="#0ea5e9">
        <EmailHeading level={3}>Terms & Conditions</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          A comprehensive copy of all terms & conditions applicable to your booking has been attached to this email as a PDF document.
        </EmailText>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
          <strong>Important:</strong> This PDF includes both event-specific terms and our general site-wide terms & conditions. Your booking is subject to all terms outlined in this document.
        </EmailText>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
          <strong>Please note:</strong> Keep this document for your records as it contains important information about your rights, responsibilities, and any applicable refund policies.
        </EmailText>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          Thank you for your interest! We look forward to seeing you at the event once payment is completed.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderWhitelistedBookingEmail(data: WhitelistedBookingEmailData) {
  const html = await render(React.createElement(WhitelistedBookingEmail, data))
  const text = await render(React.createElement(WhitelistedBookingEmail, data), { plainText: true })
  
  return { html, text }
}

export default WhitelistedBookingEmail
